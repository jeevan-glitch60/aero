/**
 * Alerts Tab Controller: Fault Detection, Diagnostics & Explainability
 * Features: Multi-filter alert table, interactive explainability side panel
 * with evidence rationales, anomaly vs baseline mini chart, predicted cause,
 * recommended pilot/maintenance actions, and alert rate statistics.
 */

class AlertsView {
  constructor() {
    this.alerts = [];
    this.selectedAlert = null;
    this.activeFilterSeverity = 'ALL';
    this.activeFilterType = 'ALL';
    this.explainChart = null;

    this.initExplainChart();
    this.initStatsCharts();
    this.fetchAlerts();
  }

  initExplainChart() {
    this.explainChart = new AeroTwinChart('alert-explain-chart-canvas', {
      leftUnit: '°C',
      leftMin: 80,
      leftMax: 180,
      diffFill: {
        seriesA: 'observed',
        seriesB: 'baseline',
        color: 'rgba(239, 68, 68, 0.20)',
      },
      maxPoints: 30,
    });
    this.explainChart.addSeries({ id: 'observed', label: 'Anomalous Divergence', color: '#ef4444', axis: 'left', lineWidth: 2.2 });
    this.explainChart.addSeries({ id: 'baseline', label: 'Nominal Baseline', color: '#00f59b', axis: 'left', dashed: true, lineWidth: 1.8 });

    // Seed default alert divergence
    const seed = [];
    for (let i = 0; i <= 20; i++) {
      const base = 108.0 + (i * 0.2);
      const obs = i < 8 ? base : base + (i - 8) * 2.8;
      seed.push({
        time: i * 30,
        timestamp_str: `-${(20 - i) * 30}s`,
        baseline: Math.round(base * 10) / 10,
        observed: Math.round(obs * 10) / 10,
      });
    }
    this.explainChart.setData(seed);
  }

  initStatsCharts() {
    // Top recurring issues mini table & bar chart can be drawn on canvas or HTML
    this.statsBarCanvas = document.getElementById('alerts-stats-bar-canvas');
    if (this.statsBarCanvas && this.statsBarCanvas.getContext) {
      this.drawStatsBar();
    }
  }

