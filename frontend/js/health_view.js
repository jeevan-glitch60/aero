/**
 * Health Tab Controller: Engine Health, RUL & Degradation
 * Features: Large radial gauge (0-100) with gradient, 6 sub-system cards
 * with historical sparklines, RUL confidence interval chart,
 * and degradation stress breakdown box.
 */

class HealthView {
  constructor() {
    this.gaugeCanvas = document.getElementById('health-radial-gauge-canvas');
    this.sparklines = {};
    this.rulChart = null;

    // Synthetic history for 6 subsystem sparklines
    this.subsystems = [
      { id: 'thermal', name: 'Thermal Health', metrics: 'CHT, EGT, Oil Temp', base: 92, delta: '+1.2%', trend: '↑' },
      { id: 'mechanical', name: 'Mechanical Health', metrics: 'RPM Stability, Vibration', base: 89, delta: '-0.8%', trend: '↓' },
      { id: 'lubrication', name: 'Lubrication Health', metrics: 'Oil Pressure & Viscosity', base: 95, delta: '+0.4%', trend: '↑' },
      { id: 'combustion', name: 'Combustion Health', metrics: 'EGT Balance & Misfire', base: 86, delta: '-2.1%', trend: '↓' },
      { id: 'sensor', name: 'Sensor Health', metrics: 'Consistency & Drift', base: 98, delta: '0.0%', trend: '→' },
      { id: 'electrical', name: 'Electrical / Alternator', metrics: 'Bus 28V & Generator', base: 96, delta: '+0.1%', trend: '→' },
    ];

    this.initRULChart();
    this.initSparklines();
    this.drawRadialGauge(88);
  }

  initRULChart() {
    this.rulChart = new AeroTwinChart('health-rul-chart-canvas', {
      xLabel: 'Operating Hours (TBO)',
      leftUnit: 'hours',
      leftMin: 80,
      leftMax: 200,
      confidenceBand: {
        upperSeries: 'rul_p90',
        lowerSeries: 'rul_p10',
        color: 'rgba(6, 182, 212, 0.15)',
      },
      maxPoints: 50,
    });
    this.rulChart.addSeries({ id: 'rul_est', label: 'Estimated RUL', color: '#06b6d4', axis: 'left', lineWidth: 2.2 });
    this.rulChart.addSeries({ id: 'rul_p90', label: 'P90 Optimistic', color: 'rgba(6, 182, 212, 0.4)', axis: 'left', dashed: true, lineWidth: 1.0 });
    this.rulChart.addSeries({ id: 'rul_p10', label: 'P10 Conservative', color: 'rgba(6, 182, 212, 0.4)', axis: 'left', dashed: true, lineWidth: 1.0 });

    // Seed realistic 30-hour degradation curve
    const seedData = [];
    for (let h = 0; h <= 25; h++) {
      const baseRUL = 145 - (h * 0.95);
      seedData.push({
        time: h,
        timestamp_str: `T+${h}h`,
        rul_est: baseRUL,
        rul_p90: baseRUL + 12,
        rul_p10: baseRUL - 12,
      });
    }
    this.rulChart.setData(seedData);
  }

  initSparklines() {
    this.subsystems.forEach(sub => {
      const canvas = document.getElementById(`sparkline-${sub.id}`);
      if (canvas && canvas.getContext) {
        this.sparklines[sub.id] = canvas;
        this.drawSparkline(canvas, sub.base);
      }
    });
  }

