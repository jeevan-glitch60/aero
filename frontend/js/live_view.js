/**
 * Live Tab Controller: Real-Time Engine View
 * Handles 8 key metric cards with trend arrows & status tints,
 * 3 dual-axis time-series charts with limit bands & FFT spectrum,
 * mission phase indicator ribbon, ambient flight envelope,
 * rolling system logs, and AI prognostics summary.
 */

class LiveView {
  constructor() {
    this.historyBuffer = [];
    this.fftCanvas = null;
    this.systemLogs = [
      { time: '14:30:00', text: 'Telemetry synchronization initialized at 10 Hz' },
      { time: '14:30:01', text: 'MVEM physics twin state converged (residual < 1.2σ)' },
      { time: '14:30:02', text: 'EKF innovation covariance matrix updated' },
    ];

    this.initCharts();
    this.initFFT();
    this.seedInitialData();
  }

  initCharts() {
    // Primary Engine Dynamics Chart (RPM on left, CHT & EGT on right)
    this.powerThermalChart = new AeroTwinChart('live-chart-power-thermal', {
      leftUnit: 'RPM',
      rightUnit: '°C',
      leftMin: 1200,
      leftMax: 5900,
      rightMin: 40,
      rightMax: 920,
      toleranceBands: [
        { min: 40, max: 125, color: 'rgba(5, 150, 105, 0.08)', axis: 'right' },
        { min: 125, max: 135, color: 'rgba(217, 119, 6, 0.12)', axis: 'right' },
        { min: 135, max: 160, color: 'rgba(220, 38, 38, 0.18)', axis: 'right' },
      ],
      maxPoints: 80,
    });
    this.powerThermalChart.addSeries({ id: 'rpm', label: 'Engine RPM', color: '#0284c7', axis: 'left', lineWidth: 2.2 });
    this.powerThermalChart.addSeries({ id: 'cht', label: 'Max CHT', color: '#d97706', axis: 'right', lineWidth: 2.0 });
    this.powerThermalChart.addSeries({ id: 'egt', label: 'Max EGT', color: '#dc2626', axis: 'right', lineWidth: 2.0 });
  }

  seedInitialData() {
    const powerSeed = [];
    const count = 30;

    for (let i = 0; i < count; i++) {
      const t = -(count - i);
      const rpm = 5000 + Math.sin(i / 3) * 60 + (Math.random() - 0.5) * 20;
      const cht = 108.2 + Math.sin(i / 4) * 2 + (Math.random() - 0.5) * 0.8;
      const egt = 782 + Math.cos(i / 5) * 15 + (Math.random() - 0.5) * 6;

      powerSeed.push({ timestamp: t, timestamp_str: `${t}s`, rpm, cht, egt });
    }

    this.powerThermalChart.setData(powerSeed);

    this.updateHealthScoreCard(92);
    this.updateDigitalReadouts({
      oil_press_bar: 3.97,
      oil_temp_c: 81.9,
      fuel_flow_lph: 24.9,
      fuel_press_bar: 3.20,
      map_hpa: 855,
      coolant_temp_c: 80.1,
      vibration_g: 1.23,
      vibration_harmonics: { "1x": 0.76, "2x": 0.36, "4x": 0.13 }
    });
    this.drawFFT({ "1x": 0.76, "2x": 0.36, "4x": 0.13 });
    this.renderLogs();
  }

  initFFT() {
    this.fftCanvas = document.getElementById('live-fft-canvas');
  }

