/**
 * Advanced Advisory Analytics & Decision-Support Rule Engine
 * Consumes real-time telemetry, rolling history, and mission context
 * to generate prioritized, fault-isolated operational advisories.
 */

import { ADVISORY_TEMPLATES } from './advisoryTemplates.js';
import { calculatePriorityScore, rankAdvisories } from './priorityEngine.js';

/**
 * Normalizes input telemetry whether from raw backend packet, synthetic simulator, or REST API.
 */
function extractTelemetryScalars(telemetry = {}) {
  const sensor = telemetry.sensor || telemetry;
  const physics = telemetry.physics || {};
  const residuals = telemetry.residuals || {};
  const health = telemetry.health || {};
  const rul = telemetry.rul || {};

  const rpm = Number(sensor.engine_rpm ?? sensor.rpm ?? 5000);
  const map = Number(sensor.map_hpa ?? sensor.map ?? 850);
  const fuelFlow = Number(sensor.fuel_flow_lph ?? sensor.fuel_flow ?? 24.5);
  const oilPress = Number(sensor.oil_press_bar ?? sensor.oil_pressure ?? 3.8);
  const oilTemp = Number(sensor.oil_temp_c ?? sensor.oil_temp ?? 82.0);
  const coolantTemp = Number(sensor.coolant_temp_c ?? 80.0);
  const vibration = Number(sensor.vibration_g ?? sensor.vibration ?? 1.18);

  const chtList = Array.isArray(sensor.cht_c) ? sensor.cht_c : [sensor.cht ?? 108.0];
  const maxCht = Math.max(...chtList);

  const egtList = Array.isArray(sensor.egt_c) ? sensor.egt_c : [sensor.egt ?? 780.0];
  const maxEgt = Math.max(...egtList);

  const healthScore = Number(health.health_score_pct ?? telemetry.health_score ?? 92);
  const anomalyScore = Number(residuals.anomaly_score_pct ? residuals.anomaly_score_pct / 100 : (telemetry.anomaly_score ?? 0.12));
  const anomalyConfidence = Number(telemetry.anomaly_confidence ?? 90);

  const rulHours = Number(rul.estimated_rul_hours ?? telemetry.rul_hours ?? 789);
  const rulUncertainty = Number(telemetry.rul_uncertainty_hours ?? 8);

  const rawFault =
    telemetry.predicted_fault ||
    (health.isolated_faults && health.isolated_faults[0]?.name) ||
    '';

  return {
    rpm,
    map,
    fuelFlow,
    oilPress,
    oilTemp,
    coolantTemp,
    vibration,
    maxCht,
    maxEgt,
    healthScore,
    anomalyScore,
    anomalyConfidence,
    rulHours,
    rulUncertainty,
    rawFault,
    missionPhase: telemetry.mission_phase || 'CRUISE_LOITER',
    telemetryTimestamp: sensor.timestamp || Date.now() / 1000,
  };
}

/**
 * Evaluates rolling history to detect trend rates (e.g. CHT/EGT rise per minute).
 */
function analyzeHistoryTrends(history = []) {
  if (!history || history.length < 2) {
    return { chtSlopePerMin: 0, egtSlopePerMin: 0, oilSlopePerMin: 0 };
  }

  const recent = history.slice(-10);
  const first = recent[0];
  const last = recent[recent.length - 1];

  const dtMin = Math.max((last.timestamp - first.timestamp) / 60, 0.05);

  const firstCht = first.cht_c ? Math.max(...(Array.isArray(first.cht_c) ? first.cht_c : [first.cht_c])) : (first.cht ?? 108);
  const lastCht = last.cht_c ? Math.max(...(Array.isArray(last.cht_c) ? last.cht_c : [last.cht_c])) : (last.cht ?? 108);

  const firstEgt = first.egt_c ? Math.max(...(Array.isArray(first.egt_c) ? first.egt_c : [first.egt_c])) : (first.egt ?? 780);
  const lastEgt = last.egt_c ? Math.max(...(Array.isArray(last.egt_c) ? last.egt_c : [last.egt_c])) : (last.egt ?? 780);

  const firstOilP = first.oil_press_bar ?? first.oil_pressure ?? 3.8;
  const lastOilP = last.oil_press_bar ?? last.oil_pressure ?? 3.8;

  return {
    chtSlopePerMin: (lastCht - firstCht) / dtMin,
    egtSlopePerMin: (lastEgt - firstEgt) / dtMin,
    oilSlopePerMin: (lastOilP - firstOilP) / dtMin,
  };
}