  drawSparkline(canvas, baseScore) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const points = 16;
    const vals = [];
    for (let i = 0; i < points; i++) {
      vals.push(baseScore + Math.sin(i / 2) * 3 + (Math.random() - 0.5) * 2);
    }

    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const x = (i / (points - 1)) * w;
      const y = h - ((vals[i] - 70) / 30) * (h - 6) - 3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = baseScore >= 90 ? '#00f59b' : (baseScore >= 80 ? '#f59e0b' : '#ef4444');
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  update(packet) {
    if (!packet) return;
    const h = packet.health || {};
    const rul = packet.rul || {};
    const s = packet.sensor || {};

    // 1. Update Subsystem Scores based on real telemetry & fault state
    const subsystemScores = this.updateSubsystems(s, packet.twin, packet.residuals, h);

    // 2. Compute Mathematically Consistent Overall Health Score
    // Using Min-Worst Subsystem Penalty rule
    let overallScore = h.health_score_pct !== undefined ? h.health_score_pct : 88.0;
    if (subsystemScores) {
      const vals = Object.values(subsystemScores);
      const minScore = Math.min(...vals);
      const weightedAvg = (
        (subsystemScores.thermal || 90) * 0.25 +
        (subsystemScores.mechanical || 88) * 0.20 +
        (subsystemScores.lubrication || 92) * 0.20 +
        (subsystemScores.combustion || 86) * 0.15 +
        (subsystemScores.sensor || 95) * 0.10 +
        (subsystemScores.electrical || 95) * 0.10
      );

      // If a subsystem is severely degraded (e.g., Combustion down to 45%),
      // overall score must be strictly bottlenecked by Min-Worst penalty
      if (minScore < 75) {
        const bottleneckScore = minScore * 0.55 + weightedAvg * 0.45;
        overallScore = Math.min(overallScore, bottleneckScore);
      } else {
        overallScore = Math.min(overallScore, weightedAvg);
      }
    }

    // 3. Draw Large Radial Gauge
    this.drawRadialGauge(overallScore);

    // 4. Update Health Status Banner & Time
    const statusTextEl = document.getElementById('health-status-text');
    const statusTimeEl = document.getElementById('health-last-updated');
    if (statusTextEl) {
      const statusLabel = overallScore >= 85 ? 'Healthy (Mission Ready)' : (overallScore >= 70 ? 'Degraded (Monitor Closely)' : 'Critical Fault Present');
      const statusColor = overallScore >= 85 ? 'var(--color-nominal)' : (overallScore >= 70 ? 'var(--color-warning)' : 'var(--color-critical)');
      statusTextEl.innerHTML = `Status: <strong style="color: ${statusColor};">${statusLabel}</strong>`;
    }
    if (statusTimeEl) {
      const mgr = window.assuranceManager;
      const qScore = mgr ? mgr.qualityMetrics.dataConfidenceScore : 98;
      const src = mgr ? mgr.qualityMetrics.sourceMode.toUpperCase() : 'SYNTHETIC';
      statusTimeEl.innerText = `Cycle: ${new Date().toLocaleTimeString()} // Source: ${src} // Quality: ${qScore}% // Illustrative Twin`;
    }

    // 5. Update Degradation Box
    this.updateDegradationBox(rul, s, packet.residuals);
  }

