/**
 * Upgraded ReplayView: Mission Replay with Interactive Timeline
 * Features: Mission selector dropdown, play/pause/stop, variable speeds (0.5x, 1x, 2x, 4x),
 * timeline slider with event markers, synchronized metrics and charts,
 * clickable chronological event log, and replay AI prognostics summary.
 */

class ReplayView {
  constructor(app) {
    this.app = app;
    this.scrubber = document.getElementById('replay-timeline-slider');
    this.playPauseBtn = document.getElementById('replay-play-pause-btn');
    this.stopBtn = document.getElementById('replay-stop-btn');
    this.timeDisplay = document.getElementById('replay-time-display');
    this.speedBtn = document.getElementById('replay-speed-btn');
    this.missionSelect = document.getElementById('replay-mission-select');

    this.isPlaying = false;
    this.playbackSpeed = 1.0;
    this.playInterval = null;
    this.replayChart = null;

    this.events = [
      { pct: 5, time: '00:05:00', label: 'Takeoff Roll & Rotation', type: 'phase', summary: 'Takeoff power 5,800 RPM set. Fuel flow 42 L/h.' },
      { pct: 18, time: '00:18:20', label: 'Climb Through FL120', type: 'phase', summary: 'Climb throttle 85%. MAP boost 1,450 hPa nominal.' },
      { pct: 38, time: '00:38:00', label: 'Level-off at FL180 Cruise', type: 'phase', summary: 'Cruising at 5,000 RPM, OAT -21°C.' },
      { pct: 56, time: '00:56:40', label: '⚡ Fault: CAC Fouling', type: 'alert', summary: 'Charge Air Cooler fouling injected: MAT rose +14.2°C.' },
      { pct: 64, time: '01:04:15', label: 'Alert Acknowledged by GCS', type: 'action', summary: 'Operator acknowledged thermal caution. Throttle reduced to 75%.' },
      { pct: 82, time: '01:22:00', label: 'Descent Clearance Received', type: 'phase', summary: 'Throttle pulled to 45% idle descent.' },
      { pct: 95, time: '01:35:00', label: 'Approach & Touchdown', type: 'phase', summary: 'Main gear touchdown at 68 kts IAS.' },
    ];

    this.initChart();
    this.initEvents();
    this.renderEventLog();
    this.renderTimelineMarkers();
  }

  initChart() {
    this.replayChart = new AeroTwinChart('replay-chart-canvas', {
      leftUnit: 'RPM',
      rightUnit: '°C',
      leftMin: 1200,
      leftMax: 6000,
      rightMin: 40,
      rightMax: 950,
      toleranceBands: [
        { min: 40, max: 125, color: 'rgba(0, 245, 155, 0.04)', axis: 'right' },
        { min: 125, max: 135, color: 'rgba(245, 158, 11, 0.08)', axis: 'right' },
        { min: 135, max: 160, color: 'rgba(239, 68, 68, 0.12)', axis: 'right' },
      ],
      maxPoints: 80,
    });
    this.replayChart.addSeries({ id: 'rpm', label: 'Engine RPM', color: '#00f59b', axis: 'left', lineWidth: 2.0 });
    this.replayChart.addSeries({ id: 'cht', label: 'Max CHT', color: '#f59e0b', axis: 'right', lineWidth: 1.8 });
    this.replayChart.addSeries({ id: 'egt', label: 'Max EGT', color: '#ef4444', axis: 'right', lineWidth: 1.8 });

    // Seed initial historical replay points
    const seed = [];
    for (let i = 0; i <= 25; i++) {
      seed.push({
        timestamp: i * 10,
        time: i * 10,
        timestamp_str: `T+${i * 10}s`,
        rpm: 4800 + Math.sin(i / 2) * 120,
        cht: 104 + i * 0.4,
        egt: 760 + Math.sin(i / 3) * 20,
      });
    }
    this.replayChart.setData(seed);

    this.updateReplayCard('replay-val-rpm', '4950');
    this.updateReplayCard('replay-val-cht', '112.4°C');
    this.updateReplayCard('replay-val-egt', '785°C');
    this.updateReplayCard('replay-val-oil-p', '3.80 bar');
    this.updateReplayCard('replay-val-oil-t', '86.5°C');
    this.updateReplayCard('replay-val-fuel-flow', '17.8 L/h');
    this.updateReplayCard('replay-val-vib', '1.14 g');
    this.updateReplayCard('replay-val-health', '93/100');
  }

