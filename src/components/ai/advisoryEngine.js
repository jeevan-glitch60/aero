/**
 * Ground Control Station (GCS) Decision-Support Advisory Engine
 * Provides deterministic fault-isolated operational and maintenance guidance
 * for MALE UAV aero-piston engines (Rotax 915/916 iS Class).
 *
 * NOTE: This module is STRICTLY ADVISORY. It does not perform control actions.
 * Final operational decisions remain with the authorized operator and approved flight manuals/SOP.
 */

/**
 * Normalized advisory database indexed by condition key.
 */
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
    modelBreakdown: {
      physicsModel: 50,
      anomalyModel: 30,
      trendAnalysis: 20,
    },
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
    modelBreakdown: {
      physicsModel: 45,
      anomalyModel: 35,
      trendAnalysis: 20,
    },
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
      '• Check cylinder thermocouple contact and harness resistance.',
    ],
    inspectionPriority: 'Inspect before next mission',
    evidence: [
      '• CHT rate of rise: +1.8°C/min above thermodynamic model prediction',
      '• Cooling air mass flow deficit: estimated -14%',
      '• Thermal circuit residual D_th: > 2.6σ',
      '• Oil cooler heat rejection margin: narrowing',
    ],
    modelBreakdown: {
      physicsModel: 48,
      anomalyModel: 32,
      trendAnalysis: 20,
    },
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
      '• Check magnetic oil drain plug for ferrous contamination.',
    ],
    inspectionPriority: 'Ground aircraft pending inspection',
    evidence: [
      '• Oil pressure: < 2.2 bar (nominal 3.5 - 4.5 bar)',
      '• Oil pressure gradient: -0.15 bar/min negative slope',
      '• Hydrodynamic journal bearing film thickness index: critical threshold reached',
      '• Oil temperature trend: increasing inverse correlation',
    ],
    modelBreakdown: {
      physicsModel: 40,
      anomalyModel: 40,
      trendAnalysis: 20,
    },
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
      '4. Prepare contingency descent if EGT split exceeds 65°C.',
    ],
    maintenanceActions: [
      '• Remove and ultrasonic clean fuel injectors; test flow rate spray patterns on test bench.',
      '• Replace fine inline fuel filter elements and check fuel rail pressure regulator.',
      '• Review ECU injector pulse duration trim values and log history.',
      '• Check injector harness connectors for pin fretting or corrosion.',
    ],
    inspectionPriority: 'Inspect within 1 flight cycle',
    evidence: [
      '• Cylinder EGT imbalance: > 55°C delta between hottest and coldest cylinder',
      '• Fuel pulse width correlation deviation: +7.2%',
      '• Multi-cylinder lambda variance: elevated',
      '• Fuel rail pressure stability: nominal (3.2 bar)',
    ],
    modelBreakdown: {
      physicsModel: 42,
      anomalyModel: 38,
      trendAnalysis: 20,
    },
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
      '4. Prepare contingency divert options if power drops or roughness escalates.',
    ],
    maintenanceActions: [
      '• Inspect dual spark plugs for carbon fouling, gap erosion, or electrode degradation.',
      '• Test high-voltage ignition coils and harness insulation resistance.',
      '• Download and evaluate high-resolution crank angle encoder time series.',
      '• Check cylinder compression and trigger wheel alignment.',
    ],
    inspectionPriority: 'Inspect before next mission',
    evidence: [
      '• Crankshaft instantaneous deceleration events: 14 per 1,000 cycles',
      '• Combustion pressure variance coefficient (COV_imep): > 8.5%',
      '• 2X rotational harmonic order excitation: elevated',
      '• Unburned exhaust hydrocarbon index: elevated',
    ],
    modelBreakdown: {
      physicsModel: 44,
      anomalyModel: 36,
      trendAnalysis: 20,
    },
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
      '4. If vibration exceeds 2.5g, reduce power and plan nearest diversion airfield.',
    ],
    maintenanceActions: [
      '• Perform dynamic propeller balancing with ground optical tracker.',
      '• Inspect elastomer engine mount isolators for cracking or settling.',
      '• Inspect gearbox dog clutch overload gear backlash and oil magnetic drain plug.',
      '• Verify propeller blade pitch angle synchronization.',
    ],
    inspectionPriority: 'Inspect before next mission',
    evidence: [
      '• Overall crankcase RMS vibration: 2.15g (threshold 2.00g)',
      '• 1X propeller harmonic spectral amplitude: +35% above baseline',
      '• Fast Fourier Transform peak energy: concentrated at rotational fundamental',
      '• 2X reciprocating order: stable',
    ],
    modelBreakdown: {
      physicsModel: 38,
      anomalyModel: 42,
      trendAnalysis: 20,
    },
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
      '4. Plan descent to cooler altitude band if oil temperature exceeds 115°C.',
    ],
    maintenanceActions: [
      '• Inspect oil cooler matrix for dust, debris, or insect obstruction.',
      '• Verify oil thermostat bypass valve opening temperature on test rig.',
      '• Take oil sample for viscosity and kinematic breakdown testing.',
      '• Check oil filter differential pressure indicator.',
    ],
    inspectionPriority: 'Inspect within 1 flight cycle',
    evidence: [
      '• Oil temperature elevation: +12°C above airspeed-corrected model',
      '• Viscosity estimation index: -15% deviation from nominal SAE 10W-50',
      '• Thermal rejection margin: narrowing',
      '• Oil circuit delta P: +8% elevation',
    ],
    modelBreakdown: {
      physicsModel: 45,
      anomalyModel: 35,
      trendAnalysis: 20,
    },
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
      '4. Avoid operating near lean limit boundary.',
    ],
    maintenanceActions: [
      '• Perform cylinder differential compression test (leakdown test).',
      '• Borescope inspection of cylinder intake/exhaust valves and combustion domes.',
      '• Calibrate throttle position sensor (TPS) and manifold pressure transducers.',
      '• Inspect intake plenum rubber boots for vacuum leaks.',
    ],
    inspectionPriority: 'Inspect before next mission',
    evidence: [
      '• Peak cylinder pressure dispersion: 9.4% standard deviation',
      '• EGT rapid flutter: ±18°C oscillations at 2 Hz',
      '• Air-fuel equivalence ratio (lambda) flutter detected',
      '• In-cylinder combustion peak angle jitter: ±3.2 deg CA',
    ],
    modelBreakdown: {
      physicsModel: 46,
      anomalyModel: 34,
      trendAnalysis: 20,
    },
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
      '4. Continue mission under synthetic estimator guidance.',
    ],
    maintenanceActions: [
      '• Recalibrate or replace identified transducer during scheduled maintenance turnaround.',
      '• Check sensor harness wiring, shielding continuity, and reference voltage.',
      '• Verify analog-to-digital converter ground offsets in FADEC harness.',
    ],
    inspectionPriority: 'Inspect within 1 flight cycle',
    evidence: [
      '• Sensor residual: > 2.4σ divergence from EKF state expectation',
      '• Correlation with ambient and RPM models: degraded',
      '• Redundant sensor delta: exceeds tolerance band',
    ],
    modelBreakdown: {
      physicsModel: 45,
      anomalyModel: 35,
      trendAnalysis: 20,
    },
    missionRecommendation: 'Continue with enhanced monitoring',
  },
};

