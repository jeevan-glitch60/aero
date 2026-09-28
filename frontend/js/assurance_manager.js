/**
 * ============================================================================
 * AEROTWIN // DEFENCE-GRADE INTEGRATION & ASSURANCE LAYER MANAGER
 * ============================================================================
 * Provides an authorized telemetry gateway simulator, real-time data quality
 * assessment, cybersecurity posture, model assurance/explainability, tamper-evident
 * audit logging, and fail-safe degraded operations management.
 *
 * SAFETY COMPLIANCE:
 * - Read-only unidirectional telemetry ingestion.
 * - Non-intrusive, non-operational demonstrator.
 * - All external adapters are mock/synthetic demonstrator stubs.
 * - Permanent disclaimer: "DEMONSTRATOR MODE — SYNTHETIC DATA — READ-ONLY ADVISORY
 *   DIGITAL TWIN — NOT CONNECTED TO LIVE AIRCRAFT OR DEFENCE SYSTEMS."
 */

class AssuranceManager {
  constructor() {
    this.currentRole = 'Propulsion Engineer';
    this.sessionStartTime = new Date().toISOString();
    this.sessionId = 'SESS-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    this.activeMissionId = 'SIM-MISSION-001';
    this.sequenceNumber = 1000;
    this.lastPacketTime = Date.now();
    this.lastValidTelemetryTime = new Date().toISOString();

    // 1. Adapters Definition
    this.adapters = {
      SyntheticEngineSimulatorAdapter: {
        adapterId: 'adapter-synth-01',
        adapterName: 'Synthetic Engine Simulator Adapter',
        adapterType: 'SyntheticEngineSimulatorAdapter',
        connectionStatus: 'Synthetic Simulator Connected',
        dataSource: 'Internal AeroTwin MVEM Physics Loop (10 Hz)',
        messageRateHz: 10.0,
        latencyMs: 14,
        packetLossPercent: 0.0,
        lastMessageTime: new Date().toISOString(),
        schemaVersion: '1.0-SYNTH',
        readOnly: true,
        isActive: true,
        isMock: false,
        notes: 'Standard real-time internal mathematical twin loop'
      },
      MockGCSMirrorAdapter: {
        adapterId: 'adapter-gcs-mirror',
        adapterName: 'Authorized GCS Mirror Adapter (Mock)',
        adapterType: 'MockGCSMirrorAdapter',
        connectionStatus: 'Authorized GCS Mirror Active',
        dataSource: 'Decoded Read-Only Telemetry Mirror (Synthetic)',
        messageRateHz: 10.0,
        latencyMs: 42,
        packetLossPercent: 0.2,
        lastMessageTime: new Date().toISOString(),
        schemaVersion: '1.0-MIRROR',
        readOnly: true,
        isActive: false,
        isMock: true,
        notes: 'Mock adapter — no live external connection. Demonstrates GCS decoded mirror interface.'
      },
      MockSocketCANAdapter: {
        adapterId: 'adapter-can-mock',
        adapterName: 'Mock SocketCAN Bus Adapter',
        adapterType: 'MockSocketCANAdapter',
        connectionStatus: 'Mock CAN Bus Active',
        dataSource: 'Simulated CAN 2.0B / CAN-FD Frames (Synthetic)',
        messageRateHz: 20.0,
        latencyMs: 18,
        packetLossPercent: 0.1,
        lastMessageTime: new Date().toISOString(),
        schemaVersion: '1.0-CAN',
        readOnly: true,
        isActive: false,
        isMock: true,
        notes: 'Mock adapter — no live external connection. Emulates local SocketCAN frames.'
      },
      CSVReplayAdapter: {
        adapterId: 'adapter-csv-replay',
        adapterName: 'CSV / Log Replay Adapter',
        adapterType: 'CSVReplayAdapter',
        connectionStatus: 'Offline Replay Mode',
        dataSource: 'Historical Mission Telemetry Log Archive',
        messageRateHz: 5.0,
        latencyMs: 5,
        packetLossPercent: 0.0,
        lastMessageTime: new Date().toISOString(),
        schemaVersion: '1.0-CSV',
        readOnly: true,
        isActive: false,
        isMock: false,
        notes: 'Deterministic playback of historical sorties and bench runs'
      }
    };

    this.activeAdapterKey = 'SyntheticEngineSimulatorAdapter';

    // 2. Data Quality Fault Injection States (Purple Data Quality Faults)
    this.qualityFaults = {
      packet_loss: { active: false, name: 'Packet Loss Burst (35%)', severity: 'MODERATE', color: '#7c3aed' },
      delayed_packets: { active: false, name: 'High Datalink Latency (+350ms)', severity: 'MODERATE', color: '#7c3aed' },
      out_of_order: { active: false, name: 'Out-of-Order Packet Jitter', severity: 'LOW', color: '#7c3aed' },
      stale_telemetry: { active: false, name: 'Stale / Frozen Telemetry Frame', severity: 'HIGH', color: '#7c3aed' },
      missing_fields: { active: false, name: 'Missing Sensor Key (EGT/CHT Null)', severity: 'HIGH', color: '#7c3aed' },
      out_of_range: { active: false, name: 'Extreme Out-of-Range Spike', severity: 'CRITICAL', color: '#7c3aed' },
      frozen_sensor: { active: false, name: 'Frozen Sensor Flatline (Oil Temp)', severity: 'MODERATE', color: '#7c3aed' },
      drifting_sensor: { active: false, name: 'Slow Sensor Calibration Drift', severity: 'MODERATE', color: '#7c3aed' },
      contradictory_readings: { active: false, name: 'Contradictory Sensor Plausibility', severity: 'HIGH', color: '#7c3aed' }
    };

    // 3. Computed Quality Metrics
    this.qualityMetrics = {
      freshnessAgeMs: 80,
      packetRateHz: 10.0,
      sequenceContinuityPct: 100.0,
      packetLossPct: 0.0,
      latencyMs: 14,
      jitterMs: 2.1,
      missingValueRatePct: 0.0,
      rangeValidationStatus: 'PASS',
      timestampValidationStatus: 'PASS',
      sensorPlausibilityStatus: 'PASS',
      physicsConsistencyScore: 98.4,
      dataConfidenceScore: 98,
      sourceMode: 'synthetic'
    };

    // 4. Degraded Operations State Machine
    // Normal -> Degraded Data -> Limited Analytics -> No Reliable Data -> Recovery Validation -> Normal
    this.degradedStateMachine = {
      currentState: 'Normal',
      states: [
        { id: 'Normal', label: '1. Normal Ingestion', desc: 'Full telemetry trust, nominal physics sync & RUL calculation', color: '#059669' },
        { id: 'DegradedData', label: '2. Degraded Data', desc: 'Packet jitter or non-critical sensor drift flagged in purple', color: '#d97706' },
        { id: 'LimitedAnalytics', label: '3. Limited Analytics', desc: 'Predictions bounded with wider confidence intervals; RUL rate limited', color: '#ea580c' },
        { id: 'NoReliableData', label: '4. No Reliable Data', desc: 'Critical telemetry loss; state frozen; advisory banner displayed', color: '#dc2626' },
        { id: 'RecoveryValidation', label: '5. Recovery Validation', desc: 'Re-verifying packet continuity & physical plausibility before unfreeze', color: '#7c3aed' }
      ]
    };

    // Last known valid telemetry store (Fail-Safe Preservation)
    this.lastKnownValidTelemetry = {
      timestamp: new Date().toISOString(),
      rpm: 5000,
      cht: 108.4,
      egt: 820.0,
      oil_press: 4.8,
      oil_temp: 95.0,
      vibration: 1.15
    };

    // 5. Role Permissions Matrix
    this.rolePermissions = {
      'Observer / Demo User': {
        name: 'Observer / Demo User',
        canView: true,
        canAckAlerts: false,
        canInjectFaults: false,
        canConfigureAdapters: false,
        canRunScenarios: false,
        canExportAudit: false,
        description: 'Read-only access to view live health displays and demonstrator visualizations.'
      },
      'Operator': {
        name: 'Operator',
        canView: true,
        canAckAlerts: true,
        canInjectFaults: false,
        canConfigureAdapters: false,
        canRunScenarios: false,
        canExportAudit: true,
        description: 'Authorized to monitor live telemetry, acknowledge alerts, and export operational reports.'
      },
      'Propulsion Engineer': {
        name: 'Propulsion Engineer',
        canView: true,
        canAckAlerts: true,
        canInjectFaults: true,
        canConfigureAdapters: false,
        canRunScenarios: true,
        canExportAudit: true,
        description: 'Authorized to run physics scenarios, inject simulation faults, and inspect model assumptions.'
      },
      'Maintenance Engineer': {
        name: 'Maintenance Engineer',
        canView: true,
        canAckAlerts: true,
        canInjectFaults: false,
        canConfigureAdapters: false,
        canRunScenarios: false,
        canExportAudit: true,
        description: 'Authorized to review component wear, mark inspection status, and verify maintenance advisories.'
      },
      'System Administrator': {
        name: 'System Administrator',
        canView: true,
        canAckAlerts: true,
        canInjectFaults: true,
        canConfigureAdapters: true,
        canRunScenarios: true,
        canExportAudit: true,
        description: 'Full administrative access to configure mock adapters, user roles, and data quality tests.'
      }
    };

    // 6. Local Demonstrator Audit Log
    this.auditLogs = [];
    this.initAuditLogs();

    // 7. Model Assurance Metadata per Engine Architecture
    this.modelAssuranceCatalog = {
      HEAVY_FUEL_CI: {
        engineName: 'Four-Stroke Heavy-Fuel Compression-Ignition Engine',
        modelVersion: 'CI-MVEM-v3.4-AERO',
        simVersion: '2.4.1-BUILD-77',
        schemaVersion: '1.0-SYNTH',
        aiModelVersion: 'Ensemble-HeavyFuel-CI-v2.1 (XGBoost + EKF Residuals)',
        trainingDataSource: 'Synthetic demonstrator data',
        physicsBasis: 'Illustrative physics-inspired relationships (Diesel-cycle compression thermo)',
        validationState: 'Prototype / not field validated',
        rulConfidenceBand: '±16.5 hrs (95% CI)',
        baseFaultConfidence: 78,
        knownLimitations: [
          'High-altitude kerosene vaporization delay model is simplified',
          'Acoustic knock sensor response uses empirical harmonic approximation',
          'Extreme sub-zero ambient fuel wax viscosity not dynamically coupled'
        ],
        requiredFutureEvidence: [
          'Calibrated engine dynamometer mapping under heavy-fuel test matrix',
          'High-altitude climatic chamber proving records (FL180 - FL240)',
          'Controlled nozzle injector orifice coking endurance validation logs'
        ]
      },
      BOXER: {
        engineName: 'Horizontally Opposed / Boxer Engine',
        modelVersion: 'BOXER-MVEM-v4.1-AERO',
        simVersion: '2.4.1-BUILD-77',
        schemaVersion: '1.0-SYNTH',
        aiModelVersion: 'Ensemble-Boxer-Aero-v2.4 (Bi-LSTM + Physics Residual)',
        trainingDataSource: 'Synthetic demonstrator data',
        physicsBasis: 'Illustrative physics-inspired relationships (Otto-cycle opposed piston thermo)',
        validationState: 'Prototype / not field validated',
        rulConfidenceBand: '±12.0 hrs (95% CI)',
        baseFaultConfidence: 84,
        knownLimitations: [
          'Bank-to-bank thermal conduction through crankcase assumes uniform convection',
          'Propeller reduction gearbox gear tooth micro-pitting modeled as wear coefficient',
          'Exhaust backpressure dynamics simplified for loiter cruise regimes'
        ],
        requiredFutureEvidence: [
          'Direct test-rig dual-bank thermocouple calibration data',
          'Engine test-bench endurance runs with induced lean-mixture imbalance',
          'Gearbox vibration spectral signature validation on dynamic test stand'
        ]
      },
      WANKEL_ROTARY: {
        engineName: 'Wankel Rotary Internal-Combustion Engine',
        modelVersion: 'ROTARY-WANKEL-v2.8-AERO',
        simVersion: '2.4.1-BUILD-77',
        schemaVersion: '1.0-SYNTH',
        aiModelVersion: 'Ensemble-Rotary-Apex-v1.9 (1D CNN + Thermodynamic Kalman)',
        trainingDataSource: 'Synthetic demonstrator data',
        physicsBasis: 'Illustrative physics-inspired relationships (Trochoidal combustion expansion)',
        validationState: 'Prototype / not field validated',
        rulConfidenceBand: '±18.0 hrs (95% CI)',
        baseFaultConfidence: 74,
        knownLimitations: [
          'Apex seal sliding friction temperature gradient uses localized lumped-mass model',
          'Blow-by gas leakage across working chambers approximated with empirical orifice flow',
          'Hot-arc thermal fatigue prediction is non-linearly conservative'
        ],
        requiredFutureEvidence: [
          'Apex seal optical wear profilometry from teardown inspections',
          'Multi-port dynamic combustion chamber piezoelectric pressure logs',
          'Rotor housing thermal distortion laser interferometry verification'
        ]
      },
      TURBO_INLINE_V: {
        engineName: 'Turbocharged / Supercharged Inline or V Engine',
        modelVersion: 'TURBO-INLINE-V-v3.2-AERO',
        simVersion: '2.4.1-BUILD-77',
        schemaVersion: '1.0-SYNTH',
        aiModelVersion: 'Ensemble-ForcedInduction-v2.2 (Wavelet-Kalman + XGBoost)',
        trainingDataSource: 'Synthetic demonstrator data',
        physicsBasis: 'Illustrative physics-inspired relationships (Centrifugal compressor & intercooler maps)',
        validationState: 'Prototype / not field validated',
        rulConfidenceBand: '±14.0 hrs (95% CI)',
        baseFaultConfidence: 81,
        knownLimitations: [
          'Turbocharger rotor dynamic bearing oil film cavitation simplified',
          'Intercooler heat rejection during rapid altitude transitions uses steady-state effectiveness',
          'Wastegate actuator hysteresis modeled with first-order lag'
        ],
        requiredFutureEvidence: [
          'Turbocharger compressor wheel bench test gas-stand aerodynamic map',
          'In-flight charge air temperature dynamic step-response recordings',
          'Turbine housing thermomechanical fatigue metallurgical analysis'
        ]
      }
    };
  }