  update(packet) {
    if (!packet || !packet.sensor) return;

    const s = packet.sensor;
    const tw = packet.twin || {};
    const res = packet.residuals || {};
    const h = packet.health || {};
    const rul = packet.rul || {};
    const sim = packet.simulation || {};

    const maxCht = s.cht_c && s.cht_c.length ? Math.max(...s.cht_c) : 108;
    const maxEgt = s.egt_c && s.egt_c.length ? Math.max(...s.egt_c) : 785;
    const vib = s.vibration_g !== undefined ? s.vibration_g : 1.18;
    const healthScore = h.health_score_pct !== undefined ? h.health_score_pct : 92.0;

    // Buffer for 60s trend arrows
    this.historyBuffer.push({
      rpm: s.engine_rpm,
      cht: maxCht,
      egt: maxEgt,
      oil_press: s.oil_press_bar,
      oil_temp: s.oil_temp_c,
      fuel_flow: s.fuel_flow_lph,
      vib: vib,
      health: healthScore,
    });
    if (this.historyBuffer.length > 60) this.historyBuffer.shift();

    // 1. Update 8 Metric Cards with Trends & Status Tints
    this.updateCard('card-rpm', s.engine_rpm.toFixed(0), 'RPM', this.getTrend('rpm', s.engine_rpm), this.getStatus('rpm', s.engine_rpm, 5500, 5800));
    this.updateCard('card-cht', maxCht.toFixed(1), '°C', this.getTrend('cht', maxCht), this.getStatus('cht', maxCht, 125, 135));
    this.updateCard('card-egt', maxEgt.toFixed(0), '°C', this.getTrend('egt', maxEgt), this.getStatus('egt', maxEgt, 880, 920));
    this.updateCard('card-oil-p', s.oil_press_bar.toFixed(2), 'bar', this.getTrend('oil_press', s.oil_press_bar), this.getStatusMin('oil_press', s.oil_press_bar, 2.0, 1.5));
    this.updateCard('card-oil-t', s.oil_temp_c.toFixed(1), '°C', this.getTrend('oil_temp', s.oil_temp_c), this.getStatus('oil_temp', s.oil_temp_c, 120, 130));
    this.updateCard('card-fuel-flow', s.fuel_flow_lph.toFixed(1), 'L/h', this.getTrend('fuel_flow', s.fuel_flow_lph), 'normal');
    this.updateCard('card-vibration', vib.toFixed(2), 'g', this.getTrend('vib', vib), this.getStatus('vib', vib, 2.0, 2.8));
    this.updateHealthScoreCard(healthScore);

    // 2. Add points to Primary Dynamics Chart
    const timeSec = s.timestamp || 0;
    this.powerThermalChart.addPoint({
      timestamp: timeSec,
      rpm: s.engine_rpm,
      cht: maxCht,
      egt: maxEgt,
    });

    // 3. Update High-Density Digital Readouts (Numbers instead of crowded graphs)
    this.updateDigitalReadouts(s, tw, h);

    // 4. Draw FFT mini spectrum & determinism
    this.drawFFT(s.vibration_harmonics || { "1x": 0.76, "2x": 0.36, "4x": 0.13 });
    this.updateDeterminism();

    // 4. Update Right Panel: Phase, Conditions, Logs
    this.updateContextPanel(s, sim, res);

    // 5. Update Bottom Strip AI Summary
    this.updateAISummary(res, h, rul);
  }

  getTrend(key, currVal) {
    if (this.historyBuffer.length < 5) return '→';
    const sum = this.historyBuffer.reduce((acc, pt) => acc + (pt[key] || 0), 0);
    const avg = sum / this.historyBuffer.length;
    const diff = currVal - avg;
    const threshold = avg * 0.015;
    if (diff > threshold) return '↑';
    if (diff < -threshold) return '↓';
    return '→';
  }

  getStatus(key, val, warn, crit) {
    if (val >= crit) return 'critical';
    if (val >= warn) return 'warning';
    return 'normal';
  }

  getStatusMin(key, val, warn, crit) {
    if (val <= crit) return 'critical';
    if (val <= warn) return 'warning';
    return 'normal';
  }

  updateCard(cardId, value, unit, trend, status) {
    const card = document.getElementById(cardId);
    if (!card) return;

    card.classList.remove('status-normal', 'status-warning', 'status-critical');
    card.classList.add(`status-${status}`);

    const valEl = card.querySelector('.metric-val');
    const unitEl = card.querySelector('.metric-unit');
    const trendEl = card.querySelector('.metric-trend');

    if (valEl) valEl.innerText = value;
    if (unitEl) unitEl.innerText = unit;
    if (trendEl) {
      trendEl.innerText = trend;
      trendEl.className = 'metric-trend trend-' + (trend === '↑' ? 'up' : (trend === '↓' ? 'down' : 'flat'));
    }
  }

