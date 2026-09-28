/**
 * ============================================================================
 * AEROTWIN // DEFENCE-GRADE INTEGRATION & ASSURANCE VIEW CONTROLLER
 * ============================================================================
 * Manages the UI presentation for the 7 assurance sub-tabs:
 * 1. Data Gateway
 * 2. Data Quality
 * 3. Cybersecurity
 * 4. Model Assurance
 * 5. Audit & Traceability
 * 6. Degraded Operations
 * 7. Deployment Roadmap
 */

class AssuranceView {
  constructor() {
    this.mgr = window.assuranceManager;
    this.activeSubTab = 'gateway';
    this.selectedEngineType = 'BOXER';
    this.auditFilterRole = 'ALL';
    this.auditFilterEngine = 'ALL';
    this.auditFilterAction = 'ALL';

    this.initSubTabs();
    this.renderAll();

    // Start background refresh of live gateway frame & quality status
    setInterval(() => {
      if (document.getElementById('view-assurance')?.style.display !== 'none') {
        if (this.activeSubTab === 'gateway') this.updateLiveFrame();
        if (this.activeSubTab === 'quality') this.renderQualityTab();
        if (this.activeSubTab === 'degraded') this.renderDegradedTab();
      }
    }, 1000);
  }

  initSubTabs() {
    document.querySelectorAll('.assurance-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const subTab = btn.getAttribute('data-subtab');
        this.switchSubTab(subTab);
      });
    });
  }

  switchSubTab(subTabId) {
    this.activeSubTab = subTabId;
    document.querySelectorAll('.assurance-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-subtab') === subTabId);
    });

    document.querySelectorAll('.assurance-pane').forEach(p => {
      p.classList.toggle('active', p.id === `assurance-pane-${subTabId}`);
    });

    if (subTabId === 'gateway') this.renderGatewayTab();
    if (subTabId === 'quality') this.renderQualityTab();
    if (subTabId === 'cyber') this.renderCybersecurityTab();
    if (subTabId === 'model') this.renderModelAssuranceTab();
    if (subTabId === 'audit') this.renderAuditTab();
    if (subTabId === 'degraded') this.renderDegradedTab();
    if (subTabId === 'roadmap') this.renderRoadmapTab();
  }

  renderAll() {
    this.renderGatewayTab();
    this.renderQualityTab();
    this.renderCybersecurityTab();
    this.renderModelAssuranceTab();
    this.renderAuditTab();
    this.renderDegradedTab();
    this.renderRoadmapTab();
  }

  // ==========================================================================
  // TAB 1: DATA GATEWAY
  // ==========================================================================
  renderGatewayTab() {
    const container = document.getElementById('assurance-gateway-content');
    if (!container) return;

    const activeAdapter = this.mgr.getActiveAdapter();

    container.innerHTML = `
      <!-- Visual Data Path Flowchart -->
      <div class="data-path-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:13px; font-weight:800; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.5px;">
            📡 Authorized Telemetry Gateway Architecture (Visual Data Path)
          </h3>
          <span style="font-size:10px; font-family:var(--font-mono); color:#059669; font-weight:700; background:#ecfdf5; padding:2px 8px; border-radius:4px; border:1px solid #a7f3d0;">
            UNIDIRECTIONAL AIR-GAPPED MIRROR // READ-ONLY
          </span>
        </div>
        <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
          The Digital Twin is strictly isolated from flight-control interfaces. It receives only decoded, authorized telemetry via a read-only mirror. Direct control, encryption bypass, or radio transmission is structurally prohibited.
        </p>

        <div class="data-path-flow">
          <div class="data-node">
            <div class="node-type">On-Engine Sensors</div>
            <div class="node-name">RTD / Piezo / Hall</div>
            <div class="node-state">Physical Signals</div>
          </div>
          <div class="data-arrow">➔</div>
          <div class="data-node">
            <div class="node-type">Engine Control</div>
            <div class="node-name">ECU / FADEC</div>
            <div class="node-state">Dual Channels A/B</div>
          </div>
          <div class="data-arrow">➔</div>
          <div class="data-node">
            <div class="node-type">Avionics Bus</div>
            <div class="node-name">CAN / SocketCAN</div>
            <div class="node-state">1 Mbps Isolated</div>
          </div>
          <div class="data-arrow">➔</div>
          <div class="data-node active-gateway">
            <div class="node-type">Authorized GCS</div>
            <div class="node-name">STANAG Decoder</div>
            <div class="node-state">Payload Parser</div>
          </div>
          <div class="data-arrow unidirectional">
            ➔<span style="display:block; font-size:9px; font-weight:800; color:#0284c7;">READ-ONLY</span>
          </div>
          <div class="data-node active-gateway" style="border-color:#7c3aed; background:#faf5ff;">
            <div class="node-type">Gateway Ingestion</div>
            <div class="node-name">Telemetry Mirror</div>
            <div class="node-state" style="color:#7c3aed;">Rate-Limited Buffer</div>
          </div>
          <div class="data-arrow">➔</div>
          <div class="data-node twin-core">
            <div class="node-type">Digital Twin Core</div>
            <div class="node-name">AeroTwin Physics & AI</div>
            <div class="node-state">Advisory Analytics</div>
          </div>
        </div>
      </div>

      <!-- Adapter Selector Grid -->
      <div style="margin-top:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:13px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
            🔌 Telemetry Ingestion Adapters (Demonstrator Stubs)
          </h3>
          <span style="font-size:11px; color:var(--text-muted);">
            Active Source: <strong style="color:#0284c7;">${activeAdapter.adapterName}</strong>
          </span>
        </div>

        <div class="adapters-grid">
          ${Object.entries(this.mgr.adapters).map(([key, a]) => {
            const isActive = a.isActive;
            return `
              <div class="adapter-card ${isActive ? 'active' : ''}">
                <div class="adapter-card-header">
                  <div>
                    <div class="adapter-title">${a.adapterName}</div>
                    <div style="font-size:10px; color:var(--text-muted); font-family:var(--font-mono);">${a.adapterId}</div>
                  </div>
                  ${a.isMock ? '<span class="mock-adapter-badge">Mock Adapter — No Live Link</span>' : '<span class="mock-adapter-badge" style="background:#e0f2fe; color:#0369a1;">Synthetic Core</span>'}
                </div>

                <div class="adapter-status-row">
                  <span class="status-dot" style="background:${isActive ? '#059669' : '#94a3b8'};"></span>
                  <strong style="color:${isActive ? '#059669' : '#64748b'};">${a.connectionStatus}</strong>
                </div>

                <div class="adapter-meta-grid">
                  <div><span class="label">Rate:</span> <span class="val">${a.messageRateHz} Hz</span></div>
                  <div><span class="label">Latency:</span> <span class="val">${a.latencyMs} ms</span></div>
                  <div><span class="label">Packet Loss:</span> <span class="val">${a.packetLossPercent}%</span></div>
                  <div><span class="label">Read-Only:</span> <span class="val" style="color:#059669;">TRUE</span></div>
                  <div style="grid-column:1 / span 2;"><span class="label">Source:</span> <span class="val" style="font-size:10px;">${a.dataSource}</span></div>
                </div>

                <p style="font-size:10px; color:#64748b; font-style:italic;">${a.notes}</p>

                <button class="table-btn adapter-select-btn" onclick="window.assuranceView.handleAdapterSelect('${key}')" ${isActive ? 'disabled style="background:#e2e8f0; color:#64748b;"' : ''}>
                  ${isActive ? '✓ CURRENTLY ACTIVE INGESTION' : 'ACTIVATE ADAPTER'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Normalized Live Message Frame Inspector -->
      <div style="margin-top:18px; background:var(--bg-surface); border:1px solid var(--border-main); border-radius:var(--radius-md); padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h4 style="font-size:12px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
            📋 Normalized Telemetry Message Frame (Live Stream Inspection)
          </h4>
          <span style="font-size:10px; font-family:var(--font-mono); color:#64748b;">
            Schema: ${activeAdapter.schemaVersion} // Read-Only Verified
          </span>
        </div>
        <pre id="assurance-live-json-preview" style="background:#0f172a; color:#38bdf8; padding:14px; border-radius:6px; font-family:var(--font-mono); font-size:11px; overflow-x:auto; max-height:220px;">Loading normalized frame...</pre>
      </div>
    `;

    this.updateLiveFrame();
  }

  handleAdapterSelect(adapterKey) {
    if (this.mgr.selectAdapter(adapterKey)) {
      this.renderGatewayTab();
    }
  }

  updateLiveFrame() {
    const jsonEl = document.getElementById('assurance-live-json-preview');
    if (!jsonEl) return;
    const frame = this.mgr.getNormalizedFrame();
    jsonEl.innerText = JSON.stringify(frame, null, 2);
  }

  // ==========================================================================
  // TAB 2: DATA QUALITY
  // ==========================================================================
  renderQualityTab() {
    const container = document.getElementById('assurance-quality-content');
    if (!container) return;

    const qm = this.mgr.qualityMetrics;
    const activeFaultsCount = Object.values(this.mgr.qualityFaults).filter(f => f.active).length;
    const isDegraded = qm.dataConfidenceScore < 85;

    container.innerHTML = `
      <!-- Live Quality Console Header & Metric Cards -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div>
          <h3 style="font-size:13px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
            🔍 Live Telemetry Trust & Data Quality Console
          </h3>
          <p style="font-size:11px; color:var(--text-muted);">
            Continuous plausibility validation, sequence continuity, and physical law conformance check.
          </p>
        </div>
        <div style="text-align:right;">
          <span style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Data Confidence Index:</span>
          <div style="font-size:22px; font-family:var(--font-mono); font-weight:800; color:${qm.dataConfidenceScore >= 85 ? '#059669' : (qm.dataConfidenceScore >= 65 ? '#d97706' : '#7c3aed')};">
            ${qm.dataConfidenceScore} / 100
          </div>
        </div>
      </div>

      <!-- Trust Chain Visualization -->
      <div class="trust-chain-wrapper">
        <h4 style="font-size:11px; font-weight:800; color:var(--text-primary); text-transform:uppercase; margin-bottom:4px;">
          ⛓️ Telemetry Trust Chain Pipeline
        </h4>
        <div class="trust-chain-nodes">
          <div class="trust-step ${qm.packetLossPct < 20 ? 'nominal' : 'degraded'}">
            <div class="trust-circle">1</div>
            <div class="trust-step-label">Raw Frame</div>
          </div>
          <div class="trust-connector ${qm.packetLossPct < 20 ? 'active' : 'purple'}"></div>

          <div class="trust-step ${qm.rangeValidationStatus === 'PASS' ? 'nominal' : 'degraded'}">
            <div class="trust-circle">2</div>
            <div class="trust-step-label">Validation</div>
          </div>
          <div class="trust-connector ${qm.rangeValidationStatus === 'PASS' ? 'active' : 'purple'}"></div>

          <div class="trust-step nominal">
            <div class="trust-circle">3</div>
            <div class="trust-step-label">Normalization</div>
          </div>
          <div class="trust-connector active"></div>

          <div class="trust-step ${qm.dataConfidenceScore >= 80 ? 'nominal' : 'degraded'}">
            <div class="trust-circle">4</div>
            <div class="trust-step-label">Quality Score</div>
          </div>
          <div class="trust-connector ${qm.dataConfidenceScore >= 80 ? 'active' : 'purple'}"></div>

          <div class="trust-step nominal">
            <div class="trust-circle">5</div>
            <div class="trust-step-label">Twin Ingestion</div>
          </div>
          <div class="trust-connector active"></div>

          <div class="trust-step ${qm.dataConfidenceScore >= 70 ? 'nominal' : 'degraded'}">
            <div class="trust-circle">6</div>
            <div class="trust-step-label">Health Analytics</div>
          </div>
          <div class="trust-connector ${qm.dataConfidenceScore >= 70 ? 'active' : 'purple'}"></div>

          <div class="trust-step nominal">
            <div class="trust-circle">7</div>
            <div class="trust-step-label">Operator Display</div>
          </div>
        </div>
      </div>

      <!-- 12 Live Data Quality Metrics Grid -->
      <div class="quality-metrics-grid">
        <div class="quality-metric-card">
          <div class="q-title">Data Freshness</div>
          <div class="q-val">${qm.freshnessAgeMs} ms</div>
          <div class="q-sub">Last update age</div>
        </div>

        <div class="quality-metric-card">
          <div class="q-title">Packet Rate</div>
          <div class="q-val">${qm.packetRateHz} Hz</div>
          <div class="q-sub">Target 10.0 Hz</div>
        </div>

        <div class="quality-metric-card">
          <div class="q-title">Sequence Continuity</div>
          <div class="q-val" style="color:${qm.sequenceContinuityPct >= 99 ? '#059669' : '#7c3aed'};">${qm.sequenceContinuityPct}%</div>
          <div class="q-sub">Frame monotonically rising</div>
        </div>

        <div class="quality-metric-card">
          <div class="q-title">Packet Loss</div>
          <div class="q-val" style="color:${qm.packetLossPct === 0 ? '#059669' : '#7c3aed'};">${qm.packetLossPct.toFixed(1)}%</div>
          <div class="q-sub">Burst detector active</div>
        </div>

        <div class="quality-metric-card">
          <div class="q-title">Datalink Latency</div>
          <div class="q-val" style="color:${qm.latencyMs < 50 ? '#059669' : '#7c3aed'};">${qm.latencyMs} ms</div>
          <div class="q-sub">Mirror round-trip</div>
        </div>

        <div class="quality-metric-card">
          <div class="q-title">Jitter Metric</div>
          <div class="q-val">${qm.jitterMs} ms</div>
          <div class="q-sub">Standard deviation</div>
        </div>

        <div class="quality-metric-card">
          <div class="q-title">Missing Values</div>
          <div class="q-val" style="color:${qm.missingValueRatePct === 0 ? '#059669' : '#7c3aed'};">${qm.missingValueRatePct}%</div>
          <div class="q-sub">Dropped attributes</div>
        </div>

        <div class="quality-metric-card">
          <div class="q-title">Range Validation</div>
          <div class="q-val" style="color:${qm.rangeValidationStatus === 'PASS' ? '#059669' : '#dc2626'};">${qm.rangeValidationStatus}</div>
          <div class="q-sub">Physical hard limits</div>
        </div>

        <div class="quality-metric-card">
          <div class="q-title">Timestamp Validation</div>
          <div class="q-val" style="color:${qm.timestampValidationStatus === 'PASS' ? '#059669' : '#7c3aed'};">${qm.timestampValidationStatus}</div>
          <div class="q-sub">Clock drift / rollback</div>
        </div>

        <div class="quality-metric-card">
          <div class="q-title">Sensor Plausibility</div>
          <div class="q-val" style="color:${qm.sensorPlausibilityStatus === 'PASS' ? '#059669' : '#7c3aed'};">${qm.sensorPlausibilityStatus}</div>
          <div class="q-sub">Multi-sensor correlation</div>
        </div>

        <div class="quality-metric-card purple-theme">
          <div class="q-title">Physics Consistency</div>
          <div class="q-val" style="color:#7c3aed;">${qm.physicsConsistencyScore}%</div>
          <div class="q-sub">1st-law energy balance</div>
        </div>

        <div class="quality-metric-card purple-theme">
          <div class="q-title">Ingestion Source</div>
          <div class="q-val" style="font-size:14px; text-transform:uppercase; color:#7c3aed;">${qm.sourceMode}</div>
          <div class="q-sub">Adapter mode</div>
        </div>
      </div>

      <!-- Purple Prediction Confidence Degradation Explanation Banner -->
      ${isDegraded ? `
        <div class="quality-confidence-banner">
          <span style="font-size:18px;">⚠️</span>
          <div>
            <strong>Prediction confidence reduced because telemetry quality is degraded.</strong>
            <div style="font-size:11px; margin-top:2px;">
              Data-quality faults are distinguished from mechanical engine failures (marked in purple). When data trust drops, RUL bounds widen and diagnostic certainty is automatically downgraded.
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Simulated Data Quality Fault Injection (Color Coded Purple) -->
      <div class="fault-injection-box">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="font-size:12px; font-weight:800; color:#581c87; text-transform:uppercase;">
              🧪 Simulated Data Quality Fault Injection (Purple Indicators)
            </h4>
            <p style="font-size:11px; color:#7e22ce;">
              Demonstrates that the Digital Twin differentiates bad telemetry from physical engine destruction without false alarms.
            </p>
          </div>
          <span class="purple-badge">${activeFaultsCount} Active Quality Fault(s)</span>
        </div>

        <div class="fault-grid">
          ${Object.entries(this.mgr.qualityFaults).map(([key, f]) => {
            return `
              <button class="fault-toggle-btn ${f.active ? 'active' : ''}" onclick="window.assuranceView.handleToggleQualityFault('${key}')">
                <span>${f.name}</span>
                <span style="font-family:var(--font-mono); font-size:10px;">${f.active ? '● ACTIVE' : '○ OFF'}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  handleToggleQualityFault(faultKey) {
    this.mgr.toggleQualityFault(faultKey);
    this.renderQualityTab();
  }

  // ==========================================================================
  // TAB 3: CYBERSECURITY
  // ==========================================================================
  renderCybersecurityTab() {
    const container = document.getElementById('assurance-cyber-content');
    if (!container) return;

    const currentRole = this.mgr.currentRole;

    container.innerHTML = `
      <div style="margin-bottom:14px;">
        <h3 style="font-size:13px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
          🛡️ Non-Operational Cybersecurity Architecture Visualizer
        </h3>
        <p style="font-size:11px; color:var(--text-muted);">
          Conceptual security architecture for future operational deployment. No intrusive penetration or bypass tools are implemented.
        </p>
      </div>

      <!-- Security Posture Card -->
      <div class="security-posture-card">
        <h4 style="font-size:11px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
          🔒 Security Posture & Safeguards
        </h4>
        <div class="security-posture-grid">
          <div class="posture-item">
            <span class="posture-label">Read-Only Telemetry Ingestion</span>
            <span class="posture-status-pill enabled">ENABLED [AIR-GAPPED]</span>
          </div>
          <div class="posture-item">
            <span class="posture-label">Synthetic Data Enclave</span>
            <span class="posture-status-pill enabled">ENABLED [LOCAL]</span>
          </div>
          <div class="posture-item">
            <span class="posture-label">Mock External Adapters</span>
            <span class="posture-status-pill enabled">ENABLED [NON-LIVE]</span>
          </div>
          <div class="posture-item">
            <span class="posture-label">Tamper-Evident Audit Logging</span>
            <span class="posture-status-pill enabled">ENABLED [VERIFIED]</span>
          </div>
          <div class="posture-item">
            <span class="posture-label">Direct Flight Control Commands</span>
            <span class="posture-status-pill disabled-safe">DISABLED [BY DESIGN]</span>
          </div>
          <div class="posture-item">
            <span class="posture-label">Live Aircraft Connectivity</span>
            <span class="posture-status-pill disabled-safe">DISABLED [NON-CONNECTED]</span>
          </div>
        </div>
      </div>

      <!-- Security Concepts Architecture Grid -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin-top:14px;">
        <div style="background:var(--bg-surface); border:1px solid var(--border-main); border-radius:var(--radius-md); padding:12px;">
          <h4 style="font-size:11px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">1. Network Segregation</h4>
          <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
            Digital Twin workstation resides in a dedicated advisory VLAN separated from mission command-and-control links via hardware diode.
          </p>
        </div>

        <div style="background:var(--bg-surface); border:1px solid var(--border-main); border-radius:var(--radius-md); padding:12px;">
          <h4 style="font-size:11px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">2. Cryptographically Signed Telemetry</h4>
          <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
            Future deployment expects Ed25519-signed telemetry batches from the authorized GCS decoder to guarantee source authenticity.
          </p>
        </div>

        <div style="background:var(--bg-surface); border:1px solid var(--border-main); border-radius:var(--radius-md); padding:12px;">
          <h4 style="font-size:11px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">3. Role-Based Access Control (RBAC)</h4>
          <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
            Granular permissions govern alert acknowledgment, scenario execution, and adapter configuration based on verified roles.
          </p>
        </div>

        <div style="background:var(--bg-surface); border:1px solid var(--border-main); border-radius:var(--radius-md); padding:12px;">
          <h4 style="font-size:11px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">4. Secure Model Update Signing</h4>
          <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
            Digital Twin neural weights and MVEM polynomial parameters require air-gapped cryptographic signatures before loading into memory.
          </p>
        </div>
      </div>

      <!-- Role-Based Access Control Demonstrator Matrix -->
      <div style="margin-top:16px; background:var(--bg-surface); border:1px solid var(--border-main); border-radius:var(--radius-md); padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h4 style="font-size:12px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
            👥 User Roles & Demonstrator Permissions Matrix
          </h4>
          <div>
            <span style="font-size:11px; color:var(--text-muted);">Current Active Role: </span>
            <span id="security-current-role-badge" style="font-family:var(--font-mono); font-size:11px; font-weight:800; color:#0284c7; background:#e0f2fe; padding:2px 8px; border-radius:4px;">
              ${currentRole}
            </span>
          </div>
        </div>

        <table class="roles-matrix-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>View Health</th>
              <th>Acknowledge Alerts</th>
              <th>Run Scenarios</th>
              <th>Inject Faults</th>
              <th>Configure Adapters</th>
              <th>Export Logs</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(this.mgr.rolePermissions).map(([role, p]) => {
              const isCurrent = (role === currentRole);
              return `
                <tr style="${isCurrent ? 'background:#f0f9ff; font-weight:700;' : ''}">
                  <td>
                    <strong>${role}</strong>
                    ${isCurrent ? ' <span style="color:#0284c7; font-size:10px;">[ACTIVE]</span>' : ''}
                  </td>
                  <td>${p.canView ? '✅' : '❌'}</td>
                  <td>${p.canAckAlerts ? '✅' : '❌'}</td>
                  <td>${p.canRunScenarios ? '✅' : '❌'}</td>
                  <td>${p.canInjectFaults ? '✅' : '❌'}</td>
                  <td>${p.canConfigureAdapters ? '✅' : '❌'}</td>
                  <td>${p.canExportAudit ? '✅' : '❌'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ==========================================================================
  // TAB 4: MODEL ASSURANCE
  // ==========================================================================
  renderModelAssuranceTab() {
    const container = document.getElementById('assurance-model-content');
    if (!container) return;

    const engineKey = this.selectedEngineType || 'BOXER';
    const meta = this.mgr.modelAssuranceCatalog[engineKey];
    const adjustedConfidence = this.mgr.getAdjustedModelConfidence(engineKey);
    const explain = this.mgr.getExplainabilityHypothesis(engineKey, true);

    container.innerHTML = `
      <div style="margin-bottom:12px;">
        <h3 style="font-size:13px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
          🧠 Model Confidence, Assumptions & Limitations
        </h3>
        <p style="font-size:11px; color:var(--text-muted);">
          Rigorous transparency regarding algorithmic basis, training envelope, and unvalidated boundary conditions.
        </p>
      </div>

      <!-- Engine Selector -->
      <div class="assurance-engine-selector">
        <button class="assurance-engine-btn ${engineKey === 'HEAVY_FUEL_CI' ? 'active' : ''}" onclick="window.assuranceView.selectEngineAssurance('HEAVY_FUEL_CI')">
          ⛽ Heavy-Fuel CI Engine
        </button>
        <button class="assurance-engine-btn ${engineKey === 'BOXER' ? 'active' : ''}" onclick="window.assuranceView.selectEngineAssurance('BOXER')">
          🥊 Boxer Opposed Engine
        </button>
        <button class="assurance-engine-btn ${engineKey === 'WANKEL_ROTARY' ? 'active' : ''}" onclick="window.assuranceView.selectEngineAssurance('WANKEL_ROTARY')">
          🔄 Wankel Rotary Engine
        </button>
        <button class="assurance-engine-btn ${engineKey === 'TURBO_INLINE_V' ? 'active' : ''}" onclick="window.assuranceView.selectEngineAssurance('TURBO_INLINE_V')">
          🌪️ Turbocharged Inline/V Engine
        </button>
      </div>

      <!-- Model Specifications Grid -->
      <div style="background:var(--bg-surface); border:1px solid var(--border-main); border-radius:var(--radius-md); padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-muted); padding-bottom:8px; margin-bottom:12px;">
          <div>
            <h4 style="font-size:13px; font-weight:800; color:var(--text-primary);">${meta.engineName}</h4>
            <span style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted);">${meta.modelVersion} // ${meta.aiModelVersion}</span>
          </div>
          <div style="text-align:right;">
            <span style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Model Confidence:</span>
            <div style="font-size:20px; font-family:var(--font-mono); font-weight:800; color:${adjustedConfidence >= 75 ? '#059669' : '#d97706'};">
              ${adjustedConfidence}%
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px; font-size:11px;">
          <div><strong>Training-Data Source:</strong> <span style="color:#0284c7;">${meta.trainingDataSource}</span></div>
          <div><strong>Physics Model Basis:</strong> <span style="color:#059669;">${meta.physicsBasis}</span></div>
          <div><strong>Validation State:</strong> <span style="color:#d97706; font-weight:700;">${meta.validationState}</span></div>
          <div><strong>RUL Confidence Band:</strong> <span style="font-family:var(--font-mono);">${meta.rulConfidenceBand}</span></div>
          <div><strong>Simulation Version:</strong> <span style="font-family:var(--font-mono);">${meta.simVersion}</span></div>
          <div><strong>Telemetry Schema:</strong> <span style="font-family:var(--font-mono);">${meta.schemaVersion}</span></div>
        </div>

        <!-- Known Limitations & Required Validation Evidence -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:14px; border-top:1px solid var(--border-muted); padding-top:12px;">
          <div style="background:#fffbeb; border:1px solid #fef3c7; padding:10px 12px; border-radius:var(--radius-sm);">
            <h5 style="font-size:10px; font-weight:800; color:#b45309; text-transform:uppercase; margin-bottom:4px;">⚠️ Known Mathematical Limitations</h5>
            <ul style="font-size:11px; color:#78350f; padding-left:16px; line-height:1.5;">
              ${meta.knownLimitations.map(lim => `<li>${lim}</li>`).join('')}
            </ul>
          </div>

          <div style="background:#f0fdf4; border:1px solid #dcfce7; padding:10px 12px; border-radius:var(--radius-sm);">
            <h5 style="font-size:10px; font-weight:800; color:#15803d; text-transform:uppercase; margin-bottom:4px;">📋 Required Future Validation Evidence</h5>
            <ul style="font-size:11px; color:#14532d; padding-left:16px; line-height:1.5;">
              ${meta.requiredFutureEvidence.map(ev => `<li>${ev}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>

      <!-- Explainability Panel (Prompt Requirement) -->
      <div class="explainability-card">
        <h4 style="font-size:12px; font-weight:800; color:#0369a1; text-transform:uppercase;">
          🔍 Algorithmic Explainability & Hypothesis Panel
        </h4>
        <p style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
          Non-absolute, evidence-backed diagnostic reasoning with alternative hypotheses.
        </p>

        <div class="explain-grid">
          <div class="explain-section">
            <h4>Expected State (Nominal Twin)</h4>
            <p>${explain.expectedState}</p>
          </div>
          <div class="explain-section">
            <h4>Observed State (Sensors)</h4>
            <p>${explain.observedState}</p>
          </div>
          <div class="explain-section">
            <h4>Difference / Residual</h4>
            <p style="font-family:var(--font-mono); color:#dc2626; font-weight:700;">${explain.residual}</p>
          </div>
          <div class="explain-section">
            <h4>Top Contributing Parameters</h4>
            <p>${explain.topContributingParameters.join(' • ')}</p>
          </div>
          <div class="explain-section" style="grid-column:1 / span 2; background:#f0f9ff; border-color:#bae6fd;">
            <h4>Primary Fault Hypothesis</h4>
            <p style="font-size:12px; font-weight:700; color:#0369a1;">${explain.faultHypothesis}</p>
          </div>
          <div class="explain-section">
            <h4>Alternative Hypotheses</h4>
            <p style="color:#7c3aed;">${explain.alternativeHypotheses}</p>
          </div>
          <div class="explain-section">
            <h4>Confidence Level</h4>
            <p style="font-weight:700; color:#059669;">${explain.confidence}</p>
          </div>
          <div class="explain-section" style="grid-column:1 / span 2;">
            <h4>Recommended Follow-Up Action</h4>
            <p style="color:#0f172a;">${explain.recommendedFollowUp}</p>
            <div style="font-size:10px; color:#64748b; margin-top:6px; font-style:italic;">
              Boundary Note: ${explain.systemLimit}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  selectEngineAssurance(engineKey) {
    this.selectedEngineType = engineKey;
    this.renderModelAssuranceTab();
  }

  // ==========================================================================
  // TAB 5: AUDIT & TRACEABILITY
  // ==========================================================================
  renderAuditTab() {
    const container = document.getElementById('assurance-audit-content');
    if (!container) return;

    let logs = this.mgr.auditLogs;

    if (this.auditFilterRole !== 'ALL') {
      logs = logs.filter(l => l.userRole === this.auditFilterRole);
    }
    if (this.auditFilterEngine !== 'ALL') {
      logs = logs.filter(l => l.affectedEngine === this.auditFilterEngine);
    }

    container.innerHTML = `
      <div style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:13px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
            📜 Tamper-Evident Local Demonstrator Audit Log
          </h3>
          <span style="font-size:10px; font-family:var(--font-mono); color:#b45309; background:#fef3c7; padding:2px 8px; border-radius:4px; border:1px solid #fde68a;">
            Local demonstrator audit log — not an official defence audit system.
          </span>
        </div>
        <p style="font-size:11px; color:var(--text-muted); margin-top:2px;">
          Chronological record capturing role transitions, fault injections, adapter selections, alert acknowledgments, and scenario runs.
        </p>
      </div>

      <!-- Audit Toolbar & Filters -->
      <div class="audit-toolbar">
        <div class="audit-filters">
          <select class="mil-select" onchange="window.assuranceView.setAuditFilterRole(this.value)">
            <option value="ALL">All User Roles</option>
            <option value="Operator">Operator</option>
            <option value="Propulsion Engineer">Propulsion Engineer</option>
            <option value="Maintenance Engineer">Maintenance Engineer</option>
            <option value="System Administrator">System Administrator</option>
            <option value="Observer / Demo User">Observer</option>
          </select>

          <select class="mil-select" onchange="window.assuranceView.setAuditFilterEngine(this.value)">
            <option value="ALL">All Engine Types</option>
            <option value="HEAVY_FUEL_CI">Heavy-Fuel CI</option>
            <option value="BOXER">Boxer Opposed</option>
            <option value="WANKEL_ROTARY">Wankel Rotary</option>
            <option value="TURBO_INLINE_V">Turbo Inline/V</option>
          </select>
        </div>

        <div style="display:flex; gap:8px;">
          <button class="table-btn" onclick="window.assuranceManager.exportAuditJSON()" title="Export JSON">
            ⬇ EXPORT JSON
          </button>
          <button class="table-btn" onclick="window.assuranceManager.exportAuditCSV()" title="Export CSV">
            ⬇ EXPORT CSV
          </button>
          <button class="table-btn" onclick="window.assuranceManager.clearAuditLogs()" style="color:#dc2626;" title="Clear Logs">
            🗑 CLEAR
          </button>
        </div>
      </div>

      <!-- Audit Table -->
      <div class="audit-table-wrap">
        <table class="audit-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Timestamp</th>
              <th>User Role</th>
              <th>Action</th>
              <th>Engine</th>
              <th>Component</th>
              <th>Quality</th>
              <th>Result</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            ${logs.length === 0 ? `
              <tr><td colspan="9" style="text-align:center; padding:20px; color:#94a3b8;">No audit records matching filter criteria.</td></tr>
            ` : logs.map(l => {
              return `
                <tr>
                  <td>${l.id}</td>
                  <td>${l.timestamp.slice(11, 19)}</td>
                  <td><span class="mil-badge" style="background:#e2e8f0; color:#334155;">${l.userRole}</span></td>
                  <td><strong>${l.action}</strong></td>
                  <td>${l.affectedEngine}</td>
                  <td>${l.affectedComponent}</td>
                  <td><span style="color:#7c3aed; font-weight:700;">${l.dataQualityScore}%</span></td>
                  <td><span style="color:${l.result === 'SUCCESS' ? '#059669' : '#dc2626'}; font-weight:700;">${l.result}</span></td>
                  <td style="max-width:240px; overflow:hidden; text-overflow:ellipsis;" title="${l.details || ''}">${l.details || '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  setAuditFilterRole(role) {
    this.auditFilterRole = role;
    this.renderAuditTab();
  }

  setAuditFilterEngine(engine) {
    this.auditFilterEngine = engine;
    this.renderAuditTab();
  }

  renderAuditTable() {
    this.renderAuditTab();
  }

  // ==========================================================================
  // TAB 6: DEGRADED OPERATIONS
  // ==========================================================================
  renderDegradedTab() {
    const container = document.getElementById('assurance-degraded-content');
    if (!container) return;

    const sm = this.mgr.degradedStateMachine;
    const lkv = this.mgr.lastKnownValidTelemetry;
    const qm = this.mgr.qualityMetrics;
    const isDegraded = sm.currentState !== 'Normal';

    container.innerHTML = `
      <div style="margin-bottom:12px;">
        <h3 style="font-size:13px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
          ⚠️ Degraded Operations & Fail-Safe Demonstrator
        </h3>
        <p style="font-size:11px; color:var(--text-muted);">
          Demonstrates behavior when sensor telemetry is corrupted, delayed, or absent. Prevents false alarms and halts hallucinated extrapolations.
        </p>
      </div>

      <!-- State Machine Flow -->
      <div style="background:var(--bg-surface); border:1px solid var(--border-main); border-radius:var(--radius-md); padding:16px;">
        <h4 style="font-size:11px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
          🔄 Degraded Operations Fail-Safe State Machine
        </h4>

        <div class="state-machine-flow">
          ${sm.states.map(s => {
            const isCurrent = (s.id === sm.currentState);
            let stateClass = '';
            if (isCurrent) {
              if (s.id === 'Normal') stateClass = 'current normal';
              else if (s.id === 'NoReliableData') stateClass = 'current critical';
              else stateClass = 'current';
            }
            return `
              <div class="sm-state-node ${stateClass}">
                <div class="state-name" style="color:${isCurrent ? s.color : '#475569'};">${s.label}</div>
                <div class="state-desc">${s.desc}</div>
                ${isCurrent ? '<div style="margin-top:4px; font-size:9px; font-weight:800; color:#0284c7; font-family:var(--font-mono);">[CURRENT ACTIVE STATE]</div>' : ''}
              </div>
            `;
          }).join('<div class="data-arrow">➔</div>')}
        </div>
      </div>

      <!-- Advisory Banner on Incomplete Data -->
      ${isDegraded ? `
        <div style="margin-top:14px; background:#fff1f2; border:1px solid #fecdd3; border-left:4px solid #e11d48; border-radius:var(--radius-sm); padding:12px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#9f1239; font-size:12px;">⚠️ Insufficient trustworthy data for high-confidence prediction.</strong>
            <span style="font-size:10px; font-family:var(--font-mono); color:#be123c; font-weight:700;">FAIL-SAFE ACTIVE</span>
          </div>
          <p style="font-size:11px; color:#881337; margin-top:4px;">
            Recommendation: <strong>Maintain monitoring / follow authorized contingency procedure.</strong>
            Prediction confidence downgraded. Dynamic RUL accumulation is rate-limited to avoid erratic wear updates.
          </p>
        </div>
      ` : `
        <div style="margin-top:14px; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:var(--radius-sm); padding:10px 14px; font-size:11px; color:#065f46;">
          ✓ Normal Telemetry Stream: Data quality at ${qm.dataConfidenceScore}% — full high-confidence analytical pipeline active.
        </div>
      `}

      <!-- Last Known Valid Telemetry (Fail-Safe Preservation) -->
      <div style="margin-top:14px; background:var(--bg-surface); border:1px solid var(--border-main); border-radius:var(--radius-md); padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <h4 style="font-size:12px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
            💾 Last Known Valid Telemetry State (Stored Fail-Safe)
          </h4>
          <span style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted);">
            Captured: ${lkv.timestamp}
          </span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
          <div class="quality-metric-card">
            <div class="q-title">Valid RPM</div>
            <div class="q-val">${lkv.rpm}</div>
          </div>
          <div class="quality-metric-card">
            <div class="q-title">Valid CHT</div>
            <div class="q-val">${lkv.cht} °C</div>
          </div>
          <div class="quality-metric-card">
            <div class="q-title">Valid EGT</div>
            <div class="q-val">${lkv.egt} °C</div>
          </div>
          <div class="quality-metric-card">
            <div class="q-title">Valid Oil Press</div>
            <div class="q-val">${lkv.oil_press} bar</div>
          </div>
          <div class="quality-metric-card">
            <div class="q-title">Valid Oil Temp</div>
            <div class="q-val">${lkv.oil_temp} °C</div>
          </div>
          <div class="quality-metric-card">
            <div class="q-title">Valid Vibration</div>
            <div class="q-val">${lkv.vibration} g</div>
          </div>
        </div>
      </div>

      <!-- Injected Degraded Scenarios Shortcuts -->
      <div style="margin-top:14px; background:#f8fafc; border:1px solid var(--border-main); border-radius:var(--radius-md); padding:16px;">
        <h4 style="font-size:12px; font-weight:800; color:var(--text-primary); text-transform:uppercase; margin-bottom:8px;">
          ⚡ Inject Degraded Datalink Conditions
        </h4>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          <button class="table-btn" onclick="window.assuranceManager.toggleQualityFault('packet_loss'); window.assuranceView.renderDegradedTab();">
            Toggle Packet-Loss Burst
          </button>
          <button class="table-btn" onclick="window.assuranceManager.toggleQualityFault('stale_telemetry'); window.assuranceView.renderDegradedTab();">
            Toggle Stale Frame
          </button>
          <button class="table-btn" onclick="window.assuranceManager.toggleQualityFault('missing_fields'); window.assuranceView.renderDegradedTab();">
            Toggle Missing Sensor
          </button>
          <button class="table-btn" onclick="window.assuranceManager.toggleQualityFault('contradictory_readings'); window.assuranceView.renderDegradedTab();">
            Toggle Conflicting Sensors
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // TAB 7: DEPLOYMENT ROADMAP
  // ==========================================================================
  renderRoadmapTab() {
    const container = document.getElementById('assurance-roadmap-content');
    if (!container) return;

    container.innerHTML = `
      <div style="margin-bottom:12px;">
        <h3 style="font-size:13px; font-weight:800; color:var(--text-primary); text-transform:uppercase;">
          🚀 Maturation Roadmap: Hackathon Prototype to Authorized GCS Deployment
        </h3>
        <p style="font-size:11px; color:var(--text-muted);">
          Clear, honest distinction between current software prototype demonstrator capabilities and future formal qualification requirements.
        </p>
      </div>

      <div class="roadmap-timeline">
        <!-- Stage 1 -->
        <div class="roadmap-stage-card current-stage">
          <span class="stage-badge-tag stage1">Stage 1: Hackathon Demonstrator [CURRENT ACTIVE]</span>
          <h4 style="font-size:13px; font-weight:800; color:var(--text-primary);">Synthetic Telemetry & Multi-Architecture 3D Twin</h4>
          <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
            Local browser execution with simulated mathematical physics, synthetic health index, RUL estimation curves, mock CAN/GCS adapters, and four interactive 3D aero-piston architectures.
          </p>
          <div style="font-size:11px; color:#059669; font-weight:700; margin-top:6px;">
            ✓ Completed & running locally in demonstrator mode.
          </div>
        </div>

        <!-- Stage 2 -->
        <div class="roadmap-stage-card future-stage">
          <span class="stage-badge-tag stage2">Stage 2: Engine Test-Rig Validation</span>
          <h4 style="font-size:13px; font-weight:800; color:var(--text-primary);">Hardware Dynamometer & Calibrated Fault Matrix</h4>
          <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
            Ingestion of real sensor logs from authorized engine test benches. Controlled fault seed trials (injector fouling, intercooler leakage, oil aeration) to fit polynomial MVEM parameters.
          </p>
          <div class="stage-prereq-note">
            ⚠️ Requires: Certified test-rig access, calibrated dyno instrumentation, and authorized propulsion engineering staff.
          </div>
        </div>

        <!-- Stage 3 -->
        <div class="roadmap-stage-card future-stage">
          <span class="stage-badge-tag stage3">Stage 3: Authorized GCS Shadow Mode</span>
          <h4 style="font-size:13px; font-weight:800; color:var(--text-primary);">Non-Interfering Real-Time Telemetry Mirror</h4>
          <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
            Deployment as a passive, read-only shadow workstation in an authorized Ground Control Station. Evaluates algorithmic advisory accuracy against standard operator FIM checklists.
          </p>
          <div class="stage-prereq-note">
            ⚠️ Requires: Military GCS interface authorization, STANAG 4586 air-gap verification, and non-interference flight safety clearance.
          </div>
        </div>

        <!-- Stage 4 -->
        <div class="roadmap-stage-card future-stage">
          <span class="stage-badge-tag stage4">Stage 4: Fleet-Level Health Analytics</span>
          <h4 style="font-size:13px; font-weight:800; color:var(--text-primary);">Multi-Airframe Cross-Fleet Prognostics & Depot Integration</h4>
          <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
            Aggregated lifecycle monitoring across airframe operational history. Integration with depot maintenance records, borescope reports, and component serial tracking.
          </p>
          <div class="stage-prereq-note">
            ⚠️ Requires: Secure multi-tenant military cloud/on-prem enclave, depot maintenance database linkage, and fleet authority approval.
          </div>
        </div>

        <!-- Stage 5 -->
        <div class="roadmap-stage-card formal-stage">
          <span class="stage-badge-tag stage5">Stage 5: Formal Qualification Path</span>
          <h4 style="font-size:13px; font-weight:800; color:var(--text-primary);">Military Airworthiness Certification & Operational Release</h4>
          <p style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
            Formal DO-178C / DO-254 software assurance compliance, Human Factors Engineering (HFE) ergonomics review, cybersecurity STIG auditing, and military airworthiness authority sign-off.
          </p>
          <div class="stage-prereq-note" style="background:#fee2e2; border-color:#fca5a5; color:#991b1b;">
            ⚠️ Requires: Full military qualification board, formal verification traceability, independent V&V testing, and defense procurement authorization.
          </div>
        </div>
      </div>
    `;
  }
}

// Attach to window globally
window.assuranceView = new AssuranceView();
