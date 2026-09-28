import React, { useState } from 'react';

/**
 * Column 2: Active Advisory & Recommendations
 * Comprehensive operational diagnostic, immediate watch items,
 * operator decision logging triggers, post-flight maintenance, and explainability.
 */
export default function ActiveAdvisory({
  incident,
  onRequestDecision,
}) {
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);

  if (!incident) {
    return (
      <div className="adv-active-empty">
        Select a condition from the Priority Queue to inspect detailed guidance.
      </div>
    );
  }

  const sev = (incident.severity || 'NORMAL').toLowerCase();
  const options = incident.decisionOptions || [
    'Continue with enhanced monitoring',
    'Request propulsion engineer review',
  ];

  return (
    <div className="adv-active-container">
      <div className="adv-column-header">
        <div className="adv-column-title">
          <span>🎯</span> ACTIVE ADVISORY
        </div>
        <span className="adv-source-tag font-mono">
          {incident.advisorySource || 'Advisory source: Prototype rule + trend engine'}
        </span>
      </div>

      <div className="adv-active-scroll-body">
        {/* A. Assessment Header Card */}
        <div className="ai-assessment-card">
          <div className="ai-meta-row">
            <span className="ai-meta-label">Assessment:</span>
            <span className={`ai-badge badge-${sev}`}>{incident.severity}</span>
          </div>
          <div className="ai-meta-row">
            <span className="ai-meta-label">Condition:</span>
            <span className="ai-meta-value font-bold">{incident.title}</span>
          </div>
          <div className="ai-meta-row">
            <span className="ai-meta-label">Confidence:</span>
            <span className="ai-meta-value font-mono">{incident.confidence}%</span>
          </div>
          <div className="ai-meta-row">
            <span className="ai-meta-label">Priority:</span>
            <span className="ai-meta-value font-mono text-warning font-bold">
              P-{incident.priorityScore ?? 50}
            </span>
          </div>
          <div className="ai-meta-row">
            <span className="ai-meta-label">Mission Impact:</span>
            <span className="ai-meta-value">{incident.missionImpact || 'MODERATE'}</span>
          </div>
          <div className="ai-meta-row">
            <span className="ai-meta-label">Status:</span>
            <span className="ai-meta-value font-mono text-muted">{incident.status || 'Active'}</span>
          </div>
        </div>

        {/* B. What Is Happening */}
        <div>
          <div className="ai-section-title">WHAT IS HAPPENING</div>
          <div className="ai-explanation-box">{incident.explanation}</div>
        </div>

        {/* C. What Should Be Monitored Now */}
        <div>
          <div className="ai-section-title">MONITOR NOW</div>
          <div className="adv-monitor-list">
            {(incident.monitorNow || []).map((item, idx) => (
              <div key={idx} className="adv-monitor-item">
                <span className="adv-monitor-bullet">👁️</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* D. Operator Decision Support */}
        <div>
          <div className="ai-section-title">OPERATOR DECISION SUPPORT</div>
          <div className="adv-decision-notice">
            Select an operational stance to record operator acknowledgement in mission audit records.
            <span className="text-muted block text-xs" style={{ marginTop: '2px' }}>
              Does not issue flight-control or autopilot commands.
            </span>
          </div>
          <div className="adv-decision-button-grid">
            {options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                className="adv-decision-btn"
                onClick={() => onRequestDecision(incident, opt)}
              >
                <span className="adv-decision-btn-icon">⚡</span>
                <span>[ {opt} ]</span>
              </button>
            ))}
          </div>
        </div>

        {/* E. Post-Flight Maintenance Recommendation */}
        <div>
          <div className="ai-section-title">POST-FLIGHT MAINTENANCE RECOMMENDATION</div>
          <div className="ai-maint-box">
            <div className="ai-priority-row">
              <span className="ai-meta-label">Inspection Priority:</span>
              <span className="ai-priority-val">
                {incident.maintenancePriority || 'Inspect within 1 flight cycle'}
              </span>
            </div>
            <div className="ai-maint-list">
              {(incident.maintenanceActions || []).map((act, idx) => (
                <div key={idx}>{act}</div>
              ))}
            </div>
          </div>
        </div>

        {/* F. Why AI Believes This (Collapsible) */}
        <div>
          <button
            type="button"
            className="ai-collapsible-trigger"
            onClick={() => setIsWhyExpanded((prev) => !prev)}
            aria-expanded={isWhyExpanded}
          >
            <span>WHY AI THINKS THIS & EVIDENCE</span>
            <span className={`ai-collapsible-arrow ${isWhyExpanded ? 'open' : ''}`}>▶</span>
          </button>

          {isWhyExpanded && (
            <div className="ai-collapsible-content">
              {/* Evidence Items */}
              <div className="adv-evidence-grid">
                {(incident.evidence || []).map((ev, idx) => (
                  <div key={idx} className="adv-evidence-card">
                    <div className="adv-evidence-label">{ev.label}</div>
                    <div className={`adv-evidence-value state-${ev.state || 'nominal'} font-mono`}>
                      {ev.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Model Contribution Progress Bars */}
              <div className="ai-bars-container">
                <div className="ai-bar-row">
                  <div className="ai-bar-label-row">
                    <span>Physics-based expectation</span>
                    <span className="font-mono">
                      {incident.modelContribution?.physics ?? 45}%
                    </span>
                  </div>
                  <div className="ai-bar-track">
                    <div
                      className="ai-bar-fill"
                      style={{ width: `${incident.modelContribution?.physics ?? 45}%` }}
                    />
                  </div>
                </div>

                <div className="ai-bar-row">
                  <div className="ai-bar-label-row">
                    <span>Anomaly model</span>
                    <span className="font-mono">
                      {incident.modelContribution?.anomaly ?? 35}%
                    </span>
                  </div>
                  <div className="ai-bar-track">
                    <div
                      className="ai-bar-fill"
                      style={{ width: `${incident.modelContribution?.anomaly ?? 35}%` }}
                    />
                  </div>
                </div>

                <div className="ai-bar-row">
                  <div className="ai-bar-label-row">
                    <span>Trend / degradation model</span>
                    <span className="font-mono">
                      {incident.modelContribution?.trend ?? 20}%
                    </span>
                  </div>
                  <div className="ai-bar-track">
                    <div
                      className="ai-bar-fill"
                      style={{ width: `${incident.modelContribution?.trend ?? 20}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* G. Life and Mission Impact */}
        <div>
          <div className="ai-section-title">ENGINE LIFE AND MISSION IMPACT</div>
          <div className="ai-prognostics-card">
            <div className="ai-prog-row">
              <span className="ai-meta-label">Current Health Score:</span>
              <span className="ai-prog-val font-mono">
                {incident.healthImpact?.currentHealthScore ?? 92} / 100
              </span>
            </div>
            <div className="ai-prog-row">
              <span className="ai-meta-label">Estimated RUL:</span>
              <span className="ai-prog-val font-mono">
                {incident.healthImpact?.currentRulHours ?? 789} h ±{' '}
                {incident.healthImpact?.rulUncertaintyHours ?? 8} h
              </span>
            </div>
            <div className="ai-prog-row">
              <span className="ai-meta-label">Projected RUL If Persistent:</span>
              <span className="ai-prog-val font-mono text-warning">
                {incident.healthImpact?.projectedRulIfPersistent ?? 760} h
              </span>
            </div>
            <div className="ai-prog-row">
              <span className="ai-meta-label">Estimated Current Mission Impact:</span>
              <span className="ai-meta-value font-bold">
                {incident.missionImpact || 'Moderate'}
              </span>
            </div>
            <div className="ai-meta-label" style={{ marginTop: '4px' }}>
              Mission Recommendation:
            </div>
            <div className={`ai-mission-recommendation-box rec-${sev}`}>
              {incident.missionRecommendation}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
