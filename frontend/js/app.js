/**
 * AeroTwin SPA Main Controller & Application Orchestrator
 * Coordinates WebSocket real-time telemetry stream, 7-tab SPA routing,
 * user role switching, fleet selector, and view dispatching.
 */

class AeroTwinApp {
  constructor() {
    this.ws = null;
    this.activeTab = 'live';
    this.activeUav = 'UAV-03';
    this.userRole = 'Propulsion Engineer';
    this.connectionMode = 'Live'; // 'Live', 'Replay', 'Scenario', 'Disconnected'

    // Initialize View Controllers
    this.liveView = new LiveView();
    this.healthView = new HealthView();
    this.alertsView = new AlertsView();
    this.replayView = new ReplayView(this);
    this.scenariosView = new ScenariosView();
    this.missionsView = new MissionsView();
    this.settingsView = new SettingsView();
    this.engine3DView = new Engine3DView(this);
    this.advisoryView = typeof AdvisoryView !== 'undefined' ? new AdvisoryView() : null;
    this.assuranceManager = window.assuranceManager || null;
    this.assuranceView = window.assuranceView || null;

    // Attach to global window for onclick helpers
    window.liveView = this.liveView;
    window.healthView = this.healthView;
    window.alertsView = this.alertsView;
    window.replayView = this.replayView;
    window.scenariosView = this.scenariosView;
    window.missionsView = this.missionsView;
    window.settingsView = this.settingsView;
    window.engine3DView = this.engine3DView;
    window.advisoryView = this.advisoryView;
    window.assuranceManager = this.assuranceManager;
    window.assuranceView = this.assuranceView;

    if (this.assuranceManager) {
      this.assuranceManager.setRole(this.userRole);
    }

    this.fleet = [];

    this.initNavigation();
    this.initHeaderControls();
    this.initFleetControls();
    this.fetchFleet();
    this.initWebSocket();

    // Check URL query param or hash to auto-open tabs like #engine3d
    const hash = window.location.hash.replace('#', '');
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    const targetTab = urlTab || hash;
    if (targetTab && targetTab !== 'live') {
      setTimeout(() => this.switchTab(targetTab), 150);
    }
    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '');
      if (h) this.switchTab(h);
    });

    // Ensure advisory widget visibility matches current tab (widget loads after app.js)
    setTimeout(() => this.updateAdvisoryWidgetVisibility(), 200);
  }

  updateAdvisoryWidgetVisibility() {
    const advisoryWidget = document.getElementById('ai-advisory-widget-root');
    if (advisoryWidget) {
      advisoryWidget.style.display = (this.activeTab === 'live') ? 'block' : 'none';
      if (this.activeTab !== 'live') {
        const panel = document.getElementById('ai-advisory-panel');
        if (panel) panel.style.display = 'none';
      }
    }
  }

  initNavigation() {
    const navButtons = document.querySelectorAll('.sidebar-nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });
  }

  switchTab(tabName) {
    const prevTab = this.activeTab;
    this.activeTab = tabName;

    // Deactivate 3D rendering loop if leaving engine3d tab
    if (prevTab === 'engine3d' && tabName !== 'engine3d') {
      this.engine3DView?.onDeactivate();
    }

    // Update active nav button
    document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update tab content visibility
    document.querySelectorAll('.tab-view-container').forEach(view => {
      if (view.id === `view-${tabName}`) {
        view.style.display = 'block';
      } else {
        view.style.display = 'none';
      }
    });

    // Ensure AI Advisory popup widget on bottom right is ONLY visible in 'live' tab
    this.updateAdvisoryWidgetVisibility();

    // Update connection mode indicator in header
    if (tabName === 'replay') {
      this.setMode('Replay', 'var(--color-warning)', `Replaying Mission ${this.replayView.missionSelect ? this.replayView.missionSelect.value : 'M-2025-07-14'}`);
      this.replayView.loadDemoData();
    } else if (tabName === 'scenarios') {
      this.setMode('Scenario', 'var(--color-info)', 'Physics-informed what-if parameter envelope');
    } else if (tabName === 'engine3d') {
      this.setMode('Sim 3D', 'var(--color-purple)', 'Synthetic Digital Twin 3D Engine Simulation');
      this.engine3DView.onActivate();
    } else if (tabName === 'assurance') {
      this.setMode('Assurance', '#7c3aed', 'Defence-Grade Integration & Assurance Layer');
      this.assuranceView?.renderAll();
    } else if (tabName === 'advisory') {
      this.setMode('Live', 'var(--color-nominal)', `AI Advisory & Health Decision Support Center - ${this.activeUav}`);
    } else {
      this.setMode('Live', 'var(--color-nominal)', `Receiving real-time telemetry from ${this.activeUav}`);
    }

    // Trigger chart resizes for freshly displayed container
    setTimeout(() => {
      if (tabName === 'live') {
        this.liveView.powerThermalChart?.resize();
      } else if (tabName === 'health') {
        this.healthView.rulChart?.resize();
      } else if (tabName === 'alerts') {
        this.alertsView.explainChart?.resize();
      } else if (tabName === 'replay') {
        this.replayView.replayChart?.resize();
      } else if (tabName === 'scenarios') {
        this.scenariosView.comparisonChart?.resize();
      } else if (tabName === 'missions') {
        this.missionsView.detailHealthChart?.resize();
      } else if (tabName === 'engine3d') {
        this.engine3DView.onResize();
      }
    }, 60);
  }

  setMode(mode, dotColor, tooltip) {
    this.connectionMode = mode;
    const modeBadge = document.getElementById('global-mode-badge');
    const modeDot = document.getElementById('global-mode-dot');
    if (modeBadge) {
      modeBadge.innerText = mode.toUpperCase();
      modeBadge.title = tooltip;
    }
    if (modeDot) {
      modeDot.style.backgroundColor = dotColor;
    }
  }

  initHeaderControls() {
    // Role selector
    const roleSelect = document.getElementById('global-role-select');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        this.userRole = e.target.value;
        const roleIndicator = document.getElementById('current-role-label');
        if (roleIndicator) roleIndicator.innerText = this.userRole;
        if (this.assuranceManager) {
          this.assuranceManager.setRole(this.userRole);
        }
      });
    }

    // Fleet selector
    const fleetSelect = document.getElementById('global-fleet-select');
    if (fleetSelect) {
      fleetSelect.addEventListener('change', async (e) => {
        const selectedId = e.target.value;
        await this.selectUavOnBackend(selectedId);
      });
    }

    // Header Add UAV button
    const addUavBtn = document.getElementById('btn-header-add-uav');
    if (addUavBtn) {
      addUavBtn.addEventListener('click', () => {
        this.openAddUavModal();
      });
    }

    // Settings shortcut icon
    const settingsShortcut = document.getElementById('btn-header-settings');
    if (settingsShortcut) {
      settingsShortcut.addEventListener('click', () => {
        this.switchTab('settings');
      });
    }
  }

  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/telemetry`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Telemetry link connected to Digital Twin WebSocket.');
      if (this.connectionMode === 'Live') {
        this.setMode('Live', 'var(--color-nominal)', `Receiving real-time telemetry from ${this.activeUav}`);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data);
        this.dispatchPacket(packet);
      } catch (e) {
        console.error('Error parsing telemetry frame:', e);
      }
    };

    this.ws.onclose = () => {
      console.warn('WebSocket connection lost. Reconnecting in 2.5s...');
      this.setMode('Disconnected', 'var(--color-critical)', 'Telemetry stream offline');
      setTimeout(() => this.initWebSocket(), 2500);
    };

    this.initPollingFallback();
  }

  initPollingFallback() {
    this.pollTelemetry();

    setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        this.pollTelemetry();
      }
    }, 200);
  }

  async pollTelemetry() {
    if (this.connectionMode !== 'Live') return;
    try {
      const res = await fetch('/api/telemetry/current');
      if (res.ok) {
        const packet = await res.json();
        this.dispatchPacket(packet);
        if (this.connectionMode === 'Live' && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
          this.setMode('Live', 'var(--color-nominal)', `Receiving real-time telemetry from ${this.activeUav}`);
        }
      }
    } catch (e) {}
  }

  dispatchPacket(packet) {
    if (this.connectionMode !== 'Live') return; // Do not overwrite when inspecting replay

    // Enrich packet with Assurance Layer data quality & normalized frame
    if (this.assuranceManager) {
      const normFrame = this.assuranceManager.getNormalizedFrame(packet.sensor);
      packet.normalizedFrame = normFrame;
      packet.dataQuality = this.assuranceManager.qualityMetrics;
      const qBadge = document.getElementById('badge-quality-score');
      if (qBadge) qBadge.innerText = this.assuranceManager.qualityMetrics.dataConfidenceScore;
    }

    // 1. Dispatch to Live View
    if (this.liveView) {
      this.liveView.update(packet);
    }

    // 2. Dispatch to Health View
    if (this.healthView) {
      this.healthView.update(packet);
    }

    // 3. Dispatch to Advisory View
    if (this.advisoryView) {
      this.advisoryView.update(packet);
    }
  }

  async fetchFleet() {
    try {
      const res = await fetch('/api/fleet');
      const data = await res.json();
      this.fleet = data.fleet || [];
      if (data.active_uav_id) {
        this.activeUav = data.active_uav_id;
      }
      this.populateFleetDropdown();
      if (this.settingsView && typeof this.settingsView.renderFleetTable === 'function') {
        this.settingsView.fleet = this.fleet;
        this.settingsView.activeUavId = this.activeUav;
        this.settingsView.renderFleetTable();
      }
    } catch (e) {
      console.error('Error fetching fleet:', e);
    }
  }

  populateFleetDropdown() {
    const fleetSelect = document.getElementById('global-fleet-select');
    if (!fleetSelect || !this.fleet || this.fleet.length === 0) return;

    fleetSelect.innerHTML = this.fleet.map(u => {
      const isSelected = u.id === this.activeUav;
      const label = u.id === this.activeUav ? `${u.id} [Active]` : (u.callsign ? `${u.id} (${u.callsign})` : u.id);
      return `<option value="${u.id}" ${isSelected ? 'selected' : ''}>${label}</option>`;
    }).join('');

    // Also update mode pill
    if (this.connectionMode === 'Live') {
      this.setMode('Live', 'var(--color-nominal)', `Receiving real-time telemetry from ${this.activeUav}`);
    }
  }

  async selectUavOnBackend(uavId) {
    this.activeUav = uavId;
    try {
      await fetch('/api/fleet/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uav_id: uavId })
      });
    } catch (e) {
      console.error('Error selecting UAV on backend:', e);
    }
    this.populateFleetDropdown();
    if (this.settingsView && typeof this.settingsView.renderFleetTable === 'function') {
      this.settingsView.activeUavId = this.activeUav;
      this.settingsView.renderFleetTable();
    }
    this.showToast(`Switched active Digital Twin monitoring to ${uavId}`);
  }

  setActiveUav(uavId) {
    this.activeUav = uavId;
    this.populateFleetDropdown();
    if (this.settingsView && typeof this.settingsView.renderFleetTable === 'function') {
      this.settingsView.activeUavId = this.activeUav;
      this.settingsView.renderFleetTable();
    }
  }

  openAddUavModal() {
    const modal = document.getElementById('modal-add-uav');
    if (modal) {
      modal.style.display = 'flex';
      const inputId = document.getElementById('uav-input-id');
      if (inputId) {
        inputId.focus();
      }
    }
  }

  closeAddUavModal() {
    const modal = document.getElementById('modal-add-uav');
    if (modal) {
      modal.style.display = 'none';
      const form = document.getElementById('form-add-uav');
      if (form) form.reset();
    }
  }

  initFleetControls() {
    // Close button
    const closeBtn = document.getElementById('btn-close-uav-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeAddUavModal());
    }

    // Cancel button
    const cancelBtn = document.getElementById('btn-cancel-uav-modal');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeAddUavModal());
    }

    // Click outside modal dialog to close
    const modal = document.getElementById('modal-add-uav');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeAddUavModal();
      });
    }

    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const m = document.getElementById('modal-add-uav');
        if (m && m.style.display !== 'none') {
          this.closeAddUavModal();
        }
      }
    });

    // Preset buttons
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        this.applyUavPreset(preset);
      });
    });

    // Form submission
    const form = document.getElementById('form-add-uav');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCommissionUav(form);
      });
    }
  }

  applyUavPreset(preset) {
    const idEl = document.getElementById('uav-input-id');
    const nameEl = document.getElementById('uav-input-name');
    const tailEl = document.getElementById('uav-input-tail');
    const airframeEl = document.getElementById('uav-input-airframe');
    const engineEl = document.getElementById('uav-input-engine');
    const hoursEl = document.getElementById('uav-input-hours');
    const statusEl = document.getElementById('uav-input-status');
    const locationEl = document.getElementById('uav-input-location');
    const notesEl = document.getElementById('uav-input-notes');

    if (preset === 'uav5') {
      if (idEl) idEl.value = 'UAV-05';
      if (nameEl) nameEl.value = 'UAV #05 [Valkyrie-V]';
      if (tailEl) tailEl.value = 'AF-9025';
      if (airframeEl) airframeEl.value = 'AeroTwin MALE Mk II';
      if (engineEl) engineEl.value = 'Rotax 915 iS (141 hp)';
      if (hoursEl) hoursEl.value = '0.0';
      if (statusEl) statusEl.value = 'Active';
      if (locationEl) locationEl.value = 'Forward Operating Base Alpha';
      if (notesEl) notesEl.value = 'Newly commissioned long-range reconnaissance twin node.';
    } else if (preset === 'reaper') {
      if (idEl) idEl.value = 'UAV-REAPER-01';
      if (nameEl) nameEl.value = 'MQ-9 Reaper Node Alpha';
      if (tailEl) tailEl.value = 'AF-9101';
      if (airframeEl) airframeEl.value = 'MQ-9 Reaper Class';
      if (engineEl) engineEl.value = 'Rotax 916 iS (160 hp)';
      if (hoursEl) hoursEl.value = '38.5';
      if (statusEl) statusEl.value = 'Active';
      if (locationEl) locationEl.value = 'Al-Dhafra Air Base Terminal';
      if (notesEl) notesEl.value = 'Heavy endurance ISR configuration with satellite uplink.';
    } else if (preset === 'tb2') {
      if (idEl) idEl.value = 'UAV-TB2-01';
      if (nameEl) nameEl.value = 'Bayraktar TB2 Node Alpha';
      if (tailEl) tailEl.value = 'AF-9201';
      if (airframeEl) airframeEl.value = 'Bayraktar TB2 Class';
      if (engineEl) engineEl.value = 'Rotax 915 iS (141 hp)';
      if (hoursEl) hoursEl.value = '15.2';
      if (statusEl) statusEl.value = 'Active';
      if (locationEl) locationEl.value = 'Forward Station South';
      if (notesEl) notesEl.value = 'Tactical medium-altitude long-endurance payload.';
    } else if (preset === 'highalt') {
      if (idEl) idEl.value = 'UAV-06-HA';
      if (nameEl) nameEl.value = 'UAV #06 High-Ceiling';
      if (tailEl) tailEl.value = 'AF-9026';
      if (airframeEl) airframeEl.value = 'AeroTwin MALE Mk III';
      if (engineEl) engineEl.value = 'Rotax 916 iS (160 hp)';
      if (hoursEl) hoursEl.value = '0.0';
      if (statusEl) statusEl.value = 'Standby';
      if (locationEl) locationEl.value = 'Base Alpha Ready Hangar';
      if (notesEl) notesEl.value = 'Sub-zero high-altitude proving sortie readiness.';
    }
  }

  async handleCommissionUav(form) {
    const submitBtn = document.getElementById('btn-submit-uav');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'COMMISSIONING...';
    }

    const payload = {
      id: document.getElementById('uav-input-id')?.value.trim().toUpperCase(),
      name: document.getElementById('uav-input-name')?.value.trim() || undefined,
      callsign: document.getElementById('uav-input-id')?.value.trim().toUpperCase(),
      tail_number: document.getElementById('uav-input-tail')?.value.trim() || undefined,
      airframe: document.getElementById('uav-input-airframe')?.value || 'AeroTwin MALE Mk II',
      engine_model: document.getElementById('uav-input-engine')?.value || 'Rotax 915 iS (141 hp)',
      flight_hours: parseFloat(document.getElementById('uav-input-hours')?.value || '0.0'),
      status: document.getElementById('uav-input-status')?.value || 'Standby',
      location: document.getElementById('uav-input-location')?.value.trim() || 'Forward Operating Base Alpha',
      notes: document.getElementById('uav-input-notes')?.value.trim() || ''
    };

    try {
      const res = await fetch('/api/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.detail || 'Failed to commission UAV airframe.');
        return;
      }

      this.showToast(`Airframe '${payload.id}' successfully commissioned into Digital Twin fleet!`);
      this.closeAddUavModal();
      await this.fetchFleet();

      if (payload.status === 'Active') {
        this.setActiveUav(payload.id);
      }

      if (this.settingsView && typeof this.settingsView.fetchFleet === 'function') {
        await this.settingsView.fetchFleet();
      }
    } catch (e) {
      console.error('Error commissioning UAV:', e);
      alert('Network error while commissioning UAV.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = '⚡ COMMISSION AIRFRAME';
      }
    }
  }

  showToast(message) {
    const existing = document.querySelector('.tactical-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'tactical-toast';
    toast.innerHTML = `<span style="color:#10b981; font-weight:bold; font-size:14px;">✓</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Global Fullscreen / Kiosk Mode helper
window.toggleFullscreen = function() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn(`Fullscreen request error: ${err.message}`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

// Start app once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AeroTwinApp();
  window.open3D = () => window.app ? window.app.switchTab('engine3d') : null;
});