  // --------------------------------------------------------------------------
  // Audit Log Management (Tamper-Evident Style)
  // --------------------------------------------------------------------------
  initAuditLogs() {
    try {
      const saved = localStorage.getItem('aerotwin_local_audit_log');
      if (saved) {
        this.auditLogs = JSON.parse(saved);
        return;
      }
    } catch (e) {}

    // Seed realistic demonstrator audit events
    const initialEvents = [
      {
        id: 'LOG-001',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        userRole: 'System Administrator',
        action: 'INITIALIZE_ASSURANCE_LAYER',
        affectedEngine: 'BOXER',
        affectedComponent: 'Telemetry Gateway Router',
        sessionId: this.sessionId,
        missionId: 'SIM-MISSION-001',
        result: 'SUCCESS',
        modelVersion: 'BOXER-MVEM-v4.1-AERO',
        dataQualityScore: 98,
        details: 'Assurance layer initialized with read-only unidirectional gateway.'
      },
      {
        id: 'LOG-002',
        timestamp: new Date(Date.now() - 2400000).toISOString(),
        userRole: 'Propulsion Engineer',
        action: 'ROLE_AUTHENTICATED',
        affectedEngine: 'BOXER',
        affectedComponent: 'Access Control',
        sessionId: this.sessionId,
        missionId: 'SIM-MISSION-001',
        result: 'SUCCESS',
        modelVersion: 'BOXER-MVEM-v4.1-AERO',
        dataQualityScore: 98,
        details: 'Logged in as Propulsion Engineer with scenario & fault injection authorization.'
      },
      {
        id: 'LOG-003',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        userRole: 'System Administrator',
        action: 'ADAPTER_CONFIGURED',
        affectedEngine: 'ALL',
        affectedComponent: 'SyntheticEngineSimulatorAdapter',
        sessionId: this.sessionId,
        missionId: 'SIM-MISSION-001',
        result: 'SUCCESS',
        modelVersion: '1.0-SYNTH',
        dataQualityScore: 99,
        details: 'Selected SyntheticEngineSimulatorAdapter (10 Hz internal physics loop).'
      }
    ];

    this.auditLogs = initialEvents;
    this.saveAuditLogs();
  }

