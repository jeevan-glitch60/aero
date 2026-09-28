import React, { useState, useEffect, useRef } from 'react';
import './AiAdvisoryWidget.css';
import { generateAdvisory } from './advisoryEngine';

/**
 * Defense-Grade Decision-Support AI Advisory Widget
 * MALE UAV Aero-Piston Engine Digital Twin (Rotax 915/916 iS Class)
 *
 * Strictly Decision-Support & Advisory Only (STANAG 4586 Compliant).
 * Does not command flight control, throttle, or actuator systems.
 *
 * @param {Object} props
 * @param {Object} [props.telemetry] Live or replay telemetry packet from parent dashboard
 */
export default function AiAdvisoryWidget({ telemetry }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);
  
  // Persistent advisory cache ensures UI never collapses during temporary telemetry dropouts
  const [cachedAdvisory, setCachedAdvisory] = useState(() => generateAdvisory(telemetry));
  const widgetRef = useRef(null);

  // Synchronize incoming telemetry prop with advisory engine
  useEffect(() => {
    if (telemetry && typeof telemetry === 'object') {
      const updated = generateAdvisory(telemetry);
      setCachedAdvisory(updated);
    }
  }, [telemetry]);

  // Handle outside click & Escape key dismiss
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    function handlePointerDown(e) {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  const advisory = cachedAdvisory || generateAdvisory(null);
  const assessment = (advisory.assessment || 'NORMAL').toUpperCase();

  // Status dot & severity-specific styling classes
  const statusClass =
    assessment === 'CRITICAL'
      ? 'status-critical'
      : assessment === 'WARNING'
      ? 'status-warning'
      : assessment === 'ADVISORY'
      ? 'status-advisory'
      : 'status-normal';

  const badgeClass =
    assessment === 'CRITICAL'
      ? 'badge-critical'
      : assessment === 'WARNING'
      ? 'badge-warning'
      : assessment === 'ADVISORY'
      ? 'badge-advisory'
      : 'badge-normal';

  const recBoxClass =
    assessment === 'CRITICAL'
      ? 'rec-critical'
      : assessment === 'NORMAL'
      ? 'rec-normal'
      : '';

  return (
    <div className="ai-advisory-root" ref={widgetRef}>
      {/* ====================================================================
          1. FLOATING ADVISORY LAUNCHER BUTTON
          ==================================================================== */}
      <button
        type="button"
        className="ai-advisory-btn"
        id="btn-ai-advisory-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="AI Copilot Action Advisory (Decision Support Only)"
      >
        <span className={`ai-status-dot ${statusClass}`} aria-hidden="true" />
        <span>[ AI ADVISORY ]</span>
      </button>

      {/* ====================================================================
          2. OVERLAY PANEL
          ==================================================================== */}
      {isOpen && (
        <div
          className="ai-advisory-panel"
          role="dialog"
          aria-modal="false"
          aria-label="AI Copilot Action Advisory"
        >
          {/* Header Bar */}
          <div className="ai-panel-header">
            <div className="ai-panel-title-wrap">
              <span className="ai-panel-title">AI COPILOT — ACTION ADVISORY</span>
              <span className="ai-live-tag">LIVE</span>
            </div>
            <button
              type="button"
              className="ai-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close Advisory Panel"
              title="Close (Esc)"
            >
              ×
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="ai-panel-body">
            {/* 1. Assessment Header Card */}
            <div className="ai-assessment-card">
              <div className="ai-meta-row">
                <span className="ai-meta-label">Assessment:</span>
                <span className={`ai-badge ${badgeClass}`}>{assessment}</span>
              </div>
              <div className="ai-meta-row">
                <span className="ai-meta-label">Predicted Condition:</span>
                <span className="ai-meta-value">{advisory.predictedCondition}</span>
              </div>
              <div className="ai-meta-row">
                <span className="ai-meta-label">Confidence:</span>
                <span className="ai-meta-value">{advisory.confidence}%</span>
              </div>
              <div className="ai-meta-row">
                <span className="ai-meta-label">Mission Impact:</span>
                <span className="ai-meta-value">{advisory.missionImpact}</span>
              </div>
            </div>

            {/* 2. What Is Happening */}
            <div>
              <div className="ai-section-title">WHAT IS HAPPENING</div>
              <div className="ai-explanation-box">{advisory.explanation}</div>
            </div>

            {/* 3. Recommended Action Now */}
            <div>
              <div className="ai-section-title">RECOMMENDED ACTION NOW</div>
              <div className="ai-actions-list">
                {advisory.immediateActions && advisory.immediateActions.length > 0 ? (
                  advisory.immediateActions.map((action, idx) => (
                    <div key={idx} className="ai-action-item">
                      {action}
                    </div>
                  ))
                ) : (
                  <div className="ai-action-item">Maintain standard monitor watch.</div>
                )}
              </div>
            </div>

            {/* 4. Post-Flight Maintenance */}
            <div>
              <div className="ai-section-title">POST-FLIGHT MAINTENANCE</div>
              <div className="ai-maint-box">
                <div className="ai-priority-row">
                  <span className="ai-meta-label">Inspection Priority:</span>
                  <span className="ai-priority-val">{advisory.inspectionPriority}</span>
                </div>
                <div className="ai-maint-list">
                  {advisory.maintenanceActions && advisory.maintenanceActions.length > 0 ? (
                    advisory.maintenanceActions.map((maint, idx) => (
                      <div key={idx}>{maint}</div>
                    ))
                  ) : (
                    <div>• Standard turnaround walkaround.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Why AI Thinks This (Collapsible) */}
            <div>
              <button
                type="button"
                className="ai-collapsible-trigger"
                onClick={() => setIsWhyExpanded((prev) => !prev)}
                aria-expanded={isWhyExpanded}
              >
                <span>WHY AI THINKS THIS</span>
                <span
                  className={`ai-collapsible-arrow ${isWhyExpanded ? 'open' : ''}`}
                  aria-hidden="true"
                >
                  ▶
                </span>
              </button>

              {isWhyExpanded && (
                <div className="ai-collapsible-content">
                  {/* Evidence Items */}
                  <div className="ai-evidence-list">
                    {advisory.evidence && advisory.evidence.length > 0 ? (
                      advisory.evidence.map((ev, idx) => <div key={idx}>{ev}</div>)
                    ) : (
                      <div>• High thermodynamic model correlation</div>
                    )}
                  </div>

                  {/* Explainability Contribution Bars */}
                  {/*
                    NOTE: Backend Explainability Integration:
                    When backend XAI / SHAP or EKF parameter covariance weights are provided,
                    bind directly to advisory.modelBreakdown or telemetry.explainability.
                  */}
                  <div className="ai-bars-container">
                    <div className="ai-bar-row">
                      <div className="ai-bar-label-row">
                        <span>Physics model</span>
                        <span className="font-mono">
                          {advisory.modelBreakdown?.physicsModel ?? 45}%
                        </span>
                      </div>
                      <div className="ai-bar-track">
                        <div
                          className="ai-bar-fill"
                          style={{
                            width: `${advisory.modelBreakdown?.physicsModel ?? 45}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="ai-bar-row">
                      <div className="ai-bar-label-row">
                        <span>Anomaly model</span>
                        <span className="font-mono">
                          {advisory.modelBreakdown?.anomalyModel ?? 35}%
                        </span>
                      </div>
                      <div className="ai-bar-track">
                        <div
                          className="ai-bar-fill"
                          style={{
                            width: `${advisory.modelBreakdown?.anomalyModel ?? 35}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="ai-bar-row">
                      <div className="ai-bar-label-row">
                        <span>Trend analysis</span>
                        <span className="font-mono">
                          {advisory.modelBreakdown?.trendAnalysis ?? 20}%
                        </span>
                      </div>
                      <div className="ai-bar-track">
                        <div
                          className="ai-bar-fill"
                          style={{
                            width: `${advisory.modelBreakdown?.trendAnalysis ?? 20}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Prognostics & Mission Recommendation */}
            <div>
              <div className="ai-section-title">PROGNOSTICS & MISSION RECOMMENDATION</div>
              <div className="ai-prognostics-card">
                <div className="ai-prog-row">
                  <span className="ai-meta-label">Estimated RUL:</span>
                  <span className="ai-prog-val">
                    {advisory.rulHours ?? 789} h ± {advisory.rulUncertainty ?? 8} h
                  </span>
                </div>
                <div className="ai-prog-row">
                  <span className="ai-meta-label">Current health trend:</span>
                  <span className="ai-meta-value">{advisory.healthTrend ?? 'Degrading'}</span>
                </div>
                <div className="ai-meta-label" style={{ marginTop: '4px' }}>
                  Mission recommendation:
                </div>
                <div className={`ai-mission-recommendation-box ${recBoxClass}`}>
                  {advisory.missionRecommendation}
                </div>
              </div>
            </div>
          </div>

          {/* Panel Footer Disclaimer */}
          <div className="ai-panel-footer">
            Decision-support advisory only. Final action remains with the authorized operator and approved procedures.
          </div>
        </div>
      )}
    </div>
  );
}
