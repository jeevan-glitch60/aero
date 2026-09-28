/**
 * Scenarios Tab Controller: What-If Simulation Engine
 * Features: Altitude & Temperature delta sliders, mission profile selector,
 * advanced fault injection toggles, synchronized Baseline (blue) vs Scenario (orange)
 * comparative chart with differential shading, impact stress indices, and operational recommendations.
 */

class ScenariosView {
  constructor() {
    this.comparisonChart = null;
    this.initChart();
    this.initEvents();
    this.runSimulation();
  }

  initChart() {
    this.comparisonChart = new AeroTwinChart('scenario-comparison-chart-canvas', {
      leftUnit: '°C',
      leftMin: 80,
      leftMax: 160,
      diffFill: {
        seriesA: 'scen_cht',
        seriesB: 'base_cht',
        color: 'rgba(245, 158, 11, 0.22)',
      },
      maxPoints: 80,
    });

    // Baseline series (Blue)
    this.comparisonChart.addSeries({
      id: 'base_cht',
      label: 'Baseline CHT',
      color: '#06b6d4',
      axis: 'left',
      lineWidth: 2.0,
    });

    // Scenario series (Orange)
    this.comparisonChart.addSeries({
      id: 'scen_cht',
      label: 'Scenario CHT',
      color: '#f97316',
      axis: 'left',
      lineWidth: 2.2,
    });

    // Seed initial comparison curve
    const seed = [];
    for (let i = 0; i <= 30; i++) {
      const t = i * 3;
      const b = 104 + Math.sin(t / 15) * 8;
      const s = b + 12 + (i > 10 ? (i - 10) * 0.4 : 0);
      seed.push({
        time: t,
        timestamp_str: `T+${t}m`,
        base_cht: Math.round(b * 10) / 10,
        scen_cht: Math.round(s * 10) / 10,
      });
    }
    this.comparisonChart.setData(seed);
  }

