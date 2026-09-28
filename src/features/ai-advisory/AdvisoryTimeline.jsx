import React, { useState, useRef, useEffect } from 'react';
import { exportAdvisoryLogToCSV } from './exportAdvisoryLog';

const CATEGORY_FILTERS = ['ALL', 'AI', 'TELEMETRY', 'PHYSICS', 'OPERATOR', 'MAINTENANCE'];

/**
 * Bottom Section: Advisory Timeline, Decision Log & Acknowledgement History
 */
export default function AdvisoryTimeline({
  events = [],
  missionId = 'M-2025-07-14',
  uavId = 'UAV-03',
}) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const scrollRef = useRef(null);
  const isNearBottomRef = useRef(true);

  // Monitor user scroll position to avoid disrupting review of older events
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  useEffect(() => {
    if (isNearBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const filteredEvents = events.filter((ev) => {
    if (activeFilter === 'ALL') return true;
    return (ev.category || 'AI').toUpperCase() === activeFilter;
  });

  return (
    <div className="adv-timeline-container">
      {/* Timeline Controls Header */}
      <div className="adv-timeline-header">
        <div className="adv-timeline-title-wrap">
          <span className="adv-column-title">
            <span>📜</span> ADVISORY TIMELINE & DECISION LOG
          </span>
          <span className="font-mono text-muted text-xs">
            ({filteredEvents.length} / {events.length} EVENTS)
          </span>
        </div>

        <div className="adv-timeline-actions">
          {/* Category Filter Pills */}
          <div className="adv-filter-pills">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`adv-filter-pill ${activeFilter === cat ? 'active' : ''}`}
                onClick={() => setActiveFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            className="adv-export-btn"
            onClick={() => exportAdvisoryLogToCSV(events, missionId, uavId)}
            title="Download CSV log for post-mission engineering review"
          >
            <span>⬇️</span> Export Advisory Log
          </button>
        </div>
      </div>

      {/* Events Stream Table */}
      <div className="adv-timeline-stream" ref={scrollRef} onScroll={handleScroll}>
        <table className="adv-timeline-table">
          <thead>
            <tr>
              <th style={{ width: '85px' }}>TIME (UTC)</th>
              <th style={{ width: '95px' }}>CATEGORY</th>
              <th style={{ width: '85px' }}>SEVERITY</th>
              <th>EVENT / OBSERVATION / DECISION</th>
              <th style={{ width: '90px' }}>PRIORITY</th>
              <th style={{ width: '130px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((ev, idx) => {
              const sev = (ev.severity || 'INFO').toLowerCase();
              const isOperatorDecision = ev.category === 'OPERATOR';

              return (
                <tr key={ev.id || idx} className={isOperatorDecision ? 'row-operator-decision' : ''}>
                  <td className="font-mono font-bold text-muted">{ev.timeStr || ev.time || '14:30:00'}</td>
                  <td>
                    <span className={`adv-cat-tag cat-${(ev.category || 'ai').toLowerCase()}`}>
                      {ev.category || 'AI'}
                    </span>
                  </td>
                  <td>
                    <span className={`ai-badge badge-${sev}`}>{ev.severity || 'INFO'}</span>
                  </td>
                  <td className="adv-desc-cell">
                    <span className="adv-desc-text">{ev.description || ev.condition}</span>
                    {ev.operatorNote && (
                      <span className="adv-operator-note-bubble" title="Operator Note">
                        💬 Note: {ev.operatorNote}
                      </span>
                    )}
                  </td>
                  <td className="font-mono text-center font-bold">
                    {ev.priorityScore ? `P-${ev.priorityScore}` : '—'}
                  </td>
                  <td className="font-mono text-xs text-muted">
                    {ev.acknowledged ? '✓ ACKNOWLEDGED' : ev.status || 'RECORDED'}
                  </td>
                </tr>
              );
            })}

            {filteredEvents.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                  No events found matching filter '{activeFilter}'.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
