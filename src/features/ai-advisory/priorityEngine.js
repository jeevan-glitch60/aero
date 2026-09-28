/**
 * Dynamic Priority Scoring & Stable Ranking Engine
 * Computes transparent 0–100 priority index with anti-flicker hysteresis
 * for MALE UAV aero-piston engine fault prioritization.
 */

const SEVERITY_WEIGHTS = {
  CRITICAL: 45,
  WARNING: 30,
  ADVISORY: 15,
  NORMAL: 0,
};

const HIGH_DEMAND_PHASES = ['TAKEOFF', 'CLIMB', 'APPROACH_LANDING'];

/**
 * Calculates deterministic priority score (0–100) for an advisory incident.
 *
 * @param {Object} incident
 * @param {string} [missionPhase]
 * @returns {number} Normalized priority score
 */
export function calculatePriorityScore(incident, missionPhase = 'CRUISE_LOITER') {
  const sev = String(incident.severity || 'NORMAL').toUpperCase();
  const severityWeight = SEVERITY_WEIGHTS[sev] ?? 0;

  // Confidence contribution (0 to 15)
  const conf = Number(incident.confidence ?? 80);
  const confidenceWeight = Math.min(Math.max(conf / 100, 0), 1) * 15;

  // Anomaly score contribution (0 to 10)
  const anomaly = Number(incident.anomalyScore ?? 0.5);
  const anomalyWeight = Math.min(Math.max(anomaly, 0), 1) * 10;

  // Persistence duration contribution (0 to 10 points for up to 60s)
  const persistence = Number(incident.persistenceSeconds ?? 30);
  const persistenceWeight = Math.min(Math.max(persistence / 60, 0), 1) * 10;

  // Worsening trend bonus (0 or 8)
  const isWorsening =
    incident.isWorsening ||
    String(incident.status || '').toLowerCase().includes('increasing') ||
    String(incident.status || '').toLowerCase().includes('worsening');
  const worseningTrendWeight = isWorsening ? 8 : 0;

  // Critical flight phase penalty (0 or 5)
  const phase = String(missionPhase).toUpperCase();
  const missionPhaseWeight = HIGH_DEMAND_PHASES.includes(phase) ? 5 : 0;

  // RUL degradation impact (0 to 5)
  const rulHours = Number(incident.healthImpact?.currentRulHours ?? 789);
  const projectedRul = Number(incident.healthImpact?.projectedRulIfPersistent ?? 780);
  const deltaRul = Math.max(rulHours - projectedRul, 0);
  const rulImpactWeight = Math.min((deltaRul / 30) * 5, 5);

  // Cross-sensor correlation bonus (0 or 2)
  const corrCount = Array.isArray(incident.correlatedSignals) ? incident.correlatedSignals.length : 0;
  const correlationWeight = corrCount >= 2 ? 2 : 0;

  const rawScore =
    severityWeight +
    confidenceWeight +
    anomalyWeight +
    persistenceWeight +
    worseningTrendWeight +
    missionPhaseWeight +
    rulImpactWeight +
    correlationWeight;

  return Math.min(Math.max(Math.round(rawScore), 0), 100);
}

/**
 * Stable sorting of incident list with a 5-point hysteresis threshold
 * to prevent jarring UI reordering caused by high-frequency sensor noise.
 *
 * @param {Array} previousList
 * @param {Array} currentList
 * @param {string} [missionPhase]
 * @returns {Array} Stable sorted list with rank metadata
 */
export function rankAdvisories(previousList = [], currentList = [], missionPhase = 'CRUISE_LOITER') {
  const prevMap = new Map();
  previousList.forEach((item) => {
    prevMap.set(item.id, item);
  });

  const scoredList = currentList.map((item) => {
    const freshScore = calculatePriorityScore(item, missionPhase);
    const prev = prevMap.get(item.id);

    let effectiveScore = freshScore;
    let priorityChanged = false;

    if (prev && typeof prev.priorityScore === 'number') {
      // Apply hysteresis: only update score if divergence exceeds 5 points
      if (Math.abs(freshScore - prev.priorityScore) <= 5) {
        effectiveScore = prev.priorityScore;
      } else {
        priorityChanged = true;
      }
    }

    return {
      ...item,
      priorityScore: effectiveScore,
      priorityChanged,
    };
  });

  // Sort descending by priorityScore
  scoredList.sort((a, b) => b.priorityScore - a.priorityScore);

  // Assign 1-based ranks
  return scoredList.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    rankStr: String(idx + 1).padStart(2, '0'),
  }));
}