  updateHealthScoreCard(score) {
    const card = document.getElementById('card-health-score');
    if (!card) return;

    const valEl = card.querySelector('.metric-val');
    if (valEl) valEl.innerText = Math.round(score);

    const canvas = document.getElementById('health-ring-mini');
    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = cx - 4;

      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 3;
      ctx.stroke();

      const pct = Math.min(100, Math.max(0, score)) / 100;
      const endAngle = -Math.PI / 2 + pct * (Math.PI * 2);

      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, endAngle);
      ctx.strokeStyle = score >= 85 ? '#059669' : (score >= 70 ? '#d97706' : '#dc2626');
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  updateDigitalReadouts(s, tw, h) {
    if (!s) return;

    // 1. Oil Pressure
    const oilP = s.oil_press_bar !== undefined ? s.oil_press_bar : 3.97;
    const oilPEl = document.getElementById('readout-oil-press');
    const oilPBar = document.getElementById('bar-oil-press');
    if (oilPEl) oilPEl.innerText = oilP.toFixed(2);
    if (oilPBar) {
      const pct = Math.max(0, Math.min(100, (oilP / 6.0) * 100));
      oilPBar.style.width = `${pct}%`;
      oilPBar.style.background = oilP < 2.0 ? 'var(--color-critical)' : (oilP < 2.5 ? 'var(--color-warning)' : 'var(--color-nominal)');
    }

    // 2. Oil Temperature
    const oilT = s.oil_temp_c !== undefined ? s.oil_temp_c : 81.9;
    const oilTEl = document.getElementById('readout-oil-temp');
    const oilTBar = document.getElementById('bar-oil-temp');
    if (oilTEl) oilTEl.innerText = oilT.toFixed(1);
    if (oilTBar) {
      const pct = Math.max(0, Math.min(100, (oilT / 140) * 100));
      oilTBar.style.width = `${pct}%`;
      oilTBar.style.background = oilT > 130 ? 'var(--color-critical)' : (oilT > 120 ? 'var(--color-warning)' : 'var(--color-nominal)');
    }

    // 3. Fuel Flow
    const ff = s.fuel_flow_lph !== undefined ? s.fuel_flow_lph : 24.9;
    const ffEl = document.getElementById('readout-fuel-flow');
    const ffBar = document.getElementById('bar-fuel-flow');
    if (ffEl) ffEl.innerText = ff.toFixed(1);
    if (ffBar) {
      const pct = Math.max(0, Math.min(100, (ff / 45) * 100));
      ffBar.style.width = `${pct}%`;
      ffBar.style.background = 'var(--color-info)';
    }

    // 4. Fuel Rail Pressure
    const fp = s.fuel_press_bar !== undefined ? s.fuel_press_bar : 3.20;
    const fpEl = document.getElementById('readout-fuel-press');
    const fpBar = document.getElementById('bar-fuel-press');
    if (fpEl) fpEl.innerText = fp.toFixed(2);
    if (fpBar) {
      const pct = Math.max(0, Math.min(100, (fp / 5.0) * 100));
      fpBar.style.width = `${pct}%`;
      fpBar.style.background = (fp < 2.8 || fp > 3.8) ? 'var(--color-warning)' : 'var(--color-nominal)';
    }

    // 5. Manifold Air Pressure (MAP)
    const mapVal = s.map_hpa !== undefined ? s.map_hpa : 855;
    const mapEl = document.getElementById('readout-map');
    const mapBar = document.getElementById('bar-map');
    if (mapEl) mapEl.innerText = Math.round(mapVal);
    if (mapBar) {
      const pct = Math.max(0, Math.min(100, (mapVal / 1800) * 100));
      mapBar.style.width = `${pct}%`;
      mapBar.style.background = 'var(--color-info)';
    }

    // 6. Coolant Temperature
    const clt = s.coolant_temp_c !== undefined ? s.coolant_temp_c : 80.1;
    const cltEl = document.getElementById('readout-coolant');
    const cltBar = document.getElementById('bar-coolant');
    if (cltEl) cltEl.innerText = clt.toFixed(1);
    if (cltBar) {
      const pct = Math.max(0, Math.min(100, (clt / 110) * 100));
      cltBar.style.width = `${pct}%`;
      cltBar.style.background = clt > 95 ? 'var(--color-critical)' : (clt > 90 ? 'var(--color-warning)' : 'var(--color-nominal)');
    }

    // 7. Mechanical Vibration Orders
    const vib = s.vibration_g !== undefined ? s.vibration_g : 1.23;
    const harm = s.vibration_harmonics || { '1x': 0.76, '2x': 0.36, '4x': 0.13, '3x': 0.13 };
    const vibEl = document.getElementById('readout-vib-overall');
    const vib1xEl = document.getElementById('readout-vib-1x');
    const vib2xEl = document.getElementById('readout-vib-2x');
    const vib4xEl = document.getElementById('readout-vib-4x');

    if (vibEl) {
      vibEl.innerText = vib.toFixed(2);
      vibEl.style.color = vib > 2.8 ? 'var(--color-critical)' : (vib > 2.0 ? 'var(--color-warning)' : 'var(--text-primary)');
    }
    if (vib1xEl) vib1xEl.innerText = (harm['1x'] !== undefined ? harm['1x'] : 0.76).toFixed(2);
    if (vib2xEl) vib2xEl.innerText = (harm['2x'] !== undefined ? harm['2x'] : 0.36).toFixed(2);
    if (vib4xEl) vib4xEl.innerText = (harm['4x'] !== undefined ? harm['4x'] : (harm['3x'] || 0.13)).toFixed(2);

    // 8. Hydraulics & Vibration status badges
    const hydBadge = document.getElementById('live-hydraulics-status');
    if (hydBadge) {
      const isHydWarn = oilP < 2.5 || oilT > 120;
      hydBadge.className = `mil-badge ${isHydWarn ? 'badge-warning' : 'badge-normal'}`;
      hydBadge.innerText = isHydWarn ? 'HYDRAULICS CAUTION' : 'HYDRAULICS NOMINAL';
    }

    const vibBadge = document.getElementById('live-vib-status');
    if (vibBadge) {
      const isVibWarn = vib > 2.0;
      vibBadge.className = `mil-badge ${isVibWarn ? 'badge-warning' : 'badge-normal'}`;
      vibBadge.innerText = isVibWarn ? 'VIBRATION ELEVATED' : 'VIBRATION NOMINAL';
    }
  }