  initEvents() {
    if (this.scrubber) {
      this.scrubber.addEventListener('input', (e) => {
        const pct = parseFloat(e.target.value);
        this.seek(pct);
      });
    }

    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => {
        this.togglePlay();
      });
    }

    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', () => {
        this.stop();
      });
    }

    if (this.speedBtn) {
      this.speedBtn.addEventListener('click', () => {
        const speeds = [0.5, 1.0, 2.0, 4.0];
        const nextIdx = (speeds.indexOf(this.playbackSpeed) + 1) % speeds.length;
        this.playbackSpeed = speeds[nextIdx];
        this.speedBtn.innerText = `${this.playbackSpeed}x SPEED`;
        if (this.isPlaying) {
          this.pause();
          this.play();
        }
      });
    }

    if (this.missionSelect) {
      this.missionSelect.addEventListener('change', () => {
        this.loadDemoData();
      });
    }
  }

  renderTimelineMarkers() {
    const container = document.getElementById('replay-markers-bar');
    if (!container) return;

    container.innerHTML = this.events.map((ev, idx) => `
      <div class="timeline-marker ${ev.type}" id="replay-marker-${idx}" style="left: ${ev.pct}%;" onclick="window.replayView.seek(${ev.pct}, ${idx})" title="${ev.time} - ${ev.label}: ${ev.summary}">
        <span class="marker-dot"></span>
        <span class="marker-tooltip">${ev.label} (${ev.time})</span>
      </div>
    `).join('');
  }

  renderEventLog() {
    const container = document.getElementById('replay-event-log-container');
    if (!container) return;

    container.innerHTML = this.events.map((ev, idx) => `
      <div class="replay-event-item" onclick="window.replayView.seek(${ev.pct}, ${idx})">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span class="font-mono text-muted">${ev.time}</span>
          <span class="mil-badge badge-${ev.type === 'alert' ? 'critical' : (ev.type === 'action' ? 'warning' : 'info')}">${ev.type.toUpperCase()}</span>
        </div>
        <div style="font-weight: 700; color: var(--text-primary); font-size: 11px;">${ev.label}</div>
        <div style="color: var(--text-muted); font-size: 10px; margin-top: 2px;">${ev.summary}</div>
      </div>
    `).join('');
  }

  async loadDemoData() {
    try {
      const res = await fetch('/api/postflight/demo-data');
      const data = await res.json();
      if (data.success) {
        this.seek(0);
      }
    } catch (e) {
      console.error('Failed to load demo replay data', e);
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.isPlaying = true;
    if (this.playPauseBtn) this.playPauseBtn.innerText = '⏸ PAUSE';
    this.playInterval = setInterval(() => {
      this.stepForward();
    }, 100 / this.playbackSpeed);
  }

  pause() {
    this.isPlaying = false;
    if (this.playPauseBtn) this.playPauseBtn.innerText = '▶ PLAY';
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  stop() {
    this.pause();
    this.seek(0);
  }

  async stepForward() {
    try {
      const res = await fetch('/api/postflight/replay/frame?step=1');
      const data = await res.json();
      if (data.frame) {
        this.handleFrame(data.frame, data.status);
      }
    } catch (e) {}
  }

  async seek(pct, eventIdx) {
    // If eventIdx is provided, trigger pulse animation on the marker
    if (eventIdx !== undefined) {
      const marker = document.getElementById(`replay-marker-${eventIdx}`);
      if (marker) {
        const dot = marker.querySelector('.marker-dot');
        if (dot) {
          dot.classList.remove('timeline-pulse-active');
          void dot.offsetWidth; // Force reflow
          dot.classList.add('timeline-pulse-active');
        }
      }
    }

    try {
      const res = await fetch(`/api/postflight/replay/frame?pct=${pct}`);
      const data = await res.json();
      if (data.frame) {
        this.handleFrame(data.frame, data.status);
      }
    } catch (e) {}
  }

  handleFrame(frame, status) {
    const s = frame.sensor;
    const tw = frame.twin;
    const h = frame.health;
    const rul = frame.rul;
    const res = frame.residuals;

    if (this.scrubber && status) {
      this.scrubber.value = status.progress_pct;
    }

    if (this.timeDisplay && s) {
      const totalSec = 5400; // 1.5 hours demo
      const curSec = Math.round(s.timestamp || 0);
      const formatTime = (secs) => {
        const hh = String(Math.floor(secs / 3600)).padStart(2, '0');
        const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
        const ss = String(secs % 60).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
      };
      this.timeDisplay.innerText = `T+ ${formatTime(curSec)} of ${formatTime(totalSec)}`;
    }

    // Update replay chart
    if (this.replayChart && s) {
      const maxCht = s.cht_c ? Math.max(...s.cht_c) : 110;
      const maxEgt = s.egt_c ? Math.max(...s.egt_c) : 800;
      this.replayChart.addPoint({
        timestamp: s.timestamp,
        rpm: s.engine_rpm,
        cht: maxCht,
        egt: maxEgt,
      });
    }

    // Update replay metric cards
    if (s) {
      this.updateReplayCard('replay-val-rpm', s.engine_rpm.toFixed(0));
      this.updateReplayCard('replay-val-cht', (s.cht_c ? Math.max(...s.cht_c) : 0).toFixed(1) + '°C');
      this.updateReplayCard('replay-val-egt', (s.egt_c ? Math.max(...s.egt_c) : 0).toFixed(0) + '°C');
      this.updateReplayCard('replay-val-oil-p', s.oil_press_bar.toFixed(2) + ' bar');
      this.updateReplayCard('replay-val-oil-t', s.oil_temp_c.toFixed(1) + '°C');
      this.updateReplayCard('replay-val-fuel-flow', s.fuel_flow_lph.toFixed(1) + ' L/h');
      this.updateReplayCard('replay-val-vib', (s.vibration_g || 1.2).toFixed(2) + ' g');
      this.updateReplayCard('replay-val-health', Math.round(h.health_score_pct || 90) + '/100');
    }

    // Update replay AI summary
    const anomEl = document.getElementById('replay-ai-anomaly');
    const faultEl = document.getElementById('replay-ai-fault');
    const rulEl = document.getElementById('replay-ai-rul');

    if (anomEl && res) {
      const anom = res.anomaly_score_pct || 14;
      const isHigh = anom > 50;
      anomEl.innerHTML = `<span style="color: ${isHigh ? 'var(--color-critical)' : 'var(--color-nominal)'}; font-weight: 700;">${anom.toFixed(0)}% (${isHigh ? 'High' : 'Nominal'})</span>`;
    }

    if (faultEl) {
      if (h.isolated_faults && h.isolated_faults.length > 0) {
        faultEl.innerHTML = `<span style="color: var(--color-warning); font-weight: 700;">${h.isolated_faults[0].name} (confidence ${h.isolated_faults[0].confidence_pct}%)</span>`;
      } else {
        faultEl.innerHTML = `<span style="color: var(--color-nominal);">Nominal Envelope (No Fault)</span>`;
      }
    }

    if (rulEl && rul) {
      rulEl.innerText = `${Math.round(rul.estimated_rul_hours || 130)} h`;
    }
  }

  updateReplayCard(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }
}

window.ReplayView = ReplayView;