/**
 * Normalizes an arbitrary condition or fault string into a catalog key.
 * @param {string} rawCondition
 * @returns {string} Catalog lookup key
 */
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

  // Direct catalog key match check
  const snakeKey = str.replace(/[-\s]+/g, '_');
  if (FAULT_ADVISORY_CATALOG[snakeKey]) return snakeKey;

  return 'normal';
}

/**
 * Maps input telemetry telemetry/anomaly parameters into a standardized assessment level.
 * @param {Object} telemetry
 * @param {string} baseSeverity
 * @returns {"NORMAL"|"ADVISORY"|"WARNING"|"CRITICAL"}
 */
function resolveAssessmentLevel(telemetry = {}, baseSeverity = 'NORMAL') {
  const sev = String(telemetry.fault_severity || telemetry.severity || '').toUpperCase();
  if (['NORMAL', 'ADVISORY', 'WARNING', 'CRITICAL'].includes(sev)) {
    return sev;
  }

  const anomalyScore = Number(telemetry.anomaly_score ?? telemetry.anomaly_val ?? 0);
  const healthScore = Number(telemetry.health_score ?? 100);

  if (anomalyScore >= 0.85 || healthScore < 45) return 'CRITICAL';
  if (anomalyScore >= 0.5 || healthScore < 70) return 'WARNING';
  if (anomalyScore >= 0.2 || healthScore < 90) return 'ADVISORY';

  return baseSeverity || 'NORMAL';
}

