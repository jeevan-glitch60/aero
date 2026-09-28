/**
 * Military Standard Diagnostics View: Fault Isolation Matrix Table, Exceedance Feeds & RUL Bars
 */

class DiagnosticsView {
  constructor() {
    this.fimContainer = document.getElementById('fim-list-container');
    this.alarmsContainer = document.getElementById('alarms-feed-container');
    this.rulNumberEl = document.getElementById('rul-hours-val');
    this.rulBoundsEl = document.getElementById('rul-bounds-val');
    this.eohValEl = document.getElementById('eoh-hours-val');
    this.urgencyBadgeEl = document.getElementById('maintenance-urgency-badge');

    this.barLiner = document.getElementById('bar-wear-liner');
    this.barValve = document.getElementById('bar-wear-valve');
    this.barTurbo = document.getElementById('bar-wear-turbo');
    this.barOil = document.getElementById('bar-wear-oil');

    this.txtLiner = document.getElementById('val-wear-liner');
    this.txtValve = document.getElementById('val-wear-valve');
    this.txtTurbo = document.getElementById('val-wear-turbo');
    this.txtOil = document.getElementById('val-wear-oil');
  }

  updateHealth(healthData, residualsData) {
    if (!healthData) return;

    // 1. Update Fault Isolation Matrix (FIM) Table
    if (this.fimContainer) {
      if (!healthData.isolated_faults || healthData.isolated_faults.length === 0) {
        this.fimContainer.innerHTML = `
          <div style="padding: 12px; color: #64748b; font-size: 11px; font-family: var(--font-mono); background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 3px;">
            ✓ NO ACTIVE FAULT SIGNATURES DETECTED. ALL SUBSYSTEM INNOVATIONS CONVERGE WITHIN 3-SIGMA NOMINAL ENVELOPE.
          </div>
        `;
      } else {
        this.fimContainer.innerHTML = `
          <table class="mil-fim-table">
            <thead>
              <tr>
                <th>FAULT ID</th>
                <th>CLASSIFICATION</th>
                <th>CONFIDENCE</th>
                <th>CORRECTIVE MAINTENANCE ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${healthData.isolated_faults.map(f => `
                <tr>
                  <td><strong>${f.fault_id}</strong></td>
                  <td>
                    <div><strong>${f.name}</strong></div>
                    <div style="color: #64748b; font-size: 10px;">${f.category}</div>
                  </td>
                  <td>
                    <span class="match-score ${f.severity === 'CRITICAL' ? 'crit' : 'warn'}">
                      ${f.confidence_pct.toFixed(0)}% PROB
                    </span>
                  </td>
                  <td>
                    <div class="action-text">${f.recommended_action}</div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // 2. Update Alarms Feed
    if (this.alarmsContainer) {
      const allAlerts = [...(healthData.active_alarms || []), ...(healthData.active_cautions || [])];
      if (allAlerts.length === 0) {
        this.alarmsContainer.innerHTML = '<div style="color: #15803d; font-size: 11px; padding: 2px 4px; font-family: var(--font-mono);">ALL OPERATING LIMITS WITHIN NOMINAL CS-E TOLERANCE</div>';
      } else {
        this.alarmsContainer.innerHTML = allAlerts.map(a => `<div class="exceedance-item">${a}</div>`).join('');
      }
    }

    // 3. Update Anomaly Index & Mahalanobis
    const anomalyEl = document.getElementById('anomaly-score-text');
    const dMahalEl = document.getElementById('mahalanobis-dist-text');
    if (anomalyEl && residualsData) {
      anomalyEl.innerText = `${residualsData.anomaly_score_pct.toFixed(0)}%`;
      anomalyEl.style.color = residualsData.anomaly_score_pct > 50 ? '#b91c1c' : (residualsData.anomaly_score_pct > 25 ? '#b45309' : '#15803d');
    }
    if (dMahalEl && residualsData) {
      dMahalEl.innerText = `${residualsData.mahalanobis_distance.toFixed(2)}`;
    }
  }

  updateRUL(rulData) {
    if (!rulData) return;

    if (this.rulNumberEl) this.rulNumberEl.innerText = `${rulData.estimated_rul_hours.toFixed(0)} h`;
    if (this.rulBoundsEl) this.rulBoundsEl.innerText = `P10: ${rulData.rul_p10_hours.toFixed(0)}h | P90: ${rulData.rul_p90_hours.toFixed(0)}h`;
    if (this.eohValEl) this.eohValEl.innerText = `EQUIVALENT OPERATING HOURS: ${rulData.equivalent_operating_hours.toFixed(1)} h`;

    if (this.urgencyBadgeEl) {
      this.urgencyBadgeEl.innerText = rulData.maintenance_urgency.replace(/_/g, ' ');
      this.urgencyBadgeEl.className = 'mil-status-badge ' + (rulData.maintenance_urgency === 'NOMINAL_FLIGHT_READY' ? 'normal' : 'caution');
    }

    this.updateBar(this.barLiner, this.txtLiner, rulData.piston_rings_wear_pct);
    this.updateBar(this.barValve, this.txtValve, rulData.exhaust_valves_fatigue_pct);
    this.updateBar(this.barTurbo, this.txtTurbo, rulData.turbo_bearings_wear_pct);
    this.updateBar(this.barOil, this.txtOil, rulData.oil_aging_index_pct);
  }

  updateBar(barEl, txtEl, pct) {
    if (barEl) {
      barEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      barEl.className = 'mil-progress-fill ' + (pct > 75 ? 'crit' : (pct > 40 ? 'warn' : 'norm'));
    }
    if (txtEl) {
      txtEl.innerText = `${pct.toFixed(1)}%`;
    }
  }
}

window.DiagnosticsView = DiagnosticsView;
