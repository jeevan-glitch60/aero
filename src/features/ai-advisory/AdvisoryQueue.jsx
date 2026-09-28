import React, { useState, useMemo } from 'react';

function formatDuration(sec = 0) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const FILTER_OPTIONS = [
  { key: 'ALL', label: 'ALL' },
  { key: 'CRITICAL', label: 'CRIT' },
  { key: 'WARNING', label: 'WARN' },
  { key: 'ADVISORY', label: 'ADV' },
  { key: 'NORMAL', label: 'NORM' },
];

/**
 * Column 1: Priority Queue
 * Real-time sorted queue of competing engine conditions and degradation modes.
 */
export default function AdvisoryQueue({
  advisories = [],
  selectedId,
  onSelectIncident,
}) {
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAdvisories = useMemo(() => {
    return advisories.filter((item) => {
      if (categoryFilter !== 'ALL' && (item.severity || '').toUpperCase() !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const text = `${item.title} ${item.severity} ${item.status} ${item.id} ${item.category || ''}`.toLowerCase();
        if (!text.includes(searchQuery.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [advisories, categoryFilter, searchQuery]);

  const activeHigh = advisories.filter((a) => a.severity === 'CRITICAL' || a.severity === 'WARNING').length;
  const countLabel = activeHigh > 0 ? `${activeHigh} ALERT / ${advisories.length} TOTAL` : `${advisories.length} MONITORED`;

  return (
    <div className="adv-queue-container">
      <div className="adv-column-header">
        <div className="adv-column-title">
          <span>📑</span> PRIORITY QUEUE
        </div>
        <span className="adv-count-badge font-mono">{countLabel}</span>
      </div>

      {/* Queue Search and Category Filter Toolbar */}
      <div className="adv-queue-controls">
        <div className="adv-queue-search-wrap">
          <span className="adv-queue-search-icon">🔍</span>
          <input
            type="text"
            className="adv-queue-search-input"
            placeholder="Search subsystem or condition..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="adv-queue-filter-pills">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`adv-q-filter-pill ${categoryFilter === opt.key ? 'active' : ''}`}
              onClick={() => setCategoryFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="adv-queue-list">
        {filteredAdvisories.map((item) => {
          const isSelected = item.id === selectedId;
          const sev = (item.severity || 'NORMAL').toLowerCase();
          const shift = item.rankShift ?? 0;

          return (
            <div
              key={item.id}
              className={`adv-queue-card card-${sev} ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectIncident(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectIncident(item.id);
                }
              }}
            >
              {/* Top Row: Rank, Severity, Shift Indicator, Priority Score */}
              <div className="adv-card-top-row">
                <div className="adv-rank-sev-wrap">
                  <span className="adv-rank-num font-mono">{item.rankStr || '01'}</span>
                  <span className={`ai-badge badge-${sev}`}>{item.severity}</span>
                  {shift > 0 && (
                    <span className="adv-priority-shift-pill shift-up" title={`Rank elevated +${shift}`}>
                      ▲ +{shift}
                    </span>
                  )}
                  {shift < 0 && (
                    <span className="adv-priority-shift-pill shift-down" title={`Rank reduced -${Math.abs(shift)}`}>
                      ▼ -{Math.abs(shift)}
                    </span>
                  )}
                  {shift === 0 && (
                    <span className="adv-priority-shift-pill shift-same" title="Rank stable">
                      ―
                    </span>
                  )}
                </div>
                <div className="adv-priority-score font-mono">
                  P-{item.priorityScore ?? 50}
                </div>
              </div>

              {/* Middle Row: Title */}
              <div className="adv-card-title">{item.title}</div>

              {/* Bottom Row: Confidence, Persistence, Short Status */}
              <div className="adv-card-meta-row">
                <div className="adv-card-metrics">
                  <span className="adv-meta-item" title="Confidence Score">
                    <span className="adv-meta-icon">🎯</span> {item.confidence}%
                  </span>
                  <span className="adv-meta-item" title="Persistence Duration">
                    <span className="adv-meta-icon">⏱️</span> {formatDuration(item.persistenceSeconds)}
                  </span>
                </div>
                <div className="adv-card-status font-mono text-muted">
                  {item.status || 'Active'}
                </div>
              </div>
            </div>
          );
        })}

        {filteredAdvisories.length === 0 && (
          <div className="adv-empty-notice" style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '11px' }}>
            No advisories matching filter <strong>{categoryFilter}</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
