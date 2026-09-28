/**
 * Missions Tab Controller: Historical Missions & Reports
 * Features: Historical mission logs table, mission detail view with health
 * & RUL evolution charts, alert records, CSV export, and PDF printable report.
 */

class MissionsView {
  constructor() {
    this.missions = [];
    this.selectedMission = null;
    this.detailHealthChart = null;

    this.initChart();
    this.fetchMissions();
  }

  initChart() {
    this.detailHealthChart = new AeroTwinChart('mission-detail-chart-canvas', {
      xLabel: 'Mission Time (Hours)',
      leftUnit: '%',
      rightUnit: 'h',
      leftMin: 60,
      leftMax: 100,
      rightMin: 80,
      rightMax: 160,
      maxPoints: 30,
    });
    this.detailHealthChart.addSeries({ id: 'health', label: 'Health Score', color: '#00f59b', axis: 'left', lineWidth: 2.0 });
    this.detailHealthChart.addSeries({ id: 'rul', label: 'RUL Projection', color: '#06b6d4', axis: 'right', lineWidth: 1.8, dashed: true });

    // Seed initial mission curves
    const seed = [];
    for (let h = 0; h <= 18; h++) {
      seed.push({
        time: h,
        timestamp_str: `T+${h}h`,
        health: Math.round((100 - (h / 18) * 8) * 10) / 10,
        rul: Math.round((150 - h * 1.5) * 10) / 10,
      });
    }
    this.detailHealthChart.setData(seed);
  }

  async fetchMissions() {
    try {
      const res = await fetch('/api/missions');
      const data = await res.json();
      this.missions = data.missions || [];
      this.renderTable();
      if (this.missions.length > 0) {
        this.selectMission(this.missions[0].id);
      }
    } catch (e) {
      console.error('Error fetching missions:', e);
    }
  }

  renderTable() {
    const tbody = document.getElementById('missions-table-body');
    if (!tbody) return;

    tbody.innerHTML = this.missions.map(m => `
      <tr class="mission-row ${this.selectedMission && this.selectedMission.id === m.id ? 'selected' : ''}" onclick="window.missionsView.selectMission('${m.id}')">
        <td class="font-mono text-muted">${m.date}</td>
        <td><strong style="color: var(--text-primary);">${m.name}</strong><br><span style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">${m.id} // ${m.uav_id}</span></td>
        <td class="font-mono">${m.duration_h} h</td>
        <td class="font-mono">${m.max_alt_ft.toLocaleString()} ft</td>
        <td class="font-mono">${m.avg_rpm} RPM</td>
        <td class="font-mono">${m.max_cht_c}°C / ${m.max_egt_c}°C</td>
        <td><span class="mil-badge ${m.health_score >= 85 ? 'badge-normal' : 'badge-warning'}">${m.health_score}/100</span></td>
        <td><span class="mil-badge ${m.faults_count > 0 ? 'badge-warning' : 'badge-normal'}">${m.faults_count}</span></td>
        <td>
          <button class="table-btn" onclick="event.stopPropagation(); window.missionsView.selectMission('${m.id}')">View</button>
          <button class="table-btn" onclick="event.stopPropagation(); window.missionsView.exportCSV('${m.id}')">CSV</button>
        </td>
      </tr>
    `).join('');
  }

  async selectMission(missionId) {
    const m = this.missions.find(item => item.id === missionId);
    if (!m) return;
    this.selectedMission = m;
    this.renderTable();

    try {
      const res = await fetch(`/api/missions/${missionId}`);
      const detail = await res.json();
      this.renderDetail(detail);
    } catch (e) {
      console.error('Error fetching mission detail:', e);
    }
  }

  renderDetail(data) {
    const m = data.mission;
    const tl = data.timeline;

    const titleEl = document.getElementById('mission-detail-title');
    const metaEl = document.getElementById('mission-detail-meta');
    if (titleEl) titleEl.innerText = `${m.name} (${m.id})`;
    if (metaEl) metaEl.innerText = `UAV: ${m.uav_id} • Duration: ${m.duration_h} Hours • Mission Type: ${m.type} • Status: COMPLETED`;

    // Summary Stats
    const statsContainer = document.getElementById('mission-detail-stats-grid');
    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="hud-cell"><span class="label">AVG RPM</span><span class="value">${m.avg_rpm}</span></div>
        <div class="hud-cell"><span class="label">MAX ALTITUDE</span><span class="value">${m.max_alt_ft.toLocaleString()} FT</span></div>
        <div class="hud-cell"><span class="label">MAX CHT</span><span class="value">${m.max_cht_c}°C</span></div>
        <div class="hud-cell"><span class="label">MAX EGT</span><span class="value">${m.max_egt_c}°C</span></div>
        <div class="hud-cell"><span class="label">HEALTH SCORE</span><span class="value" style="color: ${m.health_score >= 85 ? 'var(--color-nominal)' : 'var(--color-warning)'}">${m.health_score}/100</span></div>
        <div class="hud-cell"><span class="label">DAMAGE ACCRUAL</span><span class="value">${m.damage_pct}%</span></div>
      `;
    }

    // Render Health & RUL curves
    if (this.detailHealthChart && tl) {
      const pts = tl.hours.map((h, i) => ({
        time: h,
        timestamp_str: `T+${h.toFixed(1)}h`,
        health: tl.health_score[i],
        rul: tl.rul_hours[i],
      }));
      this.detailHealthChart.setData(pts);
    }

    // Render Alerts
    const alertsContainer = document.getElementById('mission-detail-alerts-list');
    if (alertsContainer) {
      if (data.alerts && data.alerts.length > 0) {
        alertsContainer.innerHTML = data.alerts.map(a => `
          <div class="log-entry">
            <span class="log-time font-mono">${a.time}</span>
            <span class="mil-badge badge-${a.severity.toLowerCase()}">${a.severity}</span>
            <strong style="color: var(--text-primary);">${a.type}:</strong>
            <span>${a.message}</span>
          </div>
        `).join('');
      } else {
        alertsContainer.innerHTML = `<div style="color: var(--color-nominal); font-size: 11px; padding: 6px 0;">No exceedances or faults recorded during mission flight envelope.</div>`;
      }
    }
  }

  exportCSV(missionId) {
    const m = this.missions.find(item => item.id === (missionId || (this.selectedMission && this.selectedMission.id)));
    if (!m) return;

    const rows = [
      ['Time_H', 'Engine_RPM', 'Max_CHT_C', 'Max_EGT_C', 'Oil_Press_bar', 'Health_Score'],
    ];

    for (let h = 0; h <= m.duration_h; h += 0.5) {
      rows.push([
        h.toFixed(1),
        (m.avg_rpm + Math.sin(h) * 120).toFixed(0),
        (m.max_cht_c - 15 + Math.sin(h / 2) * 12).toFixed(1),
        (m.max_egt_c - 35 + Math.cos(h / 3) * 25).toFixed(1),
        (3.8 - (h / m.duration_h) * 0.4).toFixed(2),
        (m.health_score - (h / m.duration_h) * 3).toFixed(1),
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `Mission_${m.id}_Telemetry_Log.csv`;
    link.click();
  }

  downloadReport() {
    if (!this.selectedMission) return;
    const m = this.selectedMission;
    window.print();
  }
}

window.MissionsView = MissionsView;