  drawRadialGauge(score) {
    if (!this.gaugeCanvas || !this.gaugeCanvas.getContext) return;
    const ctx = this.gaugeCanvas.getContext('2d');
    const w = this.gaugeCanvas.width;
    const h = this.gaugeCanvas.height;
    const cx = w / 2;
    const cy = h / 2 + 10;
    const r = Math.min(cx, cy) - 22;

    ctx.clearRect(0, 0, w, h);

    // Semi-circle from Math.PI * 0.8 to Math.PI * 2.2
    const startAngle = Math.PI * 0.8;
    const endAngle = Math.PI * 2.2;
    const totalAngle = endAngle - startAngle;

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Gradient active arc
    const pct = Math.min(100, Math.max(0, score)) / 100;
    const activeEnd = startAngle + totalAngle * pct;

    const grad = ctx.createLinearGradient(0, cy, w, cy);
    grad.addColorStop(0, '#dc2626');
    grad.addColorStop(0.5, '#d97706');
    grad.addColorStop(1, '#059669');

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, activeEnd);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center Text
    ctx.fillStyle = '#0f172a';
    ctx.font = '700 34px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(score)}`, cx, cy - 8);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 11px "Inter", sans-serif';
    ctx.fillText('OVERALL HEALTH / 100', cx, cy + 18);
  }

  updateSubsystems(s, tw, res, h) {
    if (!s) return null;

    // Derive scores dynamically from physics telemetry & isolated faults
    const maxCht = s.cht_c ? Math.max(...s.cht_c) : 100;
    let thermalScore = Math.max(35, Math.min(100, 100 - (maxCht - 100) * 1.6 - (s.oil_temp_c > 110 ? (s.oil_temp_c - 110) * 2.2 : 0)));
    const vib = s.vibration_g || 1.2;
    let mechScore = Math.max(35, Math.min(100, 100 - (vib - 1.0) * 28));
    let lubScore = Math.max(35, Math.min(100, s.oil_press_bar < 2.5 ? s.oil_press_bar * 32 : 96));
    let combScore = h && h.cylinder_egt_spread_c ? Math.max(35, Math.min(100, 100 - h.cylinder_egt_spread_c * 0.9)) : 91;
    let sensorScore = res && res.mahalanobis_distance ? Math.max(45, Math.min(100, 100 - res.mahalanobis_distance * 7)) : 97;
    let elecScore = s.bus_voltage_v ? Math.max(55, Math.min(100, 100 - Math.abs(s.bus_voltage_v - 28.0) * 15)) : 96;

    // If an isolated fault is active, degrade corresponding subsystem directly
    if (h && h.isolated_faults && h.isolated_faults.length > 0) {
      const faultName = h.isolated_faults[0].name.toLowerCase();
      if (faultName.includes('overheat') || faultName.includes('cooling')) thermalScore = Math.min(thermalScore, 48);
      if (faultName.includes('injector') || faultName.includes('misfire') || faultName.includes('combustion')) combScore = Math.min(combScore, 45);
      if (faultName.includes('oil') || faultName.includes('lubrication') || faultName.includes('pressure')) lubScore = Math.min(lubScore, 42);
      if (faultName.includes('vibration') || faultName.includes('mount')) mechScore = Math.min(mechScore, 50);
      if (faultName.includes('sensor') || faultName.includes('drift')) sensorScore = Math.min(sensorScore, 52);
    }

    const scoresMap = {
      thermal: thermalScore,
      mechanical: mechScore,
      lubrication: lubScore,
      combustion: combScore,
      sensor: sensorScore,
      electrical: elecScore,
    };

    Object.entries(scoresMap).forEach(([id, score]) => {
      const scoreEl = document.getElementById(`subsystem-score-${id}`);
      if (scoreEl) {
        scoreEl.innerText = `${Math.round(score)}%`;
        scoreEl.style.color = score >= 85 ? 'var(--color-nominal)' : (score >= 70 ? 'var(--color-warning)' : 'var(--color-critical)');
      }
      const canvas = this.sparklines[id];
      if (canvas && Math.random() < 0.15) {
        this.drawSparkline(canvas, score);
      }
    });

    return scoresMap;
  }

  updateDegradationBox(rul, s, res) {
    const mgr = window.assuranceManager;
    const qScore = mgr ? mgr.qualityMetrics.dataConfidenceScore : 98;
    const isQualityDegraded = qScore < 85;
    const confScore = mgr ? mgr.getAdjustedModelConfidence() : 84;
    const sourceMode = mgr ? mgr.qualityMetrics.sourceMode.toUpperCase() : 'SYNTHETIC';

    const estRul = rul.estimated_rul_hours ? Math.round(rul.estimated_rul_hours) : 124;
    const uncertaintyHours = isQualityDegraded ? (qScore < 60 ? 32 : 18) : 8;
    
    const rulDisplay = document.getElementById('health-est-rul-display');
    if (rulDisplay) {
      rulDisplay.innerHTML = `${estRul} hrs <span style="font-size:11px; font-weight:normal; color:#64748b;">(±${uncertaintyHours} h)</span> <span style="font-size:10px; background:#fef3c7; color:#78350f; padding:1px 6px; border-radius:3px; margin-left:6px;">ILLUSTRATIVE ESTIMATE</span>`;
    }

    const p10 = estRul - uncertaintyHours;
    const p90 = estRul + uncertaintyHours + 4;
    const boundsEl = document.getElementById('health-rul-bounds-display');
    if (boundsEl) {
      boundsEl.innerHTML = `P10 Conservative: ${p10}h | P90 Optimistic: ${p90}h &bull; <span style="color:#0284c7;">Model Conf: ${confScore}%</span> &bull; <span style="color:#7c3aed;">Data Quality: ${qScore}%</span>`;
    }

    // Add or update quality caution banner below degradation box if quality is degraded
    let qualityCaution = document.getElementById('health-quality-caution-banner');
    if (isQualityDegraded) {
      if (!qualityCaution && boundsEl) {
        qualityCaution = document.createElement('div');
        qualityCaution.id = 'health-quality-caution-banner';
        qualityCaution.className = 'quality-confidence-banner';
        qualityCaution.style.marginTop = '8px';
        qualityCaution.innerHTML = `
          <span>⚠️</span>
          <span><strong>Prediction confidence reduced because telemetry quality is degraded (${qScore}%).</strong> Bounded uncertainty interval widened.</span>
        `;
        boundsEl.parentElement.appendChild(qualityCaution);
      }
    } else {
      if (qualityCaution) qualityCaution.remove();
    }

    const thermalStressEl = document.getElementById('stress-thermal-val');
    const mechStressEl = document.getElementById('stress-mech-val');
    const lubStressEl = document.getElementById('stress-lub-val');

    if (s) {
      const maxCht = s.cht_c ? Math.max(...s.cht_c) : 105;
      const vib = s.vibration_g || 1.2;

      if (thermalStressEl) {
        thermalStressEl.innerText = maxCht > 125 ? 'High (Elevated CHT)' : (maxCht > 115 ? 'Moderate' : 'Low / Nominal');
        thermalStressEl.style.color = maxCht > 125 ? 'var(--color-critical)' : (maxCht > 115 ? 'var(--color-warning)' : 'var(--color-nominal)');
      }
      if (mechStressEl) {
        mechStressEl.innerText = vib > 2.2 ? 'High (Torque Imbalance)' : (vib > 1.6 ? 'Moderate' : 'Low / Nominal');
        mechStressEl.style.color = vib > 2.2 ? 'var(--color-critical)' : (vib > 1.6 ? 'var(--color-warning)' : 'var(--color-nominal)');
      }
      if (lubStressEl) {
        lubStressEl.innerText = s.oil_temp_c > 118 ? 'Caution (Thin Viscosity)' : 'Nominal (Film Integrity 99%)';
        lubStressEl.style.color = s.oil_temp_c > 118 ? 'var(--color-warning)' : 'var(--color-nominal)';
      }
    }
  }
}

window.HealthView = HealthView;