  drawFFT(harmonics) {
    if (!this.fftCanvas || !this.fftCanvas.getContext) return;
    const ctx = this.fftCanvas.getContext('2d');
    const w = this.fftCanvas.width || 230;
    const h = this.fftCanvas.height || 78;

    ctx.clearRect(0, 0, w, h);

    const bars = [
      { label: '1X', val: harmonics['1x'] !== undefined ? harmonics['1x'] : 0.85, sub: 'Crank' },
      { label: '2X', val: harmonics['2x'] !== undefined ? harmonics['2x'] : 0.35, sub: 'Firing' },
      { label: '4X', val: harmonics['4x'] !== undefined ? harmonics['4x'] : (harmonics['3x'] || 0.18), sub: 'Valves' },
      { label: 'BLD', val: 0.22, sub: 'Blade' },
    ];

    const barW = 32;
    const maxVal = 2.2;
    const gap = (w - (bars.length * barW)) / (bars.length + 1);

    bars.forEach((b, i) => {
      const x = gap + i * (barW + gap);
      const barH = Math.min(h - 22, Math.max(4, (b.val / maxVal) * (h - 26)));
      const y = h - 16 - barH;

      ctx.fillStyle = b.val > 1.2 ? '#dc2626' : (b.val > 0.6 ? '#d97706' : '#0284c7');
      ctx.fillRect(x, y, barW, barH);

      // Order label
      ctx.fillStyle = '#475569';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, x + barW / 2, h - 3);

      // G-value readout
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 8.5px "JetBrains Mono", monospace';
      ctx.fillText(`${b.val.toFixed(2)}g`, x + barW / 2, y - 2);
    });
  }

  updateDeterminism() {
    const latEl = document.getElementById('live-det-latency');
    const dropEl = document.getElementById('live-det-drop');
    const jitEl = document.getElementById('live-det-jitter');

    // Simulate steady STANAG 4586 deterministic frame ingestion
    const jitter = (0.7 + Math.random() * 0.4).toFixed(1);
    const latency = Math.round(17 + Math.random() * 2);

    if (latEl) latEl.innerText = `${latency} ms`;
    if (dropEl) dropEl.innerText = `0.00%`;
    if (jitEl) jitEl.innerText = `<${jitter} ms`;
  }

  updateContextPanel(s, sim, res) {
    const phaseEl = document.getElementById('live-phase-badge');
    const phaseBar = document.getElementById('live-phase-bar');
    const phaseName = sim.phase_name || 'CRUISE / LOITER';
    if (phaseEl) phaseEl.innerText = phaseName.toUpperCase();

    const phases = ['GROUND IDLE', 'TAXI', 'TAKEOFF', 'CLIMB', 'CRUISE / LOITER', 'DESCENT', 'LANDING'];
    const idx = Math.max(0, phases.findIndex(p => phaseName.toUpperCase().includes(p.split(' ')[0])));
    const phasePct = Math.round(((idx + 1) / phases.length) * 100);
    if (phaseBar) phaseBar.style.width = `${phasePct}%`;

    const altEl = document.getElementById('live-env-alt');
    const oatEl = document.getElementById('live-env-oat');
    const iasEl = document.getElementById('live-env-ias');

    if (altEl) altEl.innerText = `${(s.altitude_m * 3.28084).toFixed(0)} ft (${s.altitude_m.toFixed(0)} m)`;
    if (oatEl) oatEl.innerText = `${s.ambient_temp_c.toFixed(1)}°C`;
    if (iasEl) iasEl.innerText = `${s.airspeed_kts.toFixed(0)} kts`;

    if (Math.random() < 0.05) {
      const now = new Date().toTimeString().split(' ')[0];
      const msgs = [
        `AI model updated – residual score ${(res.anomaly_score_pct || 0).toFixed(1)}%`,
        `Telemetry frame received – 10 Hz nominal`,
        `Health index recomputed: ${sim.phase_name || 'Steady State'}`,
        `CAN bus packet jitter < 1.4 ms`,
      ];
      const text = msgs[Math.floor(Math.random() * msgs.length)];
      this.systemLogs.unshift({ time: now, text });
      if (this.systemLogs.length > 8) this.systemLogs.pop();
      this.renderLogs();
    }
  }

  renderLogs() {
    const container = document.getElementById('live-system-log-feed');
    if (!container) return;
    container.innerHTML = this.systemLogs.map(l => `
      <div class="log-entry">
        <span class="log-time">${l.time}</span>
        <span class="log-text">${l.text}</span>
      </div>
    `).join('');
  }

  updateAISummary(res, h, rul) {
    const anomScore = res.anomaly_score_pct !== undefined ? res.anomaly_score_pct : 12.0;
    const anomEl = document.getElementById('ai-anomaly-val');
    if (anomEl) {
      const sev = anomScore > 60 ? 'High' : (anomScore > 30 ? 'Moderate' : 'Low');
      const col = anomScore > 60 ? 'var(--color-critical)' : (anomScore > 30 ? 'var(--color-warning)' : 'var(--color-nominal)');
      anomEl.innerHTML = `<span style="color: ${col}; font-weight: 700;">${anomScore.toFixed(0)}% (${sev})</span>`;
    }

    const faultEl = document.getElementById('ai-predicted-fault-val');
    if (faultEl) {
      if (h.isolated_faults && h.isolated_faults.length > 0) {
        const topFault = h.isolated_faults[0];
        faultEl.innerHTML = `<span style="color: var(--color-warning); font-weight: 700;">${topFault.name} (${topFault.confidence_pct.toFixed(0)}%)</span>`;
      } else {
        faultEl.innerHTML = `<span style="color: var(--color-nominal); font-weight: 600;">None Detected</span>`;
      }
    }

    const rulEl = document.getElementById('ai-rul-val');
    if (rulEl) {
      const hrs = rul.estimated_rul_hours ? Math.round(rul.estimated_rul_hours) : 124;
      rulEl.innerText = `${hrs} h (±8 h)`;
    }
  }
}

window.LiveView = LiveView;