  logEvent(action, affectedEngine, affectedComponent, result, details = '') {
    const entry = {
      id: 'LOG-' + (this.auditLogs.length + 1).toString().padStart(3, '0'),
      timestamp: new Date().toISOString(),
      userRole: this.currentRole,
      action: action,
      affectedEngine: affectedEngine || 'BOXER',
      affectedComponent: affectedComponent || 'System Core',
      sessionId: this.sessionId,
      missionId: this.activeMissionId,
      result: result || 'SUCCESS',
      modelVersion: this.modelAssuranceCatalog[affectedEngine]?.modelVersion || 'MVEM-v3.4',
      dataQualityScore: this.qualityMetrics.dataConfidenceScore,
      details: details
    };

    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 250) this.auditLogs.pop();
    this.saveAuditLogs();

    // Trigger update in UI if view exists
    if (window.assuranceView && typeof window.assuranceView.renderAuditTable === 'function') {
      window.assuranceView.renderAuditTable();
    }
    return entry;
  }

  saveAuditLogs() {
    try {
      localStorage.setItem('aerotwin_local_audit_log', JSON.stringify(this.auditLogs));
    } catch (e) {}
  }

  clearAuditLogs() {
    this.auditLogs = [];
    this.saveAuditLogs();
    this.logEvent('AUDIT_LOG_CLEARED', 'ALL', 'Audit Subsystem', 'SUCCESS', 'Demonstrator audit logs cleared by user.');
  }

  exportAuditJSON() {
    this.logEvent('AUDIT_EXPORT_JSON', 'ALL', 'Audit Subsystem', 'SUCCESS', 'Exported synthetic audit log to JSON.');
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.auditLogs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `aerotwin_audit_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  }

  exportAuditCSV() {
    this.logEvent('AUDIT_EXPORT_CSV', 'ALL', 'Audit Subsystem', 'SUCCESS', 'Exported synthetic audit log to CSV.');
    const headers = ['ID', 'Timestamp', 'UserRole', 'Action', 'AffectedEngine', 'AffectedComponent', 'SessionID', 'MissionID', 'Result', 'ModelVersion', 'DataQualityScore', 'Details'];
    const rows = this.auditLogs.map(e => [
      e.id,
      `"${e.timestamp}"`,
      `"${e.userRole}"`,
      `"${e.action}"`,
      `"${e.affectedEngine}"`,
      `"${e.affectedComponent}"`,
      `"${e.sessionId}"`,
      `"${e.missionId}"`,
      `"${e.result}"`,
      `"${e.modelVersion}"`,
      e.dataQualityScore,
      `"${(e.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aerotwin_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // --------------------------------------------------------------------------
  // User Role & Permissions Management
  // --------------------------------------------------------------------------
  setRole(newRole) {
    if (!this.rolePermissions[newRole]) return false;
    const oldRole = this.currentRole;
    this.currentRole = newRole;
    this.logEvent('ROLE_SWITCH', 'ALL', 'Security RBAC', 'SUCCESS', `User switched role from '${oldRole}' to '${newRole}'.`);
    this.applyRolePermissionsToUI();
    return true;
  }

  getPermission(permissionKey) {
    const roleDef = this.rolePermissions[this.currentRole];
    if (!roleDef) return false;
    return !!roleDef[permissionKey];
  }

  applyRolePermissionsToUI() {
    const perm = this.rolePermissions[this.currentRole] || this.rolePermissions['Observer / Demo User'];

    // Update role display labels
    const roleLabel = document.getElementById('current-role-label');
    if (roleLabel) roleLabel.innerText = this.currentRole;

    const rbacBadge = document.getElementById('security-current-role-badge');
    if (rbacBadge) rbacBadge.innerText = this.currentRole;

    // Apply enable/disable states to UI buttons based on role
    // 1. Fault injection buttons (Propulsion Engineer or SysAdmin only)
    document.querySelectorAll('.fault-btn, .fault-inject-btn, #btn-inject-fault, #sim-btn-inject-fault').forEach(el => {
      el.disabled = !perm.canInjectFaults;
      el.title = perm.canInjectFaults ? 'Authorized to inject fault' : `Action disabled: requires Propulsion Engineer or Admin role (current: ${this.currentRole})`;
      el.classList.toggle('role-disabled', !perm.canInjectFaults);
    });

    // 2. Scenario buttons
    document.querySelectorAll('#btn-run-scenario, #btn-save-scenario').forEach(el => {
      el.disabled = !perm.canRunScenarios;
      el.title = perm.canRunScenarios ? 'Authorized to run scenarios' : `Action disabled: requires Propulsion Engineer role`;
      el.classList.toggle('role-disabled', !perm.canRunScenarios);
    });

    // 3. Adapter configuration buttons (SysAdmin only)
    document.querySelectorAll('.adapter-select-btn').forEach(el => {
      el.disabled = !perm.canConfigureAdapters;
      el.title = perm.canConfigureAdapters ? 'Configure telemetry adapter' : `Configuration restricted to System Administrator`;
      el.classList.toggle('role-disabled', !perm.canConfigureAdapters);
    });

    // 4. Alert Ack buttons (Operator, Propulsion Engineer, SysAdmin)
    document.querySelectorAll('.alert-ack-btn, .adv-decision-btn').forEach(el => {
      el.disabled = !perm.canAckAlerts;
      el.title = perm.canAckAlerts ? 'Acknowledge alert' : `Acknowledge restricted: Observer has view-only rights`;
      el.classList.toggle('role-disabled', !perm.canAckAlerts);
    });
  }

  // --------------------------------------------------------------------------
  // Data Gateway & Telemetry Adapters
  // --------------------------------------------------------------------------
  selectAdapter(adapterKey) {
    if (!this.adapters[adapterKey]) return false;
    if (!this.getPermission('canConfigureAdapters')) {
      alert(`Permission Denied: System Administrator role required to switch telemetry adapters. Current role: ${this.currentRole}`);
      return false;
    }

    Object.keys(this.adapters).forEach(k => {
      this.adapters[k].isActive = (k === adapterKey);
    });

    this.activeAdapterKey = adapterKey;
    const adapter = this.adapters[adapterKey];
    this.qualityMetrics.sourceMode = adapter.isMock ? 'mock_gateway' : (adapterKey === 'CSVReplayAdapter' ? 'replay' : 'synthetic');

    this.logEvent('ADAPTER_SWITCH', 'ALL', adapter.adapterName, 'SUCCESS', `Switched active telemetry adapter to ${adapter.adapterName} (${adapter.connectionStatus}).`);

    if (window.assuranceView) {
      window.assuranceView.renderGatewayTab();
    }
    return true;
  }

  getActiveAdapter() {
    return this.adapters[this.activeAdapterKey];
  }

  // Generate normalized message frame according to the prompt schema
  getNormalizedFrame(rawTelemetry = {}) {
    this.sequenceNumber += 1;
    const adapter = this.getActiveAdapter();
    const activeEngine = window.engine3DView ? window.engine3DView.currentEngineType : 'BOXER';

    // Apply active data-quality faults to frame quality metadata
    const isStale = this.qualityFaults.stale_telemetry.active;
    const isContradictory = this.qualityFaults.contradictory_readings.active;
    const isOutOfRange = this.qualityFaults.out_of_range.active;
    const isPacketLoss = this.qualityFaults.packet_loss.active;

    let latency = adapter.latencyMs;
    if (this.qualityFaults.delayed_packets.active) latency += 350;

    let lossPct = adapter.packetLossPercent;
    if (isPacketLoss) lossPct = 35.0;

    const frame = {
      source: adapter.isMock ? 'synthetic_mock_gcs_mirror' : 'synthetic_simulator_loop',
      read_only: true,
      timestamp: isStale ? this.lastValidTelemetryTime : new Date().toISOString(),
      engine_architecture: activeEngine,
      mission_id: this.activeMissionId,
      sequence_number: this.qualityFaults.out_of_order.active ? (this.sequenceNumber - Math.floor(Math.random() * 5)) : this.sequenceNumber,
      quality: {
        packet_loss_percent: lossPct,
        latency_ms: latency,
        is_stale: isStale,
        is_valid: !isOutOfRange && !isContradictory
      },
      telemetry: {
        rpm: isOutOfRange ? 9999 : (rawTelemetry.rpm || 5000),
        cht_c: isOutOfRange ? 999.0 : (this.qualityFaults.drifting_sensor.active ? 138.5 : (rawTelemetry.cht_c || 108.4)),
        egt_c: rawTelemetry.egt_c || 820.0,
        oil_press_bar: isContradictory ? 0.0 : (rawTelemetry.oil_press_bar || 4.8),
        oil_temp_c: this.qualityFaults.frozen_sensor.active ? 95.0 : (rawTelemetry.oil_temp_c || 95.0),
        vibration_g: rawTelemetry.vibration_g || 1.15
      },
      model_metadata: {
        schema_version: adapter.schemaVersion,
        synthetic: true
      }
    };

    if (!isStale && !isOutOfRange) {
      this.lastValidTelemetryTime = frame.timestamp;
      this.lastKnownValidTelemetry = { ...frame.telemetry, timestamp: frame.timestamp };
    }

    return frame;
  }

  // --------------------------------------------------------------------------
  // Data Quality Assessment & Fault Injection
  // --------------------------------------------------------------------------
  toggleQualityFault(faultKey) {
    if (!this.qualityFaults[faultKey]) return false;
    const qf = this.qualityFaults[faultKey];
    qf.active = !qf.active;

    const statusStr = qf.active ? 'INJECTED' : 'CLEARED';
    this.logEvent(`DATA_QUALITY_${statusStr}`, 'ALL', qf.name, 'SUCCESS', `Data quality fault '${qf.name}' was ${statusStr.toLowerCase()}.`);

    this.recomputeDataQuality();

    if (window.assuranceView) {
      window.assuranceView.renderQualityTab();
      window.assuranceView.renderDegradedTab();
    }
    return qf.active;
  }

  recomputeDataQuality() {
    let penalty = 0;
    let missingRate = 0.0;
    let rangeStatus = 'PASS';
    let plausibilityStatus = 'PASS';
    let timeStatus = 'PASS';
    let lossPct = this.getActiveAdapter().packetLossPercent;
    let latency = this.getActiveAdapter().latencyMs;

    if (this.qualityFaults.packet_loss.active) {
      penalty += 25;
      lossPct = 35.0;
    }
    if (this.qualityFaults.delayed_packets.active) {
      penalty += 15;
      latency += 350;
    }
    if (this.qualityFaults.out_of_order.active) {
      penalty += 12;
    }
    if (this.qualityFaults.stale_telemetry.active) {
      penalty += 35;
      timeStatus = 'STALE_WARN';
    }
    if (this.qualityFaults.missing_fields.active) {
      penalty += 20;
      missingRate = 18.5;
    }
    if (this.qualityFaults.out_of_range.active) {
      penalty += 45;
      rangeStatus = 'FAIL_SPIKE';
    }
    if (this.qualityFaults.frozen_sensor.active) {
      penalty += 15;
      plausibilityStatus = 'WARN_FLATLINE';
    }
    if (this.qualityFaults.drifting_sensor.active) {
      penalty += 18;
      plausibilityStatus = 'WARN_DRIFT';
    }
    if (this.qualityFaults.contradictory_readings.active) {
      penalty += 40;
      plausibilityStatus = 'FAIL_CONTRADICTION';
    }

    const rawScore = Math.max(8, 100 - penalty);
    this.qualityMetrics.dataConfidenceScore = Math.round(rawScore);
    this.qualityMetrics.packetLossPct = lossPct;
    this.qualityMetrics.latencyMs = latency;
    this.qualityMetrics.missingValueRatePct = missingRate;
    this.qualityMetrics.rangeValidationStatus = rangeStatus;
    this.qualityMetrics.sensorPlausibilityStatus = plausibilityStatus;
    this.qualityMetrics.timestampValidationStatus = timeStatus;
    this.qualityMetrics.physicsConsistencyScore = Math.max(10, Math.round(100 - (penalty * 0.8)));

    // Update Degraded Operations State Machine based on Quality Score
    if (rawScore >= 90) {
      this.degradedStateMachine.currentState = 'Normal';
    } else if (rawScore >= 70) {
      this.degradedStateMachine.currentState = 'DegradedData';
    } else if (rawScore >= 50) {
      this.degradedStateMachine.currentState = 'LimitedAnalytics';
    } else if (rawScore >= 20) {
      this.degradedStateMachine.currentState = 'NoReliableData';
    } else {
      this.degradedStateMachine.currentState = 'RecoveryValidation';
    }
  }

  // Calculate adjusted model confidence (penalized by telemetry data quality)
  getAdjustedModelConfidence(engineType = 'BOXER') {
    const meta = this.modelAssuranceCatalog[engineType] || this.modelAssuranceCatalog['BOXER'];
    const baseConf = meta.baseFaultConfidence;
    const qualityFactor = this.qualityMetrics.dataConfidenceScore / 100.0;

    // Direct mathematical penalty when telemetry quality is degraded
    const adjusted = Math.round(baseConf * qualityFactor);
    return Math.max(12, adjusted);
  }

  // --------------------------------------------------------------------------
  // Explainability & Diagnostics Hypotheses
  // --------------------------------------------------------------------------
  getExplainabilityHypothesis(engineType = 'BOXER', activeFault = null) {
    const qualityScore = this.qualityMetrics.dataConfidenceScore;
    const isQualityDegraded = qualityScore < 80;

    if (activeFault) {
      return {
        expectedState: 'Nominal cylinder combustion temperature symmetry (ΔEGT < 25°C)',
        observedState: `Elevated divergence observed during cruise loiter (Δ = +68°C)`,
        residual: '+4.2σ Mahalanobis innovation deviation',
        topContributingParameters: ['EGT Cylinder #3', 'High-Pressure Fuel Pulse Width', 'Vibration 2× Crank Harmonic'],
        faultHypothesis: `Possible injector degradation in Cylinder 3`,
        alternativeHypotheses: isQualityDegraded ? 'EGT thermocouple sensor drift / CAN frame jitter' : 'Localized intake runner manifold gasket vacuum leak',
        confidence: isQualityDegraded ? 'Low / Caution (Degraded Telemetry)' : 'Moderate (74%)',
        recommendedFollowUp: 'Verify sensor consistency and inspect injector flow after simulated mission using authorized maintenance procedure.',
        systemLimit: 'Not a confirmed diagnosis; illustrative model output only.',
        dataQualityScore: qualityScore
      };
    }

    return {
      expectedState: 'Nominal steady-state envelope across all cylinders',
      observedState: 'Telemetry tracks within normal operational margins',
      residual: 'Residual norm < 0.65σ (nominal)',
      topContributingParameters: ['Throttle Position', 'Manifold Air Pressure', 'Crankshaft Speed'],
      faultHypothesis: 'No active fault hypothesis; operating within nominal bounds',
      alternativeHypotheses: 'N/A',
      confidence: `${this.getAdjustedModelConfidence(engineType)}%`,
      recommendedFollowUp: 'Continue routine mission monitoring per flight profile.',
      systemLimit: 'Demonstrator mode; synthetic illustrative analytics only.',
      dataQualityScore: qualityScore
    };
  }
}

// Attach to window globally
window.assuranceManager = new AssuranceManager();
