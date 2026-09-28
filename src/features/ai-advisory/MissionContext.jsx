import React from 'react';

/**
 * Column 3: Engine & Mission Context
 * Dense, read-only telemetry, operational envelope, and digital twin health context.
 */
export default function MissionContext({ telemetry = {}, missionContext = {} }) {
  const sensor = telemetry.sensor || telemetry;
  const health = telemetry.health || {};
  const residuals = telemetry.residuals || {};

  const rpm = Math.round(Number(sensor.engine_rpm ?? sensor.rpm ?? 5000));
  const maxCht = Array.isArray(sensor.cht_c) ? Math.max(...sensor.cht_c).toFixed(1) : (sensor.cht ?? 108.4).toFixed(1);
  const maxEgt = Array.isArray(sensor.egt_c) ? Math.max(...sensor.egt_c).toFixed(0) : (sensor.egt ?? 785).toFixed(0);
  const oilP = Number(sensor.oil_press_bar ?? sensor.oil_pressure ?? 3.8).toFixed(2);
  const oilT = Number(sensor.oil_temp_c ?? sensor.oil_temp ?? 82.0).toFixed(1);
  const fuelFlow = Number(sensor.fuel_flow_lph ?? sensor.fuel_flow ?? 24.5).toFixed(1);
  const vib = Number(sensor.vibration_g ?? sensor.vibration ?? 1.18).toFixed(2);

  const healthScore = Number(health.health_score_pct ?? telemetry.health_score ?? 92);
  const anomalyScorePct = Math.round(Number(residuals.anomaly_score_pct ?? (telemetry.anomaly_score ? telemetry.anomaly_score * 100 : 12)));

  const missionId = missionContext.missionId || 'M-2025-07-14';
  const uavId = missionContext.uavId || telemetry.uav_id || 'UAV-03';
  const phase = missionContext.phase || telemetry.mission_phase || 'CRUISE / LOITER';
  const alt = Number(sensor.altitude_m ?? 3000);
  const oat = Number(sensor.ambient_temp_c ?? -4.5).toFixed(1);
  const throttle = Number(sensor.throttle_pct ?? 75.0).toFixed(0);

  return (
    <div className="adv-context-container">
      <div className="adv-column-header">
        <div className="adv-column-title">
          <span>🌐</span> ENGINE & MISSION CONTEXT
        </div>
        <span className="adv-sync-pill font-mono">10 Hz SYNC</span>
      </div>

      <div className="adv-context-scroll-body">
        {/* 1. ENGINE STATE */}
        <div className="adv-context-card">
          <div className="adv-card-category-header">
            <span>⚙️</span> ENGINE STATE
          </div>
          <div className="adv-context-grid">
            <div className="adv-context-metric">
              <span className="label">RPM</span>
              <span className="val font-mono">{rpm}</span>
            </div>
            <div className="adv-context-metric">
              <span className="label">MAX CHT</span>
              <span className="val font-mono">{maxCht}°C</span>
            </div>
            <div className="adv-context-metric">
              <span className="label">MAX EGT</span>
              <span className="val font-mono">{maxEgt}°C</span>
            </div>
            <div className="adv-context-metric">
              <span className="label">OIL PRESS</span>
              <span className="val font-mono">{oilP} bar</span>
            </div>
            <div className="adv-context-metric">
              <span className="label">OIL TEMP</span>
              <span className="val font-mono">{oilT}°C</span>
            </div>
            <div className="adv-context-metric">
              <span className="label">FUEL FLOW</span>
              <span className="val font-mono">{fuelFlow} L/h</span>
            </div>
            <div className="adv-context-metric" style={{ gridColumn: 'span 2' }}>
              <span className="label">VIBRATION RMS</span>
              <span className="val font-mono">{vib} g</span>
            </div>
          </div>
        </div>

        {/* 2. HEALTH STATE */}
        <div className="adv-context-card">
          <div className="adv-card-category-header">
            <span>❤️</span> HEALTH STATE
          </div>
          <div className="adv-context-grid">
            <div className="adv-context-metric">
              <span className="label">HEALTH SCORE</span>
              <span className="val font-mono text-nominal">{healthScore} / 100</span>
            </div>
            <div className="adv-context-metric">
              <span className="label">HEALTH TREND</span>
              <span className="val font-mono">{telemetry.health_trend || 'Stable'}</span>
            </div>
            <div className="adv-context-metric">
              <span className="label">ANOMALY SCORE</span>
              <span className="val font-mono">{anomalyScorePct}%</span>
            </div>
            <div className="adv-context-metric">
              <span className="label">SENSOR CONF</span>
              <span className="val font-mono text-nominal">96%</span>
            </div>
          </div>
        </div>

        {/* 3. MISSION STATE */}
        <div className="adv-context-card">
          <div className="adv-card-category-header">
            <span>✈️</span> MISSION STATE
          </div>
          <div className="adv-context-rows">
            <div className="adv-context-row">
              <span className="label">MISSION ID</span>
              <span className="val font-mono">{missionId}</span>
            </div>
            <div className="adv-context-row">
              <span className="label">UAV CALLSIGN</span>
              <span className="val font-mono font-bold">{uavId}</span>
            </div>
            <div className="adv-context-row">
              <span className="label">PHASE</span>
              <span className="val mil-badge badge-normal">{phase}</span>
            </div>
            <div className="adv-context-row">
              <span className="label">ALTITUDE</span>
              <span className="val font-mono">{alt} m ({Math.round(alt * 3.28084)} ft)</span>
            </div>
            <div className="adv-context-row">
              <span className="label">OAT / AMBIENT</span>
              <span className="val font-mono">{oat}°C</span>
            </div>
            <div className="adv-context-row">
              <span className="label">THROTTLE LEVER</span>
              <span className="val font-mono">{throttle}%</span>
            </div>
          </div>
        </div>

        {/* 4. DATA SYSTEM STATE */}
        <div className="adv-context-card">
          <div className="adv-card-category-header">
            <span>📡</span> DATA SYSTEM STATE
          </div>
          <div className="adv-context-rows">
            <div className="adv-context-row">
              <span className="label">TELEMETRY LINK</span>
              <span className="val text-nominal font-bold">ONLINE (10 Hz)</span>
            </div>
            <div className="adv-context-row">
              <span className="label">DATA AGE</span>
              <span className="val font-mono">0.1 s</span>
            </div>
            <div className="adv-context-row">
              <span className="label">INFERENCE LATENCY</span>
              <span className="val font-mono">18 ms</span>
            </div>
            <div className="adv-context-row">
              <span className="label">TWIN SYNC STATE</span>
              <span className="val font-mono text-nominal">EKF Converged</span>
            </div>
            <div className="adv-context-row">
              <span className="label">MODEL VERSION</span>
              <span className="val font-mono text-muted">v2.4.0-stanag</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