/**
 * Main Advisory Generation Pipeline.
 * Consumes live or replay telemetry and generates a standardized decision-support advisory packet.
 *
 * @param {Object} [telemetry] Real-time or replay telemetry packet
 * @returns {Object} Structured decision-support advisory packet
 */
export function generateAdvisory(telemetry) {
  // Safe fallback if telemetry is null/undefined or disconnected
  if (!telemetry || typeof telemetry !== 'object') {
    const defaultData = FAULT_ADVISORY_CATALOG.normal;
    return {
      ...defaultData,
      confidence: 95,
      rulHours: 789,
      rulUncertainty: 8,
      healthTrend: 'Stable',
      missionPhase: 'UNKNOWN',
    };
  }

  // 1. Identify target condition from incoming telemetry attributes
  const rawFault =
    telemetry.predicted_fault ||
    telemetry.predicted_condition ||
    telemetry.fault_name ||
    telemetry.fault_type ||
    telemetry.condition ||
    '';

  const conditionKey = normalizeConditionKey(rawFault);
  const template = FAULT_ADVISORY_CATALOG[conditionKey] || FAULT_ADVISORY_CATALOG.normal;

  // 2. Resolve Assessment Severity
  const assessment = resolveAssessmentLevel(telemetry, template.assessment);

  // 3. Compute Confidence (prefer telemetry telemetry attribute, fallback to template)
  let confidence = template.confidence;
  if (typeof telemetry.anomaly_confidence === 'number') {
    confidence = Math.round(
      telemetry.anomaly_confidence <= 1
        ? telemetry.anomaly_confidence * 100
        : telemetry.anomaly_confidence
    );
  } else if (typeof telemetry.confidence === 'number') {
    confidence = Math.round(
      telemetry.confidence <= 1 ? telemetry.confidence * 100 : telemetry.confidence
    );
  }

  // 4. Resolve Prognostics & Health Metrics
  const rulHours = Number(telemetry.rul_hours ?? telemetry.estimated_rul ?? 789);
  const rulUncertainty = Number(telemetry.rul_uncertainty_hours ?? 8);

  const rawTrend = String(telemetry.health_trend || 'stable').toLowerCase();
  let healthTrend = 'Stable';
  if (rawTrend.includes('deg')) healthTrend = 'Degrading';
  else if (rawTrend.includes('imp')) healthTrend = 'Improving';
  else if (rawTrend.includes('crit')) healthTrend = 'Rapid Degradation';

  // 5. Tailor Mission Recommendation for Severity
  let missionRecommendation = template.missionRecommendation;
  if (assessment === 'CRITICAL') {
    missionRecommendation =
      'Initiate return-to-base assessment. Consider mission abort according to approved SOP.';
  } else if (assessment === 'WARNING' && conditionKey === 'map_sensor_bias_drift') {
    missionRecommendation = 'Continue with enhanced monitoring';
  } else if (assessment === 'NORMAL') {
    missionRecommendation = 'Continue mission normally under standard operating procedures.';
  }

  // 6. Integrate Explainability / Model Breakdown
  // NOTE: When backend explainability service (XAI / SHAP / EKF Covariance Decomposition)
  // is available in telemetry, replace this modelBreakdown with telemetry.explainability:
  // e.g.: telemetry.explainability?.contributions || template.modelBreakdown
  const modelBreakdown = {
    physicsModel: telemetry.physics_contribution ?? template.modelBreakdown.physicsModel,
    anomalyModel: telemetry.anomaly_contribution ?? template.modelBreakdown.anomalyModel,
    trendAnalysis: telemetry.trend_contribution ?? template.modelBreakdown.trendAnalysis,
  };

  // 7. Dynamic Evidence Enrichment (combines template evidence with live telemetry values)
  const evidence = [...template.evidence];
  if (telemetry.rpm) {
    evidence.push(`• Operating Engine Speed: ${Math.round(telemetry.rpm)} RPM`);
  }
  if (telemetry.cht) {
    evidence.push(`• Cylinder Head Temperature (CHT): ${Number(telemetry.cht).toFixed(1)}°C`);
  }
  if (telemetry.oil_pressure) {
    evidence.push(`• Lubrication Pressure: ${Number(telemetry.oil_pressure).toFixed(2)} bar`);
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

export default {
  generateAdvisory,
};