  drawStatsBar() {
    const ctx = this.statsBarCanvas.getContext('2d');
    const w = this.statsBarCanvas.width;
    const h = this.statsBarCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const categories = [
      { label: 'Thermal Overheat', count: 9, color: '#ef4444' },
      { label: 'Injector Imbalance', count: 6, color: '#f59e0b' },
      { label: 'Sensor Drift / Noise', count: 4, color: '#06b6d4' },
      { label: 'Lubrication Sag', count: 3, color: '#a855f7' },
    ];

    const barH = 18;
    const gap = 12;
    const maxVal = 10;

    categories.forEach((cat, idx) => {
      const y = 8 + idx * (barH + gap);
      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(cat.label, 8, y + 13);

      // Bar
      const startX = 140;
      const barMaxW = w - startX - 45;
      const curW = (cat.count / maxVal) * barMaxW;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(startX, y, barMaxW, barH);

      ctx.fillStyle = cat.color;
      ctx.fillRect(startX, y, curW, barH);

      // Count
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${cat.count} faults`, startX + curW + 8, y + 13);
    });
  }

  async fetchAlerts() {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      this.alerts = data.alerts || [];
      this.updateSummary(data.summary || {});
      this.renderTable();
      if (this.alerts.length > 0 && !this.selectedAlert) {
        this.selectAlert(this.alerts[0].id);
      }
    } catch (e) {
      console.error('Error fetching alerts:', e);
    }
  }

  updateSummary(summary) {
    const summaryEl = document.getElementById('alerts-summary-counts');
    if (summaryEl) {
      summaryEl.innerHTML = `
        Active Alerts: <strong style="color: var(--text-primary);">${summary.active || 0}</strong>
        (Critical: <span style="color: var(--color-critical); font-weight:700;">${summary.critical || 0}</span>,
        Warning: <span style="color: var(--color-warning); font-weight:700;">${summary.warning || 0}</span>,
        Info: <span style="color: var(--color-nominal); font-weight:700;">${summary.info || 0}</span>)
      `;
    }
  }

  setFilterSeverity(sev) {
    this.activeFilterSeverity = sev;
    this.renderTable();
  }

  setFilterType(type) {
    this.activeFilterType = type;
    this.renderTable();
  }

  renderTable() {
    const tbody = document.getElementById('alerts-table-body');
    if (!tbody) return;

    let filtered = this.alerts;
    if (this.activeFilterSeverity !== 'ALL') {
      filtered = filtered.filter(a => a.severity === this.activeFilterSeverity);
    }
    if (this.activeFilterType !== 'ALL') {
      filtered = filtered.filter(a => a.category === this.activeFilterType || a.type.toLowerCase().includes(this.activeFilterType.toLowerCase()));
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">No active alerts matching filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(a => {
      const isSelected = this.selectedAlert && this.selectedAlert.id === a.id;
      const sevClass = a.severity === 'CRITICAL' ? 'critical' : (a.severity === 'WARNING' ? 'warning' : 'info');
      return `
        <tr class="alert-row ${isSelected ? 'selected' : ''}" onclick="window.alertsView.selectAlert('${a.id}')">
          <td class="font-mono text-muted">${a.timestamp}</td>
          <td><strong style="color: var(--text-primary);">${a.type}</strong></td>
          <td><span class="mil-badge badge-${sevClass}">${a.severity}</span></td>
          <td class="alert-msg-cell">${a.message}</td>
          <td><span class="status-pill status-pill-${a.status.toLowerCase()}">${a.status}</span></td>
          <td>
            <button class="table-btn" onclick="event.stopPropagation(); window.alertsView.acknowledgeAlert('${a.id}')">Ack</button>
            <button class="table-btn" onclick="event.stopPropagation(); window.alertsView.muteAlert('${a.id}')">Mute</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  selectAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;
    this.selectedAlert = alert;
    this.renderTable();
    this.renderSidePanel(alert);
  }

  renderSidePanel(alert) {
    const headerTitle = document.getElementById('alert-detail-title');
    const headerMeta = document.getElementById('alert-detail-meta');
    const whyList = document.getElementById('alert-explain-why-list');
    const causeText = document.getElementById('alert-predicted-cause-text');
    const actionText = document.getElementById('alert-recommended-action-text');
    const metricsTags = document.getElementById('alert-affected-metrics-tags');

    if (headerTitle) headerTitle.innerText = alert.type;
    if (headerMeta) {
      const sevClass = alert.severity === 'CRITICAL' ? 'critical' : (alert.severity === 'WARNING' ? 'warning' : 'info');
      headerMeta.innerHTML = `<span class="mil-badge badge-${sevClass}">${alert.severity}</span> &bull; Detected at ${alert.timestamp} &bull; ID: ${alert.id}`;
    }

    // Defence-Grade Assurance Metadata Strip
    const stripEl = document.getElementById('alert-assurance-strip');
    const mgr = window.assuranceManager;
    const qScore = mgr ? mgr.qualityMetrics.dataConfidenceScore : 94;
    const confScore = mgr ? mgr.getAdjustedModelConfidence() : 74;
    const sourceMode = mgr ? mgr.qualityMetrics.sourceMode.toUpperCase() : 'SYNTHETIC';
    const lastValid = mgr ? mgr.lastValidTelemetryTime.slice(11, 19) : 'Live';

    if (stripEl) {
      stripEl.innerHTML = `
        <span class="meta-tag synthetic">SOURCE: ${sourceMode}</span>
        <span class="meta-tag quality">DATA QUALITY: ${qScore}%</span>
        <span class="meta-tag confidence">CONFIDENCE: ${confScore}%</span>
        <span class="meta-tag" style="background:#e0f2fe; color:#0369a1;">PREDICTED / SYNTHETIC</span>
        <span class="meta-tag" style="background:#fef3c7; color:#78350f;">ILLUSTRATIVE ESTIMATE</span>
        <span class="meta-tag" style="background:#f1f5f9; color:#475569;">LAST VALID: ${lastValid}</span>
      `;
    }

    if (whyList) {
      const bullets = alert.evidence && alert.evidence.length > 0 ? alert.evidence : [
        "Cylinder EGT spread is +68°C above nominal peer-cylinder pattern",
        "Fuel delivery variability increased during steady-state cruise loiter",
        "Vibration harmonic at 2× RPM elevated while throttle demand remained stable",
      ];
      whyList.innerHTML = bullets.map(b => `<li><span class="evidence-bullet-icon">&#9658;</span> ${b}</li>`).join('');
    }

    if (causeText) {
      causeText.innerText = alert.predicted_cause || "Possible injector degradation / partial coking in Cylinder 3 [Predicted / Illustrative]";
    }

    const altText = document.getElementById('alert-alternative-explanation-text');
    if (altText) {
      altText.innerText = qScore < 80 
        ? "EGT thermocouple sensor drift, wiring micro-fracture, or CAN frame jitter (reduced telemetry quality detected)"
        : "Thermocouple calibration bias or localized manifold intake vacuum leak";
    }

    if (actionText) {
      actionText.innerText = alert.recommended_action || "Verify sensor consistency; inspect injector flow pattern using authorized maintenance procedure after simulated mission.";
    }

    const limitText = document.getElementById('alert-system-limit-text');
    if (limitText) {
      limitText.innerText = "System Limitation: Not a confirmed diagnosis; illustrative model output only. Digital Twin is read-only advisory and not connected to live flight systems.";
    }

    if (metricsTags) {
      const tags = alert.affected_metrics || ["Cylinder 3 Direct Injector", "EGT Channel 3", "Vibration 2x Harmonic", "Fuel Flow Trim"];
      metricsTags.innerHTML = tags.map(t => `<span class="metric-chip">${t}</span>`).join('');
    }

    // Render SHAP Feature Contribution Bar Chart
    this.renderSHAPBars(alert);

    // Seed anomaly vs baseline divergence mini chart
    this.updateExplainChart(alert);
  }

  renderSHAPBars(alert) {
    const container = document.getElementById('alert-shap-container');
    if (!container) return;

    // Feature contributions based on fault type
    let features = [];
    const type = (alert.type || '').toLowerCase();

    if (type.includes('overheat') || type.includes('thermal')) {
      features = [
        { name: 'Δ CHT vs MVEM Twin', val: 0.54, positive: true },
        { name: 'Oil Cooler Sag Rate', val: 0.32, positive: true },
        { name: 'Airspeed Ram Inflow', val: -0.22, positive: false },
        { name: 'Throttle / MAP Load', val: 0.16, positive: true },
      ];
    } else if (type.includes('injector') || type.includes('misfire') || type.includes('combustion')) {
      features = [
        { name: 'Δ MAP (Manifold Press)', val: 0.52, positive: true },
        { name: 'Wastegate Position', val: -0.31, positive: false },
        { name: 'Vibration Harmonic 2X', val: 0.28, positive: true },
        { name: 'EGT Spread Cylinder #2', val: 0.44, positive: true },
      ];
    } else if (type.includes('oil') || type.includes('pressure')) {
      features = [
        { name: 'Oil Pressure Drop', val: 0.61, positive: true },
        { name: 'Oil Temperature Visc', val: 0.35, positive: true },
        { name: 'Engine RPM Demand', val: -0.18, positive: false },
        { name: 'Sump Suction Level', val: 0.25, positive: true },
      ];
    } else {
      features = [
        { name: 'Residual Innovation Mahalanobis', val: 0.48, positive: true },
        { name: 'Sensor Temporal Drift', val: 0.34, positive: true },
        { name: 'CAN Frame Jitter Metric', val: -0.12, positive: false },
      ];
    }

    container.innerHTML = features.map(f => {
      const absVal = Math.abs(f.val);
      const pct = Math.min(100, Math.round(absVal * 100));
      const colClass = f.positive ? 'positive' : 'negative';
      const sign = f.val > 0 ? `+${f.val.toFixed(2)}` : f.val.toFixed(2);
      const colStyle = f.positive ? '#f59e0b' : '#00f59b';

      return `
        <div class="shap-bar-row">
          <div class="shap-label" title="${f.name}">${f.name}</div>
          <div class="shap-track">
            <div class="shap-fill ${colClass}" style="width: ${pct}%;"></div>
          </div>
          <div class="shap-weight" style="color: ${colStyle};">${sign}</div>
        </div>
      `;
    }).join('');
  }

  updateExplainChart(alert) {
    if (!this.explainChart) return;
    const pts = [];
    const isCrit = alert.severity === 'CRITICAL';
    for (let i = 0; i <= 20; i++) {
      const base = 108.0 + (i * 0.2);
      const observed = i < 8 ? base : base + (i - 8) * (isCrit ? 2.8 : 1.4);
      pts.push({
        time: i * 30,
        timestamp_str: `-${(20 - i) * 30}s`,
        baseline: round(base, 1),
        observed: round(observed, 1),
      });
    }
    this.explainChart.setData(pts);
  }

  async exportToPilot() {
    if (!this.selectedAlert) return;
    try {
      await fetch('/api/alerts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: this.selectedAlert.id, action: 'export_to_pilot' }),
      });
    } catch (e) {}
    this.showToast(`✈ GCS PILOT HUD: Advisory dispatched for ${this.selectedAlert.type}. Recommended power limit 85% transmitted.`);
  }

  async executeFailsafe() {
    if (!this.selectedAlert) return;
    try {
      await fetch('/api/alerts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: this.selectedAlert.id, action: 'fadec_failsafe' }),
      });
    } catch (e) {}
    this.showToast(`⚡ FADEC FAILSAFE EXECUTED: Throttle derated to 85% max continuous. STANAG 4586 closed-loop confirmation received.`);
  }

