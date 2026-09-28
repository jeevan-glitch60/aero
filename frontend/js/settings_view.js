/**
 * Settings Tab Controller: System Configuration & Threshold Overrides
 * Features: Operational limit tables (warning/critical), telemetry retention,
 * user profile, system version info, and dark/light theme switcher.
 */

class SettingsView {
  constructor() {
    this.thresholds = {};
    this.fleet = [];
    this.activeUavId = 'UAV-03';
    this.isSupervisorUnlocked = false;
    this.fetchThresholds();
    this.fetchFleet();
    this.initEvents();
  }

  async fetchFleet() {
    try {
      const res = await fetch('/api/fleet');
      const data = await res.json();
      this.fleet = data.fleet || [];
      this.activeUavId = data.active_uav_id || 'UAV-03';
      this.summary = data.summary || {};
      this.renderFleetTable();
    } catch (e) {
      console.error('Error fetching fleet registry:', e);
    }
  }

  renderFleetTable() {
    const statsStrip = document.getElementById('fleet-stats-strip');
    if (statsStrip && this.fleet) {
      const total = this.fleet.length;
      const active = this.fleet.filter(u => u.status === 'Active').length;
      const standby = this.fleet.filter(u => u.status === 'Standby').length;
      const maint = this.fleet.filter(u => u.status === 'Maintenance').length;
      const avgH = total > 0 ? (this.fleet.reduce((acc, u) => acc + (u.health_score || 90), 0) / total).toFixed(1) : '100.0';

      statsStrip.innerHTML = `
        <div class="fleet-stat-badge"><span>TOTAL AIRFRAMES:</span> <span class="num">${total}</span></div>
        <div class="fleet-stat-badge"><span>ACTIVE TWIN:</span> <span class="num" style="color:var(--color-nominal);">${active}</span></div>
        <div class="fleet-stat-badge"><span>STANDBY:</span> <span class="num" style="color:var(--color-info);">${standby}</span></div>
        <div class="fleet-stat-badge"><span>IN MAINTENANCE:</span> <span class="num" style="color:var(--color-warning);">${maint}</span></div>
        <div class="fleet-stat-badge"><span>FLEET AVG HEALTH:</span> <span class="num">${avgH}%</span></div>
      `;
    }

    const tbody = document.getElementById('settings-fleet-body');
    if (!tbody) return;

    if (!this.fleet || this.fleet.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:15px; color:var(--text-muted);">No airframes registered.</td></tr>';
      return;
    }

    tbody.innerHTML = this.fleet.map(u => {
      const isCurrentActive = (u.id === this.activeUavId) || (window.app && window.app.activeUav === u.id);
      const statusClass = u.status === 'Active' ? 'status-active' : (u.status === 'Standby' ? 'status-standby' : 'status-maintenance');
      const healthColor = (u.health_score >= 90) ? 'var(--color-nominal)' : (u.health_score >= 80 ? 'var(--color-warning)' : 'var(--color-critical)');

      return `
        <tr style="${isCurrentActive ? 'background: rgba(2, 132, 199, 0.08); font-weight: 500;' : ''}">
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="font-mono" style="font-weight:700; color:var(--text-primary); font-size:12px;">${u.id}</span>
              ${u.callsign ? `<span class="mil-badge badge-normal" style="font-size:9px; padding:1px 5px;">${u.callsign}</span>` : ''}
            </div>
            <div style="font-size:10px; color:var(--text-muted);">${u.name || ''}</div>
          </td>
          <td>
            <div style="font-size:11px; font-weight:600;">${u.airframe || 'AeroTwin MALE'}</div>
            <div style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono);">${u.engine_model || 'Rotax 915 iS'}</div>
          </td>
          <td class="font-mono" style="font-size:11px;">${u.tail_number || 'N/A'}</td>
          <td class="font-mono" style="font-size:11px;">${Number(u.flight_hours || 0).toFixed(1)} hrs</td>
          <td>
            <span class="fleet-status-pill ${statusClass}">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:currentColor;"></span>
              ${u.status || 'Standby'}
            </span>
          </td>
          <td>
            <span class="font-mono" style="font-weight:700; color:${healthColor};">${u.health_score || 95}%</span>
          </td>
          <td style="font-size:11px; color:var(--text-secondary);">${u.location || 'Base Alpha'}</td>
          <td>
            <div style="display:flex; align-items:center;">
              ${isCurrentActive ?
                `<span class="mil-badge badge-normal" style="background:#059669; color:#fff; font-size:9px; padding:2px 6px;">MONITORING</span>` :
                `<button class="btn-action-switch" onclick="window.settingsView.activateUav('${u.id}')" title="Set as monitored digital twin">Switch</button>`
              }
              ${!u.is_default ?
                `<button class="btn-action-delete" onclick="window.settingsView.deleteUav('${u.id}')" title="Decommission airframe">✕</button>` :
                ''
              }
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async activateUav(uavId) {
    try {
      const res = await fetch('/api/fleet/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uav_id: uavId })
      });
      const data = await res.json();
      if (data.success) {
        this.activeUavId = uavId;
        if (window.app) {
          window.app.setActiveUav(uavId);
        }
        await this.fetchFleet();
      }
    } catch (e) {
      console.error('Error switching active UAV:', e);
    }
  }

  async deleteUav(uavId) {
    if (!confirm(`Are you sure you want to decommission and remove UAV '${uavId}' from the digital twin fleet?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/fleet/${uavId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (window.app) {
          window.app.showToast(`UAV '${uavId}' decommissioned from fleet.`);
          await window.app.fetchFleet();
        }
        await this.fetchFleet();
      } else {
        alert(data.detail || 'Failed to delete UAV.');
      }
    } catch (e) {
      console.error('Error deleting UAV:', e);
    }
  }

  async fetchThresholds() {
    try {
      const res = await fetch('/api/settings/thresholds');
      const data = await res.json();
      this.thresholds = data.thresholds || {};
      this.renderThresholdTable();
    } catch (e) {
      console.error('Error fetching thresholds:', e);
    }
  }

  toggleSupervisorAuth() {
    this.isSupervisorUnlocked = !this.isSupervisorUnlocked;
    const banner = document.getElementById('fadec-security-banner');
    const icon = document.getElementById('fadec-lock-icon');
    const text = document.getElementById('fadec-lock-text');
    const btn = document.getElementById('btn-fadec-auth-toggle');

    if (this.isSupervisorUnlocked) {
      if (banner) banner.className = 'fadec-lock-box unlocked';
      if (icon) icon.innerText = '🔓';
      if (text) text.innerText = 'FADEC CALIBRATION MODE ACTIVE (SUPERVISOR ENG-07)';
      if (btn) btn.innerText = 'Lock Calibration';
    } else {
      if (banner) banner.className = 'fadec-lock-box';
      if (icon) icon.innerText = '🔒';
      if (text) text.innerText = 'FADEC CALIBRATION: SUPERVISOR AUTH REQUIRED';
      if (btn) btn.innerText = 'Unlock Calibration';
    }

    this.renderThresholdTable();
  }

  renderThresholdTable() {
    const tbody = document.getElementById('settings-thresholds-body');
    if (!tbody) return;

    const disabledAttr = this.isSupervisorUnlocked ? '' : 'disabled';
    const disabledStyle = this.isSupervisorUnlocked ? '' : 'opacity: 0.6; cursor: not-allowed;';

    tbody.innerHTML = Object.entries(this.thresholds).map(([key, item]) => `
      <tr>
        <td><strong>${item.name}</strong><br><span style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">${key.toUpperCase()}</span></td>
        <td>
          <input type="number" step="0.1" class="table-input" id="thresh-warn-${key}" value="${item.warning}" ${disabledAttr} style="${disabledStyle}">
        </td>
        <td>
          <input type="number" step="0.1" class="table-input" id="thresh-crit-${key}" value="${item.critical}" ${disabledAttr} style="${disabledStyle}">
        </td>
        <td class="font-mono text-muted">${item.unit}</td>
      </tr>
    `).join('');
  }

  async saveThresholds() {
    const updated = {};
    Object.keys(this.thresholds).forEach(key => {
      const warnInput = document.getElementById(`thresh-warn-${key}`);
      const critInput = document.getElementById(`thresh-crit-${key}`);
      if (warnInput && critInput) {
        updated[key] = {
          warning: parseFloat(warnInput.value),
          critical: parseFloat(critInput.value),
        };
      }
    });

    try {
      const res = await fetch('/api/settings/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thresholds: updated }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Operational limit thresholds updated successfully across all twin nodes.');
      }
    } catch (e) {
      console.error('Error saving thresholds:', e);
    }
  }

  initEvents() {
    const saveBtn = document.getElementById('settings-save-thresholds-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveThresholds());
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle-select');
    if (themeToggle) {
      themeToggle.addEventListener('change', (e) => {
        if (e.target.value === 'light') {
          document.body.classList.add('light-mode');
        } else {
          document.body.classList.remove('light-mode');
        }
      });
    }

    // Add UAV shortcut in Settings
    const addUavBtn = document.getElementById('settings-add-uav-btn');
    if (addUavBtn) {
      addUavBtn.addEventListener('click', () => {
        if (window.app) window.app.openAddUavModal();
      });
    }
  }
}

window.SettingsView = SettingsView;