  initEvents() {
    const altSlider = document.getElementById('scen-slider-alt');
    const tempSlider = document.getElementById('scen-slider-temp');
    const pumpDegradation = document.getElementById('scen-slider-oil-pump');
    const profileSelect = document.getElementById('scen-select-profile');
    const injSelect = document.getElementById('scen-select-inj-clog');

    const updateReadouts = () => {
      const altVal = parseFloat(altSlider ? altSlider.value : 0);
      const tempVal = parseFloat(tempSlider ? tempSlider.value : 0);
      const pumpVal = parseFloat(pumpDegradation ? pumpDegradation.value : 0);

      const altTxt = document.getElementById('scen-readout-alt');
      const tempTxt = document.getElementById('scen-readout-temp');
      const pumpTxt = document.getElementById('scen-readout-oil-pump');

      if (altTxt) altTxt.innerText = `${altVal >= 0 ? '+' : ''}${altVal.toFixed(0)} ft`;
      if (tempTxt) tempTxt.innerText = `${tempVal >= 0 ? '+' : ''}${tempVal.toFixed(1)}°C`;
      if (pumpTxt) pumpTxt.innerText = `-${pumpVal.toFixed(0)}%`;
    };

    if (altSlider) altSlider.addEventListener('input', updateReadouts);
    if (tempSlider) tempSlider.addEventListener('input', updateReadouts);
    if (pumpDegradation) pumpDegradation.addEventListener('input', updateReadouts);

    // Apply Button
    const applyBtn = document.getElementById('scen-btn-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.runSimulation());
    }

    // Reset Button
    const resetBtn = document.getElementById('scen-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (altSlider) altSlider.value = 0;
        if (tempSlider) tempSlider.value = 0;
        if (pumpDegradation) pumpDegradation.value = 0;
        if (profileSelect) profileSelect.value = 'endurance';
        if (injSelect) injSelect.value = 'none';
        updateReadouts();
        this.runSimulation();
      });
    }

    // Save Scenario
    const saveBtn = document.getElementById('scen-btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const name = prompt('Enter Scenario Name:', 'Hot-High-Endurance-Alpha');
        if (name) {
          alert(`Scenario '${name}' saved to Digital Twin scenario library.`);
        }
      });
    }
  }

  async runSimulation() {
    const altSlider = document.getElementById('scen-slider-alt');
    const tempSlider = document.getElementById('scen-slider-temp');
    const pumpDegradation = document.getElementById('scen-slider-oil-pump');
    const profileSelect = document.getElementById('scen-select-profile');
    const injSelect = document.getElementById('scen-select-inj-clog');

    const payload = {
      altitude_delta_ft: altSlider ? parseFloat(altSlider.value) : 0,
      ambient_temp_delta_c: tempSlider ? parseFloat(tempSlider.value) : 0,
      oil_pump_degradation_pct: pumpDegradation ? parseFloat(pumpDegradation.value) : 0,
      mission_profile: profileSelect ? profileSelect.value : 'endurance',
      injector_clogging: injSelect ? injSelect.value : 'none',
      sensor_drift_cht: 0.0,
      sensor_drift_egt: 0.0,
    };

    try {
      const res = await fetch('/api/scenarios/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        this.renderResults(data);
      }
    } catch (e) {
      console.error('Scenario simulation error:', e);
    }
  }

  renderResults(data) {
    const times = data.time_points_min;
    const base = data.baseline;
    const scen = data.scenario;
    const sum = data.summary;

    // 1. Plot comparison data
    const chartPts = times.map((t, idx) => ({
      time: t,
      timestamp_str: `T+${t}m`,
      base_cht: base.cht[idx],
      scen_cht: scen.cht[idx],
    }));
    this.comparisonChart.setData(chartPts);

    // 2. Center Panel Callout Annotations
    const annotCht = document.getElementById('scen-annot-cht');
    const annotRul = document.getElementById('scen-annot-rul');
    const annotSurge = document.getElementById('scen-annot-surge');

    if (annotCht) annotCht.innerText = `Peak CHT ${sum.peak_cht_delta_c >= 0 ? '+' : ''}${sum.peak_cht_delta_c}°C`;
    if (annotRul) annotRul.innerText = `Δ RUL ${sum.delta_rul_hours >= 0 ? '+' : ''}${sum.delta_rul_hours}h (${sum.delta_rul_pct}%)`;
    if (annotSurge) {
      const surgeMargin = sum.thermal_stress_pct > 15 ? 8 : (sum.thermal_stress_pct > 5 ? 14 : 22);
      annotSurge.innerText = `Surge Margin 22% → ${surgeMargin}%`;
      annotSurge.style.borderColor = surgeMargin < 12 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(245, 158, 11, 0.7)';
      annotSurge.style.color = surgeMargin < 12 ? '#ef4444' : '#f59e0b';
    }

    // 3. Right Panel Impact Summary
    const baseRulEl = document.getElementById('scen-sum-base-rul');
    const scenRulEl = document.getElementById('scen-sum-scen-rul');
    const deltaRulEl = document.getElementById('scen-sum-delta-rul');

    if (baseRulEl) baseRulEl.innerText = `${Math.round(sum.baseline_rul_hours)} h`;
    if (scenRulEl) scenRulEl.innerText = `${Math.round(sum.scenario_rul_hours)} h`;
    if (deltaRulEl) {
      deltaRulEl.innerText = `${sum.delta_rul_hours} h (${sum.delta_rul_pct}%)`;
      deltaRulEl.style.color = sum.delta_rul_hours < 0 ? 'var(--color-critical)' : 'var(--color-nominal)';
    }

    // Stress Indices
    const thStressEl = document.getElementById('scen-stress-thermal');
    const mechStressEl = document.getElementById('scen-stress-mechanical');
    const lubStressEl = document.getElementById('scen-stress-lubrication');

    if (thStressEl) thStressEl.innerText = `${sum.thermal_stress_pct >= 0 ? '+' : ''}${sum.thermal_stress_pct}%`;
    if (mechStressEl) mechStressEl.innerText = `${sum.mechanical_stress_pct >= 0 ? '+' : ''}${sum.mechanical_stress_pct}%`;
    if (lubStressEl) lubStressEl.innerText = `${sum.lubrication_stress_pct >= 0 ? '+' : ''}${sum.lubrication_stress_pct}%`;

    // Recommendations
    const recList = document.getElementById('scen-recommendations-list');
    if (recList && sum.recommendations) {
      recList.innerHTML = sum.recommendations.map(r => `<li><span style="color: var(--color-warning); margin-right: 6px;">&#9888;</span> ${r}</li>`).join('');
    }
  }
}

window.ScenariosView = ScenariosView;
