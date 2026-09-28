import React, { useState, useEffect } from 'react';

/**
 * Operator Decision Confirmation & Audit Logging Modal
 * Enforces non-control decision support boundaries (STANAG 4586 GCS).
 */
export default function DecisionModal({
  isOpen,
  incident,
  selectedDecision,
  onConfirm,
  onClose,
}) {
  const [operatorNote, setOperatorNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setOperatorNote('');
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !incident) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({
      incidentId: incident.id,
      conditionTitle: incident.title,
      severity: incident.severity,
      selectedDecision,
      operatorNote: operatorNote.trim(),
      timestamp: new Date().toISOString(),
      acknowledged: true,
    });
  };

  return (
    <div className="adv-modal-backdrop" role="dialog" aria-modal="true">
      <div className="adv-modal-card">
        <div className="adv-modal-header">
          <div className="adv-modal-title">
            <span>🛡️</span> RECORD OPERATOR DECISION SUPPORT
          </div>
          <button type="button" className="adv-modal-close-btn" onClick={onClose} title="Cancel (Esc)">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="adv-modal-body">
          <div className="adv-modal-field">
            <label className="adv-field-label">TARGET CONDITION</label>
            <div className="adv-condition-preview">
              <span className={`ai-badge badge-${(incident.severity || 'NORMAL').toLowerCase()}`}>
                {incident.severity}
              </span>
              <span className="font-bold text-primary">{incident.title}</span>
              <span className="font-mono text-muted text-xs">P-{incident.priorityScore}</span>
            </div>
          </div>

          <div className="adv-modal-field">
            <label className="adv-field-label">SELECTED OPERATIONAL DECISION</label>
            <div className="adv-selected-decision-box">
              {selectedDecision}
            </div>
          </div>

          <div className="adv-modal-warning-notice">
            <div className="font-bold text-warning" style={{ marginBottom: '4px' }}>
              ⚠️ ADVISORY ACKNOWLEDGEMENT ONLY
            </div>
            <div>
              This action records an operator acknowledgement and decision-support note into the digital twin mission logbook.
              It <strong>does not issue a flight-control, engine-control, throttle, autopilot, or mission route command</strong>.
            </div>
            <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#64748b' }}>
              Final operational authority remains with the authorized UAV commander and approved flight manuals/SOP.
            </div>
          </div>

          <div className="adv-modal-field">
            <label className="adv-field-label" htmlFor="operator-note-input">
              OPERATOR LOG NOTES (OPTIONAL)
            </label>
            <textarea
              id="operator-note-input"
              className="adv-modal-textarea"
              placeholder="Enter context, ATC coordination notes, or flight deck rationale..."
              rows={3}
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
            />
          </div>

          <div className="adv-modal-footer">
            <button type="button" className="adv-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="adv-btn-primary">
              ✓ Confirm and Log Decision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
