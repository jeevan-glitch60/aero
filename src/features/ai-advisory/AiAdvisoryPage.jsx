import React, { useState, useEffect, useMemo, useRef } from 'react';
import './AiAdvisoryPage.css';
import { analyzeTelemetry } from './advisoryEngine';
import AdvisoryQueue from './AdvisoryQueue';
import ActiveAdvisory from './ActiveAdvisory';
import MissionContext from './MissionContext';
import AdvisoryTimeline from './AdvisoryTimeline';
import DecisionModal from './DecisionModal';

const INITIAL_DEMO_EVENTS = [
  {
    id: 'ev-1',
    time: '14:28:10',
    timeStr: '14:28:10',
    category: 'TELEMETRY',
    severity: 'INFO',
    description: 'Telemetry synchronization initialized at 10 Hz over GCS datalink',
    status: 'ONLINE',
  },
  {
    id: 'ev-2',
    time: '14:28:22',
    timeStr: '14:28:22',
    category: 'PHYSICS',
    severity: 'NORMAL',
    description: 'MVEM thermodynamics twin state converged (residual norm < 0.75σ)',
    status: 'CONVERGED',
  },
  {
    id: 'ev-3',
    time: '14:28:45',
    timeStr: '14:28:45',
    category: 'AI',
    severity: 'NORMAL',
    description: 'Multi-cylinder thermal symmetry baseline verified across cylinders 1-4',
    status: 'VERIFIED',
  },
];

/**
 * AI Advisory Page: Engine Health Decision Support Center
 * Full desktop/laptop GCS 3-column + timeline interface (STANAG 4586).
 *
 * @param {Object} props
 * @param {Object} [props.telemetry] Live telemetry stream from parent dashboard
 * @param {Array} [props.telemetryHistory] Historical telemetry buffer
 * @param {Object} [props.missionContext] Active mission details
 */
export default function AiAdvisoryPage({
  telemetry = {},
  telemetryHistory = [],
  missionContext = { missionId: 'M-2025-07-14', uavId: 'UAV-03', phase: 'CRUISE / LOITER' },
}) {
  const [advisories, setAdvisories] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('aerotwin_advisory_events');
      return saved ? JSON.parse(saved) : INITIAL_DEMO_EVENTS;
    } catch (e) {
      return INITIAL_DEMO_EVENTS;
    }
  });

  const [modalState, setModalState] = useState({
    isOpen: false,
    incident: null,
    selectedDecision: '',
  });

  const prevAdvisoriesRef = useRef([]);

  // Compute real-time advisories as telemetry updates
  useEffect(() => {
    const list = analyzeTelemetry({
      telemetry,
      telemetryHistory,
      missionContext,
      previousAdvisories: prevAdvisoriesRef.current,
    });

    prevAdvisoriesRef.current = list;
    setAdvisories(list);

    // Auto-select highest priority issue if none selected or selected issue resolved
    setSelectedIncidentId((curr) => {
      if (curr && list.some((i) => i.id === curr)) return curr;
      return list[0]?.id || null;
    });
  }, [telemetry, telemetryHistory, missionContext]);

  // Selected incident object
  const activeIncident = useMemo(() => {
    return advisories.find((i) => i.id === selectedIncidentId) || advisories[0] || null;
  }, [advisories, selectedIncidentId]);

  // Request operator decision modal
  const handleRequestDecision = (incident, decisionText) => {
    setModalState({
      isOpen: true,
      incident,
      selectedDecision: decisionText,
    });
  };

  // Confirm and log operator decision
  const handleConfirmDecision = (record) => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const newEvent = {
      id: `ev-${Date.now()}`,
      time: timeStr,
      timeStr,
      timestamp: record.timestamp,
      category: 'OPERATOR',
      severity: record.severity || 'INFO',
      description: `Operator acknowledged: [${record.selectedDecision}] for ${record.conditionTitle}`,
      priorityScore: record.incidentId ? activeIncident?.priorityScore : null,
      operatorNote: record.operatorNote,
      selectedDecision: record.selectedDecision,
      acknowledged: true,
      status: 'CONFIRMED',
    };

    setTimelineEvents((prev) => {
      const updated = [...prev, newEvent].slice(-100);
      try {
        localStorage.setItem('aerotwin_advisory_events', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setModalState({ isOpen: false, incident: null, selectedDecision: '' });
  };

  return (
    <div className="adv-page-container">
      {/* 1. Page Title Ribbon */}
      <div className="adv-page-header">
        <div className="adv-page-header-left">
          <div className="adv-header-insignia">DT-AI-ADVISORY</div>
          <div>
            <h1 className="adv-page-title">AI ADVISORY — ENGINE HEALTH DECISION SUPPORT</h1>
            <p className="adv-page-subtitle">
              SITUATION-BASED FAULT PRIORITIZATION & OPERATIONAL DECISION GUIDANCE // ROTAX 915/916 iS
            </p>
          </div>
        </div>

        <div className="adv-page-header-right">
          <div className="adv-live-telemetry-pill">
            <span className="status-dot" style={{ backgroundColor: '#10b981' }} />
            <span className="font-mono text-xs font-bold">LIVE • DATA AGE: 0.1 s</span>
          </div>
        </div>
      </div>

      {/* 2. Main 3-Column Decision Support Workspace */}
      <div className="adv-workspace-grid">
        {/* Column 1: Priority Queue */}
        <div className="adv-grid-column">
          <AdvisoryQueue
            advisories={advisories}
            selectedId={selectedIncidentId}
            onSelectIncident={setSelectedIncidentId}
          />
        </div>

        {/* Column 2: Active Advisory & Recommendations */}
        <div className="adv-grid-column adv-column-center">
          <ActiveAdvisory
            incident={activeIncident}
            onRequestDecision={handleRequestDecision}
          />
        </div>

        {/* Column 3: Engine & Mission Context */}
        <div className="adv-grid-column">
          <MissionContext
            telemetry={telemetry}
            missionContext={missionContext}
          />
        </div>
      </div>

      {/* 3. Bottom Timeline & Decision Log */}
      <div className="adv-bottom-timeline-row">
        <AdvisoryTimeline
          events={timelineEvents}
          missionId={missionContext.missionId}
          uavId={missionContext.uavId}
        />
      </div>

      {/* 4. Operator Decision Modal */}
      <DecisionModal
        isOpen={modalState.isOpen}
        incident={modalState.incident}
        selectedDecision={modalState.selectedDecision}
        onConfirm={handleConfirmDecision}
        onClose={() => setModalState({ isOpen: false, incident: null, selectedDecision: '' })}
      />
    </div>
  );
}
