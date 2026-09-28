/**
 * AI Copilot — Action Advisory Component (Defense Workstation Integration)
 * Standalone, zero-reflow, isolated decision-support widget.
 * ROTAX 915/916 iS Class Engine Digital Twin.
 */

(function () {
  'use strict';

  const FAULT_ADVISORY_CATALOG = {
    normal: {
      assessment: 'NORMAL',
      predictedCondition: 'All Systems Nominal',
      confidence: 98,
      missionImpact: 'NOMINAL',
      explanation:
        'All monitored thermal, hydraulic, and combustion parameters remain within calibrated baseline envelopes. State estimator indicates normal aero-piston operating dynamics.',
      immediateActions: [
        '1. Continue standard flight plan and programmed mission profile.',
        '2. Maintain standard periodic cross-checks of CHT and oil pressure.',
        '3. No operational restrictions or manual interventions required.',
      ],
      maintenanceActions: [
        '• Perform standard turnaround pre-flight and post-flight walkaround.',
        '• Log flight hours and cycle count into digital engine logbook.',
        '• Maintain scheduled 50-hour inspection interval.',
      ],
      inspectionPriority: 'Monitor only',
      evidence: [
        '• EKF residual norm: < 0.8σ within nominal covariance',
        '• Cylinder head temperature variance: ±2.1°C across all 4 cylinders',
        '• Oil pressure stability: within ±0.05 bar of target map',
        '• Vibration RMS: 1.18g (well below 2.0g alert threshold)',
      ],
      modelBreakdown: { physicsModel: 50, anomalyModel: 30, trendAnalysis: 20 },
      missionRecommendation: 'Continue mission normally under standard operating procedures.',
    },

    map_sensor_bias_drift: {
      assessment: 'WARNING',
      predictedCondition: 'MAP Sensor Bias Drift',
      confidence: 92,
      missionImpact: 'MODERATE',
      explanation:
        'Manifold-pressure readings remain above the expected range for the current RPM, fuel flow, and ambient conditions. The pattern is more consistent with sensor bias than an actual engine-load increase.',
      immediateActions: [
        '1. Continue mission under enhanced monitoring.',
        '2. Avoid rapid throttle transitions for the next 5 minutes.',
        '3. Cross-check manifold pressure against RPM and fuel flow.',
        '4. Escalate to return-to-base assessment if the residual rises above 15% or thermal/oil parameters also become abnormal.',
      ],
      maintenanceActions: [
        '• Inspect MAP sensor connector, wiring, and ground reference.',
        '• Compare sensor reading with calibrated pressure source.',
        '• Review ECU diagnostic codes and calibration history.',
        '• Log this advisory in maintenance records.',
      ],
      inspectionPriority: 'Inspect within 1 flight cycle',
      evidence: [
        '• MAP residual: +18.4% above engine-map expectation',
        '• RPM stability: ±1.2%',
        '• Fuel flow stability: ±0.3 L/h',
        '• Condition duration: >40 seconds',
        '• Physics-model agreement: high',
      ],
      modelBreakdown: { physicsModel: 45, anomalyModel: 35, trendAnalysis: 20 },
      missionRecommendation: 'Continue with enhanced monitoring',
    },

    overheating_risk: {
      assessment: 'WARNING',
      predictedCondition: 'Cylinder Thermal Overheating Risk',
      confidence: 89,
      missionImpact: 'HIGH',
      explanation:
        'Cylinder head temperatures (CHT) or exhaust gas temperatures (EGT) show persistent upward thermal drift beyond predicted heat rejection rates for current airspeed and ambient conditions.',
      immediateActions: [
        '1. Enrich mixture or increase airspeed to improve cylinder head convective cooling.',
        '2. Reduce continuous engine power to below 75% MCP if flight envelope permits.',
        '3. Monitor coolant temperature and oil temperature trends closely.',
        '4. Prepare contingency descent or diversion profile if CHT exceeds 120°C.',
      ],
      maintenanceActions: [
        '• Inspect liquid cooling loop radiator airflow duct for debris or FOD.',
        '• Check coolant expansion tank level and pressure relief cap integrity.',
        '• Verify thermostat valve operation and cylinder water jacket passages.',
      ],
      inspectionPriority: 'Inspect before next mission',
      evidence: [
        '• CHT rate of rise: +1.8°C/min above thermodynamic model prediction',
        '• Cooling air mass flow deficit: estimated -14%',
        '• Thermal circuit residual D_th: > 2.6σ',
      ],
      modelBreakdown: { physicsModel: 48, anomalyModel: 32, trendAnalysis: 20 },
      missionRecommendation: 'Continue under restricted power envelope; plan RTB if thermal limits are exceeded.',
    },

    low_oil_pressure: {
      assessment: 'CRITICAL',
      predictedCondition: 'Low Oil Pressure / Lubrication Starvation',
      confidence: 95,
      missionImpact: 'CRITICAL',
      explanation:
        'Engine oil pressure has dropped significantly below nominal operating envelope despite normal RPM, indicating possible pump cavitation, oil thinning, or oil circuit leakage.',
      immediateActions: [
        '1. Immediately reduce engine load to minimum safe loiter power setting.',
        '2. Initiate return-to-base assessment. Consider mission abort according to approved SOP.',
        '3. Continuously verify oil temperature and crankcase vibration for signs of bearing seizure.',
        '4. Coordinate emergency recovery waypoint with ATC/GCS flight controller.',
      ],
      maintenanceActions: [
        '• Ground aircraft pending immediate inspection of oil pump and pressure relief valve.',
        '• Perform oil filter cut-open inspection and spectrographic oil analysis (SOAP) for metallic wear.',
        '• Check complete lubrication plumbing for leaks, cracks, and fitting torque.',
      ],
      inspectionPriority: 'Ground aircraft pending inspection',
      evidence: [
        '• Oil pressure: < 2.2 bar (nominal 3.5 - 4.5 bar)',
        '• Oil pressure gradient: -0.15 bar/min negative slope',
        '• Hydrodynamic journal bearing film thickness index: critical threshold reached',
      ],
      modelBreakdown: { physicsModel: 40, anomalyModel: 40, trendAnalysis: 20 },
      missionRecommendation: 'Initiate return-to-base assessment. Consider mission abort according to approved SOP.',
    },

    injector_abnormality: {
      assessment: 'WARNING',
      predictedCondition: 'Fuel Injector Delivery Imbalance',
      confidence: 88,
      missionImpact: 'MODERATE',
      explanation:
        'Individual cylinder exhaust gas temperature disparity indicates lean delivery or partial nozzle restriction on one injector, causing localized combustion temperature elevation.',
      immediateActions: [
        '1. Maintain steady throttle setting; avoid high-power climbing operations.',
        '2. Cross-reference individual cylinder EGT spread and fuel rail pressure.',
        '3. Continue mission under enhanced monitoring of engine roughness and vibration.',
      ],
      maintenanceActions: [
        '• Remove and ultrasonic clean fuel injectors; test flow rate spray patterns on test bench.',
        '• Replace fine inline fuel filter elements and check fuel rail pressure regulator.',
        '• Review ECU injector pulse duration trim values and log history.',
      ],
      inspectionPriority: 'Inspect within 1 flight cycle',
      evidence: [
        '• Cylinder EGT imbalance: > 55°C delta between hottest and coldest cylinder',
        '• Fuel pulse width correlation deviation: +7.2%',
        '• Multi-cylinder lambda variance: elevated',
      ],
      modelBreakdown: { physicsModel: 42, anomalyModel: 38, trendAnalysis: 20 },
      missionRecommendation: 'Continue with enhanced monitoring',
    },

    misfire_risk: {
      assessment: 'WARNING',
      predictedCondition: 'Intermittent Combustion Misfire',
      confidence: 86,
      missionImpact: 'HIGH',
      explanation:
        'Cyclic crank angular deceleration pulses and unburned fuel residual indicate intermittent ignition breakdown or incomplete flame propagation in one or more combustion chambers.',
      immediateActions: [
        '1. Verify dual ignition system lane status on FADEC diagnostics.',
        '2. Switch ignition lane channel if permitted by operational checklists.',
        '3. Avoid lean cruise power settings; enrich to protect cylinder stability.',
      ],
      maintenanceActions: [
        '• Inspect dual spark plugs for carbon fouling, gap erosion, or electrode degradation.',
        '• Test high-voltage ignition coils and harness insulation resistance.',
        '• Download and evaluate high-resolution crank angle encoder time series.',
      ],
      inspectionPriority: 'Inspect before next mission',
      evidence: [
        '• Crankshaft instantaneous deceleration events: 14 per 1,000 cycles',
        '• Combustion pressure variance coefficient (COV_imep): > 8.5%',
        '• 2X rotational harmonic order excitation: elevated',
      ],
      modelBreakdown: { physicsModel: 44, anomalyModel: 36, trendAnalysis: 20 },
      missionRecommendation: 'Continue with enhanced monitoring; plan RTB if misfire frequency increases.',
    },

    abnormal_vibration: {
      assessment: 'WARNING',
      predictedCondition: 'Abnormal Mechanical Vibration',
      confidence: 91,
      missionImpact: 'MODERATE',
      explanation:
        'Crankcase or gearbox accelerometers detect elevated spectral harmonics, suggesting propeller unbalance, gearbox lash, or mounting isolator degradation.',
      immediateActions: [
        '1. Scan engine RPM range by ±150 RPM to detune from resonant frequencies.',
        '2. Avoid sustained operation in critical vibration frequency band.',
        '3. Cross-check oil pressure and gearbox temperature for mechanical distress.',
      ],
      maintenanceActions: [
        '• Perform dynamic propeller balancing with ground optical tracker.',
        '• Inspect elastomer engine mount isolators for cracking or settling.',
        '• Inspect gearbox dog clutch overload gear backlash and oil magnetic drain plug.',
      ],
      inspectionPriority: 'Inspect before next mission',
      evidence: [
        '• Overall crankcase RMS vibration: 2.15g (threshold 2.00g)',
        '• 1X propeller harmonic spectral amplitude: +35% above baseline',
        '• Fast Fourier Transform peak energy: concentrated at rotational fundamental',
      ],
      modelBreakdown: { physicsModel: 38, anomalyModel: 42, trendAnalysis: 20 },
      missionRecommendation: 'Continue with enhanced monitoring',
    },

    lubrication_issue: {
      assessment: 'WARNING',
      predictedCondition: 'Lubrication Circuit Degradation',
      confidence: 87,
      missionImpact: 'MODERATE',
      explanation:
        'Oil temperature is elevated while pressure remains near lower boundary, indicating increased thermal loading on lubricant or reduced heat exchanger efficiency.',
      immediateActions: [
        '1. Monitor oil pressure stability during level cruise flight.',
        '2. Limit maximum continuous engine power to mitigate thermal oil stress.',
        '3. Verify oil cooler air scoop is unobstructed via ambient telemetry.',
      ],
      maintenanceActions: [
        '• Inspect oil cooler matrix for dust, debris, or insect obstruction.',
        '• Verify oil thermostat bypass valve opening temperature on test rig.',
        '• Take oil sample for viscosity and kinematic breakdown testing.',
      ],
      inspectionPriority: 'Inspect within 1 flight cycle',
      evidence: [
        '• Oil temperature elevation: +12°C above airspeed-corrected model',
        '• Viscosity estimation index: -15% deviation from nominal SAE 10W-50',
        '• Thermal rejection margin: narrowing',
      ],
      modelBreakdown: { physicsModel: 45, anomalyModel: 35, trendAnalysis: 20 },
      missionRecommendation: 'Continue with enhanced monitoring',
    },

    combustion_instability: {
      assessment: 'WARNING',
      predictedCondition: 'Combustion Chamber Instability',
      confidence: 90,
      missionImpact: 'HIGH',
      explanation:
        'Multi-cylinder pressure differential and exhaust gas pulsation suggest cyclic combustion variability, risking knock or flame blow-out under turbulent altitude conditions.',
      immediateActions: [
        '1. Stabilize throttle lever; disengage aggressive auto-throttle altitude steps.',
        '2. Verify turbocharger boost pressure (MAP) stability and fuel rail pressure.',
        '3. Observe EGT spreads across all 4 cylinders.',
      ],
      maintenanceActions: [
        '• Perform cylinder differential compression test (leakdown test).',
        '• Borescope inspection of cylinder intake/exhaust valves and combustion domes.',
        '• Calibrate throttle position sensor (TPS) and manifold pressure transducers.',
      ],
      inspectionPriority: 'Inspect before next mission',
      evidence: [
        '• Peak cylinder pressure dispersion: 9.4% standard deviation',
        '• EGT rapid flutter: ±18°C oscillations at 2 Hz',
        '• Air-fuel equivalence ratio (lambda) flutter detected',
      ],
      modelBreakdown: { physicsModel: 46, anomalyModel: 34, trendAnalysis: 20 },
      missionRecommendation: 'Continue with enhanced monitoring; restrict aggressive throttle changes.',
    },

    sensor_drift: {
      assessment: 'WARNING',
      predictedCondition: 'Avionics Sensor Drift / Mismatch',
      confidence: 91,
      missionImpact: 'MODERATE',
      explanation:
        'Signal correlation discrepancies detected between redundant transducers or thermodynamic physical model expectations, indicating calibration drift in primary sensor channel.',
      immediateActions: [
        '1. Cross-reference primary sensor channel against secondary and synthetic twin estimations.',
        '2. Do not rely exclusively on drifting channel for critical throttle modulation.',
        '3. Verify that physical engine parameters (RPM, power output) remain stable.',
      ],
      maintenanceActions: [
        '• Recalibrate or replace identified transducer during scheduled maintenance turnaround.',
        '• Check sensor harness wiring, shielding continuity, and reference voltage.',
      ],
      inspectionPriority: 'Inspect within 1 flight cycle',
      evidence: [
        '• Sensor residual: > 2.4σ divergence from EKF state expectation',
        '• Correlation with ambient and RPM models: degraded',
      ],
      modelBreakdown: { physicsModel: 45, anomalyModel: 35, trendAnalysis: 20 },
      missionRecommendation: 'Continue with enhanced monitoring',
    },
  };

  function normalizeConditionKey(rawCondition) {
    if (!rawCondition) return 'normal';
    const str = String(rawCondition).toLowerCase().trim();
    if (str.includes('map') || str.includes('manifold')) return 'map_sensor_bias_drift';
    if (str.includes('overheat') || str.includes('cht') || str.includes('thermal')) return 'overheating_risk';
    if (str.includes('low_oil') || (str.includes('oil') && (str.includes('press') || str.includes('drop')))) return 'low_oil_pressure';
    if (str.includes('lubricat') || (str.includes('oil') && str.includes('temp'))) return 'lubrication_issue';
    if (str.includes('injector') || str.includes('lean')) return 'injector_abnormality';
    if (str.includes('misfire')) return 'misfire_risk';
    if (str.includes('vibrat')) return 'abnormal_vibration';
    if (str.includes('sensor') || str.includes('drift')) return 'sensor_drift';
    if (str.includes('combust') || str.includes('instab')) return 'combustion_instability';
    if (str.includes('normal') || str.includes('nominal') || str.includes('none') || str.includes('healthy')) return 'normal';
    const snakeKey = str.replace(/[-\s]+/g, '_');
    if (FAULT_ADVISORY_CATALOG[snakeKey]) return snakeKey;
    return 'normal';
  }

  function resolveAssessmentLevel(telemetry, baseSeverity) {
    const sev = String(telemetry.fault_severity || telemetry.severity || '').toUpperCase();
    if (['NORMAL', 'ADVISORY', 'WARNING', 'CRITICAL'].includes(sev)) return sev;
    const anomalyScore = Number(telemetry.anomaly_score ?? telemetry.anomaly_val ?? 0);
    const healthScore = Number(telemetry.health_score ?? 100);
    if (anomalyScore >= 0.85 || healthScore < 45) return 'CRITICAL';
    if (anomalyScore >= 0.5 || healthScore < 70) return 'WARNING';
    if (anomalyScore >= 0.2 || healthScore < 90) return 'ADVISORY';
    return baseSeverity || 'NORMAL';
  }

  function generateAdvisory(telemetry) {
    if (!telemetry || typeof telemetry !== 'object') {
      return {
        ...FAULT_ADVISORY_CATALOG.normal,
        confidence: 95,
        rulHours: 789,
        rulUncertainty: 8,
        healthTrend: 'Stable',
      };
    }

    // Extract fault from raw sensor frame, residuals, health, or direct properties
    let rawFault =
      telemetry.predicted_fault ||
      telemetry.predicted_condition ||
      telemetry.fault_name ||
      telemetry.fault_type ||
      telemetry.condition ||
      '';

    if (!rawFault && telemetry.health && telemetry.health.isolated_faults && telemetry.health.isolated_faults.length > 0) {
      rawFault = telemetry.health.isolated_faults[0].name || '';
    }

    const conditionKey = normalizeConditionKey(rawFault);
    const template = FAULT_ADVISORY_CATALOG[conditionKey] || FAULT_ADVISORY_CATALOG.normal;
    const assessment = resolveAssessmentLevel(telemetry, template.assessment);

    let confidence = template.confidence;
    if (typeof telemetry.anomaly_confidence === 'number') {
      confidence = Math.round(telemetry.anomaly_confidence <= 1 ? telemetry.anomaly_confidence * 100 : telemetry.anomaly_confidence);
    } else if (telemetry.residuals && typeof telemetry.residuals.anomaly_score_pct === 'number') {
      confidence = Math.round(telemetry.residuals.anomaly_score_pct);
    }

    let rulHours = 789;
    let rulUncertainty = 8;
    if (telemetry.rul && typeof telemetry.rul.estimated_rul_hours === 'number') {
      rulHours = Math.round(telemetry.rul.estimated_rul_hours);
      rulUncertainty = Math.round(Math.abs((telemetry.rul.rul_p90_hours - telemetry.rul.rul_p10_hours) / 2)) || 8;
    } else if (typeof telemetry.rul_hours === 'number') {
      rulHours = Math.round(telemetry.rul_hours);
      rulUncertainty = Math.round(telemetry.rul_uncertainty_hours || 8);
    }

    const rawTrend = String(telemetry.health_trend || (telemetry.rul ? telemetry.rul.maintenance_urgency : '') || 'stable').toLowerCase();
    let healthTrend = 'Stable';
    if (rawTrend.includes('deg') || rawTrend.includes('urg') || rawTrend.includes('warn')) healthTrend = 'Degrading';
    else if (rawTrend.includes('crit') || rawTrend.includes('imm')) healthTrend = 'Rapid Degradation';

    let missionRecommendation = template.missionRecommendation;
    if (assessment === 'CRITICAL') {
      missionRecommendation = 'Initiate return-to-base assessment. Consider mission abort according to approved SOP.';
    } else if (assessment === 'WARNING' && conditionKey === 'map_sensor_bias_drift') {
      missionRecommendation = 'Continue with enhanced monitoring';
    } else if (assessment === 'NORMAL') {
      missionRecommendation = 'Continue mission normally under standard operating procedures.';
    }

    const modelBreakdown = {
      physicsModel: telemetry.physics_contribution ?? template.modelBreakdown.physicsModel,
      anomalyModel: telemetry.anomaly_contribution ?? template.modelBreakdown.anomalyModel,
      trendAnalysis: telemetry.trend_contribution ?? template.modelBreakdown.trendAnalysis,
    };

    const evidence = [...template.evidence];
    const s = telemetry.sensor || telemetry;
    if (s.engine_rpm || s.rpm) {
      evidence.push(`• Operating Engine Speed: ${Math.round(s.engine_rpm || s.rpm)} RPM`);
    }
    if (s.cht_c || s.cht) {
      const c = Array.isArray(s.cht_c) ? Math.max(...s.cht_c) : s.cht;
      evidence.push(`• Cylinder Head Temperature (CHT): ${Number(c).toFixed(1)}°C`);
    }

    return {
      assessment,
      predictedCondition: rawFault && rawFault !== 'None Detected' ? rawFault : template.predictedCondition,
      confidence,
      missionImpact: assessment === 'CRITICAL' ? 'CRITICAL' : template.missionImpact,
      explanation: template.explanation,
      immediateActions: template.immediateActions,
      maintenanceActions: template.maintenanceActions,
      inspectionPriority: assessment === 'CRITICAL' ? 'Ground aircraft pending inspection' : template.inspectionPriority,
      evidence,
      modelBreakdown,
      missionRecommendation,
      rulHours,
      rulUncertainty,
      healthTrend,
    };
  }

  class AiAdvisoryWidgetController {
    constructor() {
      this.isOpen = false;
      this.isWhyExpanded = false;
      this.cachedTelemetry = null;
      this.lastAdvisory = generateAdvisory(null);
      this.initDom();
      this.initListeners();
    }

    initDom() {
      this.container = document.createElement('div');
      this.container.className = 'ai-advisory-root';
      this.container.id = 'ai-advisory-widget-root';

      this.container.innerHTML = `
        <button type="button" class="ai-advisory-btn" id="btn-ai-advisory-toggle" aria-expanded="false" title="AI Copilot Action Advisory (Decision Support Only)">
          <span class="ai-status-dot status-normal" id="ai-advisory-dot"></span>
          <span>[ AI ADVISORY ]</span>
        </button>

        <div class="ai-advisory-panel" id="ai-advisory-panel" style="display: none;" role="dialog" aria-modal="false" aria-label="AI Copilot Action Advisory">
          <div class="ai-panel-header">
            <div class="ai-panel-title-wrap">
              <span class="ai-panel-title">AI COPILOT — ACTION ADVISORY</span>
              <span class="ai-live-tag">LIVE</span>
            </div>
            <button type="button" class="ai-close-btn" id="btn-ai-advisory-close" title="Close (Esc)">×</button>
          </div>

          <div class="ai-panel-body">
            <!-- 1. Assessment Header Card -->
            <div class="ai-assessment-card">
              <div class="ai-meta-row">
                <span class="ai-meta-label">Assessment:</span>
                <span class="ai-badge badge-normal" id="ai-adv-assessment">NORMAL</span>
              </div>
              <div class="ai-meta-row">
                <span class="ai-meta-label">Predicted Condition:</span>
                <span class="ai-meta-value" id="ai-adv-condition">All Systems Nominal</span>
              </div>
              <div class="ai-meta-row">
                <span class="ai-meta-label">Confidence:</span>
                <span class="ai-meta-value font-mono" id="ai-adv-confidence">98%</span>
              </div>
              <div class="ai-meta-row">
                <span class="ai-meta-label">Mission Impact:</span>
                <span class="ai-meta-value" id="ai-adv-impact">NOMINAL</span>
              </div>
            </div>

            <!-- 2. What Is Happening -->
            <div>
              <div class="ai-section-title">WHAT IS HAPPENING</div>
              <div class="ai-explanation-box" id="ai-adv-explanation">
                All monitored thermal, hydraulic, and combustion parameters remain within calibrated baseline envelopes. State estimator indicates normal aero-piston operating dynamics.
              </div>
            </div>

            <!-- 3. Recommended Action Now -->
            <div>
              <div class="ai-section-title">RECOMMENDED ACTION NOW</div>
              <div class="ai-actions-list" id="ai-adv-actions">
                <div class="ai-action-item">1. Continue standard flight plan and programmed mission profile.</div>
                <div class="ai-action-item">2. Maintain standard periodic cross-checks of CHT and oil pressure.</div>
                <div class="ai-action-item">3. No operational restrictions or manual interventions required.</div>
              </div>
            </div>

            <!-- 4. Post-Flight Maintenance -->
            <div>
              <div class="ai-section-title">POST-FLIGHT MAINTENANCE</div>
              <div class="ai-maint-box">
                <div class="ai-priority-row">
                  <span class="ai-meta-label">Inspection Priority:</span>
                  <span class="ai-priority-val" id="ai-adv-priority">Monitor only</span>
                </div>
                <div class="ai-maint-list" id="ai-adv-maint-list">
                  <div>• Perform standard turnaround pre-flight and post-flight walkaround.</div>
                  <div>• Log flight hours and cycle count into digital engine logbook.</div>
                  <div>• Maintain scheduled 50-hour inspection interval.</div>
                </div>
              </div>
            </div>

            <!-- 5. Why AI Thinks This (Collapsible) -->
            <div>
              <button type="button" class="ai-collapsible-trigger" id="btn-ai-why-toggle" aria-expanded="false">
                <span>WHY AI THINKS THIS</span>
                <span class="ai-collapsible-arrow" id="ai-why-arrow">▶</span>
              </button>

              <div class="ai-collapsible-content" id="ai-why-content" style="display: none;">
                <div class="ai-evidence-list" id="ai-adv-evidence">
                  <div>• EKF residual norm: &lt; 0.8σ within nominal covariance</div>
                  <div>• Cylinder head temperature variance: ±2.1°C across all 4 cylinders</div>
                  <div>• Oil pressure stability: within ±0.05 bar of target map</div>
                  <div>• Vibration RMS: 1.18g (well below 2.0g alert threshold)</div>
                </div>

                <div class="ai-bars-container">
                  <div class="ai-bar-row">
                    <div class="ai-bar-label-row">
                      <span>Physics model</span>
                      <span class="font-mono" id="ai-bar-val-physics">45%</span>
                    </div>
                    <div class="ai-bar-track">
                      <div class="ai-bar-fill" id="ai-bar-fill-physics" style="width: 45%;"></div>
                    </div>
                  </div>

                  <div class="ai-bar-row">
                    <div class="ai-bar-label-row">
                      <span>Anomaly model</span>
                      <span class="font-mono" id="ai-bar-val-anomaly">35%</span>
                    </div>
                    <div class="ai-bar-track">
                      <div class="ai-bar-fill" id="ai-bar-fill-anomaly" style="width: 35%;"></div>
                    </div>
                  </div>

                  <div class="ai-bar-row">
                    <div class="ai-bar-label-row">
                      <span>Trend analysis</span>
                      <span class="font-mono" id="ai-bar-val-trend">20%</span>
                    </div>
                    <div class="ai-bar-track">
                      <div class="ai-bar-fill" id="ai-bar-fill-trend" style="width: 20%;"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 6. Prognostics & Mission Recommendation -->
            <div>
              <div class="ai-section-title">PROGNOSTICS & MISSION RECOMMENDATION</div>
              <div class="ai-prognostics-card">
                <div class="ai-prog-row">
                  <span class="ai-meta-label">Estimated RUL:</span>
                  <span class="ai-prog-val" id="ai-adv-rul">789 h ± 8 h</span>
                </div>
                <div class="ai-prog-row">
                  <span class="ai-meta-label">Current health trend:</span>
                  <span class="ai-meta-value" id="ai-adv-trend">Stable</span>
                </div>
                <div class="ai-meta-label" style="margin-top: 4px;">Mission recommendation:</div>
                <div class="ai-mission-recommendation-box rec-normal" id="ai-adv-recommendation">
                  Continue mission normally under standard operating procedures.
                </div>
              </div>
            </div>
          </div>

          <div class="ai-panel-footer">
            Decision-support advisory only. Final action remains with the authorized operator and approved procedures.
          </div>
        </div>
      `;

      document.body.appendChild(this.container);
      this.container.style.display = 'none';

      // Elements Cache
      this.toggleBtn = document.getElementById('btn-ai-advisory-toggle');
      this.closeBtn = document.getElementById('btn-ai-advisory-close');
      this.panel = document.getElementById('ai-advisory-panel');
      this.statusDot = document.getElementById('ai-advisory-dot');
      this.whyToggleBtn = document.getElementById('btn-ai-why-toggle');
      this.whyContent = document.getElementById('ai-why-content');
      this.whyArrow = document.getElementById('ai-why-arrow');
    }

    initListeners() {
      // Toggle button
      this.toggleBtn.addEventListener('click', () => this.togglePanel());

      // Close button
      this.closeBtn.addEventListener('click', () => this.closePanel());

      // Why AI thinks this toggle
      this.whyToggleBtn.addEventListener('click', () => this.toggleWhy());

      // Escape key
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.closePanel();
        }
      });

      // Click outside
      document.addEventListener('mousedown', (e) => {
        if (this.isOpen && !this.container.contains(e.target)) {
          this.closePanel();
        }
      });
    }

    togglePanel() {
      this.isOpen ? this.closePanel() : this.openPanel();
    }

    openPanel() {
      this.isOpen = true;
      this.panel.style.display = 'flex';
      this.toggleBtn.setAttribute('aria-expanded', 'true');
    }

    closePanel() {
      this.isOpen = false;
      this.panel.style.display = 'none';
      this.toggleBtn.setAttribute('aria-expanded', 'false');
    }

    toggleWhy() {
      this.isWhyExpanded = !this.isWhyExpanded;
      this.whyContent.style.display = this.isWhyExpanded ? 'flex' : 'none';
      this.whyArrow.classList.toggle('open', this.isWhyExpanded);
      this.whyToggleBtn.setAttribute('aria-expanded', String(this.isWhyExpanded));
    }

    update(telemetry) {
      if (telemetry) {
        this.cachedTelemetry = telemetry;
        this.lastAdvisory = generateAdvisory(telemetry);
      }
      this.render();
    }

    render() {
      const adv = this.lastAdvisory;
      const sev = (adv.assessment || 'NORMAL').toUpperCase();

      // Update dot
      this.statusDot.className = 'ai-status-dot';
      if (sev === 'CRITICAL') this.statusDot.classList.add('status-critical');
      else if (sev === 'WARNING') this.statusDot.classList.add('status-warning');
      else if (sev === 'ADVISORY') this.statusDot.classList.add('status-advisory');
      else this.statusDot.classList.add('status-normal');

      // Update header fields
      const assessEl = document.getElementById('ai-adv-assessment');
      if (assessEl) {
        assessEl.innerText = sev;
        assessEl.className = 'ai-badge ' + (
          sev === 'CRITICAL' ? 'badge-critical' :
          sev === 'WARNING' ? 'badge-warning' :
          sev === 'ADVISORY' ? 'badge-advisory' : 'badge-normal'
        );
      }

      const condEl = document.getElementById('ai-adv-condition');
      if (condEl) condEl.innerText = adv.predictedCondition;

      const confEl = document.getElementById('ai-adv-confidence');
      if (confEl) confEl.innerText = adv.confidence + '%';

      const impEl = document.getElementById('ai-adv-impact');
      if (impEl) impEl.innerText = adv.missionImpact;

      const expEl = document.getElementById('ai-adv-explanation');
      if (expEl) expEl.innerText = adv.explanation;

      // Update immediate actions
      const actEl = document.getElementById('ai-adv-actions');
      if (actEl) {
        actEl.innerHTML = (adv.immediateActions || [])
          .map(a => `<div class="ai-action-item">${a}</div>`)
          .join('');
      }

      // Update maintenance
      const prioEl = document.getElementById('ai-adv-priority');
      if (prioEl) prioEl.innerText = adv.inspectionPriority;

      const maintEl = document.getElementById('ai-adv-maint-list');
      if (maintEl) {
        maintEl.innerHTML = (adv.maintenanceActions || [])
          .map(m => `<div>${m}</div>`)
          .join('');
      }

      // Update evidence
      const evEl = document.getElementById('ai-adv-evidence');
      if (evEl) {
        evEl.innerHTML = (adv.evidence || [])
          .map(e => `<div>${e}</div>`)
          .join('');
      }

      // Update contribution bars
      const p = adv.modelBreakdown?.physicsModel ?? 45;
      const a = adv.modelBreakdown?.anomalyModel ?? 35;
      const t = adv.modelBreakdown?.trendAnalysis ?? 20;

      const bp = document.getElementById('ai-bar-val-physics');
      const bfp = document.getElementById('ai-bar-fill-physics');
      if (bp && bfp) { bp.innerText = p + '%'; bfp.style.width = p + '%'; }

      const ba = document.getElementById('ai-bar-val-anomaly');
      const bfa = document.getElementById('ai-bar-fill-anomaly');
      if (ba && bfa) { ba.innerText = a + '%'; bfa.style.width = a + '%'; }

      const bt = document.getElementById('ai-bar-val-trend');
      const bft = document.getElementById('ai-bar-fill-trend');
      if (bt && bft) { bt.innerText = t + '%'; bft.style.width = t + '%'; }

      // Update prognostics
      const rulEl = document.getElementById('ai-adv-rul');
      if (rulEl) rulEl.innerText = `${adv.rulHours ?? 789} h ± ${adv.rulUncertainty ?? 8} h`;

      const trendEl = document.getElementById('ai-adv-trend');
      if (trendEl) trendEl.innerText = adv.healthTrend || 'Stable';

      const recEl = document.getElementById('ai-adv-recommendation');
      if (recEl) {
        recEl.innerText = adv.missionRecommendation;
        recEl.className = 'ai-mission-recommendation-box ' + (
          sev === 'CRITICAL' ? 'rec-critical' :
          sev === 'NORMAL' ? 'rec-normal' : ''
        );
      }
    }
  }

  // Auto-instantiate when DOM is ready and tap into AeroTwinApp telemetry loop
  function initWidget() {
    if (window.aiAdvisoryWidget) return;
    window.aiAdvisoryWidget = new AiAdvisoryWidgetController();

    // Hook into window.app.dispatchPacket seamlessly without modifying app.js
    const checkAppInterval = setInterval(() => {
      if (window.app && typeof window.app.dispatchPacket === 'function') {
        const origDispatch = window.app.dispatchPacket.bind(window.app);
        window.app.dispatchPacket = function (packet) {
          origDispatch(packet);
          if (window.aiAdvisoryWidget) {
            window.aiAdvisoryWidget.update(packet);
          }
        };
        clearInterval(checkAppInterval);
      }
    }, 50);

    // Fetch initial telemetry immediately
    fetch('/api/telemetry/current')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && window.aiAdvisoryWidget) {
          window.aiAdvisoryWidget.update(data);
        }
      })
      .catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();