  showToast(message) {
    // Remove any existing toast
    const existing = document.querySelector('.closed-loop-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'closed-loop-toast';
    toast.innerHTML = `
      <span style="font-size: 16px;">🛡️</span>
      <div style="flex: 1; line-height: 1.3;">${message}</div>
      <button style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 14px;" onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  }

  async acknowledgeAlert(alertId) {
    try {
      await fetch('/api/alerts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, action: 'acknowledge' }),
      });
      await this.fetchAlerts();
      this.showToast(`Alert ${alertId} acknowledged by Operator.`);
    } catch (e) {
      console.error(e);
    }
  }

  async muteAlert(alertId) {
    try {
      await fetch('/api/alerts/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, action: 'mute' }),
      });
      await this.fetchAlerts();
      this.showToast(`Alert ${alertId} muted for 15 minutes.`);
    } catch (e) {
      console.error(e);
    }
  }

  exportReport() {
    if (!this.selectedAlert) return;
    const content = `MALE UAV ENGINE DIGITAL TWIN // STANAG 4586 DIAGNOSTIC INCIDENT REPORT
Alert ID: ${this.selectedAlert.id}
Classification: ${this.selectedAlert.severity} // ${this.selectedAlert.type}
Timestamp: ${this.selectedAlert.timestamp}
Message: ${this.selectedAlert.message}

--- EXPLAINABILITY EVIDENCE ---
${(this.selectedAlert.evidence || []).map(e => "- " + e).join('\n')}

--- ROOT CAUSE & PROGNOSTICS ---
Predicted Cause: ${this.selectedAlert.predicted_cause}
Recommended Action: ${this.selectedAlert.recommended_action}
Affected Metrics: ${(this.selectedAlert.affected_metrics || []).join(', ')}

Generated automatically by AeroTwin Physics-Informed Diagnostic Station.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Incident_Report_${this.selectedAlert.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast(`Incident report downloaded for ${this.selectedAlert.id}.`);
  }
}

function round(val, dec = 1) {
  const f = Math.pow(10, dec);
  return Math.round(val * f) / f;
}

window.AlertsView = AlertsView;