/**
 * Main telemetry evaluation function.
 * Generates situation-based advisories, correlates signals, and calculates dynamic priorities.
 *
 * @param {Object} params
 * @param {Object} [params.telemetry] Latest incoming telemetry packet
 * @param {Array} [params.telemetryHistory] Rolling 5-10 minute history
 * @param {Object} [params.missionContext] Mission metadata (UAV ID, phase, ambient)
 * @param {Array} [params.previousAdvisories] Prior ranked list for hysteresis
 * @returns {Array} Priority-ranked list of active advisory incidents
 */
export function analyzeTelemetry({
  telemetry = {},
  telemetryHistory = [],
  missionContext = {},
  previousAdvisories = [],
}) {
  const scalars = extractTelemetryScalars(telemetry);
  const trends = analyzeHistoryTrends(telemetryHistory);
  const missionPhase = missionContext.missionPhase || scalars.missionPhase || 'CRUISE_LOITER';

  const activeIncidents = [];

  // =========================================================================
  // 1. EVALUATION: Critical Lubrication / Multi-Symptom Correlation
  // =========================================================================
  const isOilPressCritical = scalars.oilPress < 2.05;
  const isOilTempElevated = scalars.oilTemp > 95.0;
  const isVibElevated = scalars.vibration > 1.95;

  if (isOilPressCritical && isOilTempElevated) {
    // Consolidated Lubrication Circuit Risk
    const template = ADVISORY_TEMPLATES.lubrication_system_risk;
    activeIncidents.push({
      ...template,
      severity: 'CRITICAL',
      confidence: 94,
      anomalyScore: 0.92,
      persistenceSeconds: 65,
      healthImpact: {
        currentHealthScore: scalars.healthScore,
        currentRulHours: scalars.rulHours,
        rulUncertaintyHours: scalars.rulUncertainty,
        projectedRulIfPersistent: Math.max(scalars.rulHours - 80, 20),
      },
      advisorySource: 'Hybrid physics + AI model',
    });
  } else if (isOilPressCritical) {
    // Single Low Oil Pressure
    const template = ADVISORY_TEMPLATES.low_oil_pressure;
    activeIncidents.push({
      ...template,
      severity: 'CRITICAL',
      confidence: 93,
      anomalyScore: 0.88,
      persistenceSeconds: 45,
      healthImpact: {
        currentHealthScore: scalars.healthScore,
        currentRulHours: scalars.rulHours,
        rulUncertaintyHours: scalars.rulUncertainty,
        projectedRulIfPersistent: Math.max(scalars.rulHours - 60, 40),
      },
      advisorySource: 'Hybrid physics + AI model',
    });
  }

  // =========================================================================
  // 2. EVALUATION: Escalating Thermal Stress / Overheating
  // =========================================================================
  const isThermalElevated =
    scalars.maxCht > 120.0 ||
    scalars.maxEgt > 860.0 ||
    trends.chtSlopePerMin > 2.0 ||
    scalars.rawFault.toLowerCase().includes('overheat');

  if (isThermalElevated) {
    const template = ADVISORY_TEMPLATES.overheating_risk;
    const isWorsening = trends.chtSlopePerMin > 1.5;
    activeIncidents.push({
      ...template,
      severity: scalars.maxCht > 130.0 ? 'CRITICAL' : 'WARNING',
      confidence: 84,
      anomalyScore: 0.78,
      isWorsening,
      status: isWorsening ? 'Active and increasing' : 'Sustained elevation',
      persistenceSeconds: 58,
      healthImpact: {
        currentHealthScore: scalars.healthScore,
        currentRulHours: scalars.rulHours,
        rulUncertaintyHours: scalars.rulUncertainty,
        projectedRulIfPersistent: Math.max(scalars.rulHours - 29, 50),
      },
      advisorySource: 'Prototype rule + trend engine',
    });
  }

  // =========================================================================
  // 3. EVALUATION: MAP Sensor Bias Drift (Sensor Quality - Low Impact)
  // =========================================================================
  const isMapDivergent =
    scalars.rawFault.toLowerCase().includes('map') ||
    scalars.rawFault.toLowerCase().includes('sensor_drift');

  if (isMapDivergent) {
    const template = ADVISORY_TEMPLATES.map_sensor_bias_drift;
    activeIncidents.push({
      ...template,
      severity: 'ADVISORY',
      confidence: 92,
      anomalyScore: 0.42,
      persistenceSeconds: 260,
      healthImpact: {
        currentHealthScore: scalars.healthScore,
        currentRulHours: scalars.rulHours,
        rulUncertaintyHours: scalars.rulUncertainty,
        projectedRulIfPersistent: scalars.rulHours, // Sensor drift does not degrade physical iron
      },
      advisorySource: 'Prototype rule + trend engine',
    });
  }

  // =========================================================================
  // 4. EVALUATION: Mechanical Vibration
  // =========================================================================
  if (isVibElevated && !isOilPressCritical) {
    const template = ADVISORY_TEMPLATES.abnormal_vibration;
    activeIncidents.push({
      ...template,
      severity: scalars.vibration > 2.5 ? 'CRITICAL' : 'WARNING',
      confidence: 88,
      anomalyScore: 0.65,
      persistenceSeconds: 75,
      healthImpact: {
        currentHealthScore: scalars.healthScore,
        currentRulHours: scalars.rulHours,
        rulUncertaintyHours: scalars.rulUncertainty,
        projectedRulIfPersistent: Math.max(scalars.rulHours - 45, 100),
      },
      advisorySource: 'Prototype rule + trend engine',
    });
  }

  // =========================================================================
  // 5. EVALUATION: Specific Injected Fault Mapping from Backend
  // =========================================================================
  if (scalars.rawFault && !activeIncidents.some((i) => scalars.rawFault.toLowerCase().includes(i.type))) {
    const faultStr = scalars.rawFault.toLowerCase();
    let matchedTemplate = null;

    if (faultStr.includes('injector')) matchedTemplate = ADVISORY_TEMPLATES.injector_abnormality;
    else if (faultStr.includes('misfire')) matchedTemplate = ADVISORY_TEMPLATES.misfire_risk;
    else if (faultStr.includes('combust')) matchedTemplate = ADVISORY_TEMPLATES.combustion_instability;
    else if (faultStr.includes('alternator')) matchedTemplate = ADVISORY_TEMPLATES.battery_alternator_issue;
    else if (faultStr.includes('fuel')) matchedTemplate = ADVISORY_TEMPLATES.fuel_flow_anomaly;

    if (matchedTemplate) {
      activeIncidents.push({
        ...matchedTemplate,
        confidence: scalars.anomalyConfidence || matchedTemplate.confidence,
        anomalyScore: scalars.anomalyScore || 0.65,
        persistenceSeconds: 40,
        healthImpact: {
          currentHealthScore: scalars.healthScore,
          currentRulHours: scalars.rulHours,
          rulUncertaintyHours: scalars.rulUncertainty,
          projectedRulIfPersistent: Math.max(scalars.rulHours - 30, 100),
        },
        advisorySource: 'Hybrid physics + AI model',
      });
    }
  }

  // =========================================================================
  // 6. DEFAULT NOMINAL BASELINE: Always present at lowest rank
  // =========================================================================
  const normalTemplate = ADVISORY_TEMPLATES.normal;
  activeIncidents.push({
    ...normalTemplate,
    confidence: 98,
    anomalyScore: 0.05,
    persistenceSeconds: 720,
    healthImpact: {
      currentHealthScore: scalars.healthScore,
      currentRulHours: scalars.rulHours,
      rulUncertaintyHours: scalars.rulUncertainty,
      projectedRulIfPersistent: scalars.rulHours,
    },
    advisorySource: 'Hybrid physics + AI model',
  });

  // Rank all active incidents with anti-flicker hysteresis
  return rankAdvisories(previousAdvisories, activeIncidents, missionPhase);
}
