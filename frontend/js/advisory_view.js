/**
 * Advisory View Controller: AI Advisory & Decision Support Center
 * Rotax 915/916 iS Class Aero-Piston Engine Digital Twin (MALE UAV GCS)
 *
 * Coordinates 3-column decision workspace (Priority Queue, Active Advisory,
 * Engine & Mission Context) and bottom chronological decision audit timeline.
 */

class AdvisoryView {
  constructor() {
    this.advisories = [];
    this.selectedIncidentId = 'overheating-trend';
    this.telemetryHistory = [];
    this.activeFilter = 'ALL';
    this.queueCategoryFilter = 'ALL';
    this.queueSearchQuery = '';
    this.isWhyExpanded = false;
    this.modalState = { isOpen: false, incident: null, selectedDecision: '' };

    this.previousRanks = new Map();
    this.lastQueueSignature = '';
    this.lastQueueRenderTime = 0;
    this.persistenceCounters = new Map();

    this.timelineEvents = [
      {
        id: 'ev-1',
        time: '14:28:10',
        timeStr: '14:28:10',
        timestamp: new Date().toISOString(),
        category: 'TELEMETRY',
        severity: 'INFO',
        description: 'Telemetry synchronization initialized at 10 Hz over GCS datalink',
        status: 'ONLINE',
      },
      {
        id: 'ev-2',
        time: '14:28:22',
        timeStr: '14:28:22',
        timestamp: new Date().toISOString(),
        category: 'PHYSICS',
        severity: 'NORMAL',
        description: 'MVEM thermodynamics twin state converged (residual norm < 0.75σ)',
        status: 'CONVERGED',
      },
      {
        id: 'ev-3',
        time: '14:28:45',
        timeStr: '14:28:45',
        timestamp: new Date().toISOString(),
        category: 'AI',
        severity: 'NORMAL',
        description: 'Multi-cylinder thermal symmetry baseline verified across cylinders 1-4',
        status: 'VERIFIED',
      },
    ];

    try {
      const saved = localStorage.getItem('aerotwin_advisory_events');
      if (saved) this.timelineEvents = JSON.parse(saved);
    } catch (e) {}

    this.initElements();
    this.initListeners();
    this.seedInitialAdvisories();
  }

  initElements() {
    this.queueListEl = document.getElementById('adv-queue-list');
    this.queueCountEl = document.getElementById('adv-queue-count');
    this.queueSearchInput = document.getElementById('adv-queue-search');
    this.queueFilterPills = document.querySelectorAll('.adv-q-filter-pill');
    this.timelineTableBody = document.getElementById('adv-timeline-body');
    this.timelineCountEl = document.getElementById('adv-timeline-count');

    // Active Advisory elements
    this.advAssessmentEl = document.getElementById('adv-active-assessment');
    this.advConditionEl = document.getElementById('adv-active-condition');
    this.advConfidenceEl = document.getElementById('adv-active-confidence');
    this.advPriorityEl = document.getElementById('adv-active-priority');
    this.advImpactEl = document.getElementById('adv-active-impact');
    this.advStatusEl = document.getElementById('adv-active-status');
    this.advExplanationEl = document.getElementById('adv-active-explanation');
    this.advMonitorListEl = document.getElementById('adv-active-monitor-list');
    this.advDecisionButtonsEl = document.getElementById('adv-active-decision-buttons');
    this.advMaintPriorityEl = document.getElementById('adv-active-maint-priority');
    this.advMaintListEl = document.getElementById('adv-active-maint-list');
    this.advEvidenceGridEl = document.getElementById('adv-active-evidence-grid');
    this.advRulValEl = document.getElementById('adv-active-rul-val');
    this.advProjectedRulEl = document.getElementById('adv-active-projected-rul');
    this.advHealthScoreEl = document.getElementById('adv-active-health-score');
    this.advMissionImpactEl = document.getElementById('adv-active-mission-impact');
    this.advRecommendationEl = document.getElementById('adv-active-recommendation');

    // Explainability Bars
    this.barPhysicsVal = document.getElementById('adv-bar-physics-val');
    this.barPhysicsFill = document.getElementById('adv-bar-physics-fill');
    this.barAnomalyVal = document.getElementById('adv-bar-anomaly-val');
    this.barAnomalyFill = document.getElementById('adv-bar-anomaly-fill');
    this.barTrendVal = document.getElementById('adv-bar-trend-val');
    this.barTrendFill = document.getElementById('adv-bar-trend-fill');

    // Collapsible toggle
    this.whyToggleBtn = document.getElementById('adv-why-toggle-btn');
    this.whyContentEl = document.getElementById('adv-why-content');
    this.whyArrowEl = document.getElementById('adv-why-arrow');

    // Context card elements
    this.ctxRpm = document.getElementById('adv-ctx-rpm');
    this.ctxCht = document.getElementById('adv-ctx-cht');
    this.ctxEgt = document.getElementById('adv-ctx-egt');
    this.ctxOilP = document.getElementById('adv-ctx-oil-p');
    this.ctxOilT = document.getElementById('adv-ctx-oil-t');
    this.ctxFuelFlow = document.getElementById('adv-ctx-fuel-flow');
    this.ctxVib = document.getElementById('adv-ctx-vib');
    this.ctxHealthScore = document.getElementById('adv-ctx-health-score');
    this.ctxHealthTrend = document.getElementById('adv-ctx-health-trend');
    this.ctxAnomalyScore = document.getElementById('adv-ctx-anomaly-score');
    this.ctxAlt = document.getElementById('adv-ctx-alt');
    this.ctxOat = document.getElementById('adv-ctx-oat');
    this.ctxThrottle = document.getElementById('adv-ctx-throttle');
    this.ctxPhase = document.getElementById('adv-ctx-phase');

    // Modal elements
    this.modalBackdrop = document.getElementById('adv-decision-modal');
    this.modalConditionTitle = document.getElementById('adv-modal-condition-title');
    this.modalConditionSev = document.getElementById('adv-modal-condition-sev');
    this.modalDecisionText = document.getElementById('adv-modal-decision-text');
    this.modalNoteInput = document.getElementById('adv-modal-note-input');
    this.modalCloseBtn = document.getElementById('adv-modal-close-btn');
    this.modalCancelBtn = document.getElementById('adv-modal-cancel-btn');
    this.modalConfirmBtn = document.getElementById('adv-modal-confirm-btn');
  }

  initListeners() {
    // Collapsible evidence toggle
    if (this.whyToggleBtn) {
      this.whyToggleBtn.addEventListener('click', () => {
        this.isWhyExpanded = !this.isWhyExpanded;
        if (this.whyContentEl) this.whyContentEl.style.display = this.isWhyExpanded ? 'flex' : 'none';
        if (this.whyArrowEl) this.whyArrowEl.classList.toggle('open', this.isWhyExpanded);
      });
    }

    // Queue Search input
    if (this.queueSearchInput) {
      this.queueSearchInput.addEventListener('input', (e) => {
        this.queueSearchQuery = (e.target.value || '').trim().toLowerCase();
        this.renderQueue(true);
      });
    }

    // Queue Filter Pills
    if (this.queueFilterPills) {
      this.queueFilterPills.forEach((btn) => {
        btn.addEventListener('click', () => {
          this.queueFilterPills.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.queueCategoryFilter = btn.getAttribute('data-qfilter') || 'ALL';
          this.renderQueue(true);
        });
      });
    }

    // Unbreakable delegated click on Queue list
    if (this.queueListEl) {
      this.queueListEl.addEventListener('click', (e) => {
        const card = e.target.closest('.adv-queue-card');
        if (!card) return;
        const id = card.getAttribute('data-id');
        if (id) {
          this.selectAdvisory(id);
        }
      });
    }

    // Modal cancel & close
    if (this.modalCloseBtn) this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    if (this.modalCancelBtn) this.modalCancelBtn.addEventListener('click', () => this.closeModal());
    if (this.modalConfirmBtn) this.modalConfirmBtn.addEventListener('click', () => this.confirmDecision());

    // Timeline category filters
    document.querySelectorAll('.adv-filter-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.adv-filter-pill').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilter = btn.innerText.trim().toUpperCase();
        this.renderTimeline();
      });
    });

    // CSV export button
    const exportBtn = document.getElementById('adv-export-log-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCSV());
    }

    // Global Esc key closes modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalState.isOpen) {
        this.closeModal();
      }
    });
  }

  selectAdvisory(id) {
    this.selectedIncidentId = id;
    if (this.queueListEl) {
      this.queueListEl.querySelectorAll('.adv-queue-card').forEach((card) => {
        card.classList.toggle('selected', card.getAttribute('data-id') === id);
      });
    }
    this.renderActiveAdvisory();
  }

  seedInitialAdvisories() {
    this.evaluateAdvisories(
      { engine_rpm: 5200, cht: 122.4, egt: 840, oil_press_bar: 3.6, oil_temp_c: 84.0, vibration_g: 1.18, map_hpa: 860 },
      { health_score_pct: 92 },
      { anomaly_score_pct: 14 },
      { estimated_rul_hours: 789 },
      { predicted_fault: '' }
    );

    this.selectedIncidentId = this.advisories[0]?.id || 'overheating-trend';
    this.renderQueue(true);
    this.renderActiveAdvisory();
    this.renderTimeline();
  }

  update(packet) {
    if (!packet) return;
    const s = packet.sensor || packet;
    const h = packet.health || {};
    const res = packet.residuals || {};
    const rul = packet.rul || {};

    // Push to history buffer
    this.telemetryHistory.push({
      timestamp: s.timestamp || Date.now() / 1000,
      cht: Array.isArray(s.cht_c) ? Math.max(...s.cht_c) : (s.cht || 108.4),
      egt: Array.isArray(s.egt_c) ? Math.max(...s.egt_c) : (s.egt || 785),
      oil_p: s.oil_press_bar || 3.8,
      vib: s.vibration_g || 1.18,
    });
    if (this.telemetryHistory.length > 80) this.telemetryHistory.shift();

    // 1. Update Column 3 Context
    this.updateContext(s, h, res, rul, packet);

    // 2. Evaluate active conditions & update queue data
    this.evaluateAdvisories(s, h, res, rul, packet);

    // 3. Render Queue (throttled & diffed to eliminate DOM wipes & scroll jumps)
    this.renderQueue(false);

    // 4. Update Active Advisory
    this.renderActiveAdvisory();
  }

  evaluateAdvisories(s, h, res, rul, packet) {
    const maxCht = Array.isArray(s.cht_c) ? Math.max(...s.cht_c) : (s.cht || 112.0);
    const maxEgt = Array.isArray(s.egt_c) ? Math.max(...s.egt_c) : (s.egt || 795);
    const oilP = s.oil_press_bar !== undefined ? s.oil_press_bar : 3.65;
    const oilT = s.oil_temp_c !== undefined ? s.oil_temp_c : 83.5;
    const vib = s.vibration_g !== undefined ? s.vibration_g : 1.18;
    const fuelFlow = s.fuel_flow_lph !== undefined ? s.fuel_flow_lph : 24.5;
    const mapHpa = s.map_hpa !== undefined ? s.map_hpa : 855;
    const healthScore = Math.round(h.health_score_pct ?? packet.health_score ?? 92);
    const rawFault = (packet.predicted_fault || (h.isolated_faults && h.isolated_faults[0]?.name) || '').toLowerCase();
    const currentRul = Math.round(rul.estimated_rul_hours || 789);

    const list = [];

    // Helper for persistence duration
    const getSec = (key, defaultSec) => {
      const cur = (this.persistenceCounters.get(key) || defaultSec) + 1;
      this.persistenceCounters.set(key, cur);
      return cur;
    };

    // =========================================================================
    // 1. THERMAL ENVELOPE / CHT & EGT SPREAD
    // =========================================================================
    const isThermalCrit = maxCht > 130.0 || maxEgt > 880.0;
    const isThermalWarn = maxCht > 118.0 || maxEgt > 830.0 || rawFault.includes('overheat');

    list.push({
      id: 'overheating-trend',
      category: 'THERMAL',
      type: 'overheating_risk',
      title: isThermalCrit
        ? 'Thermal Envelope Breach / CHT Critical Excursion'
        : isThermalWarn
        ? 'Overheating Trend / Thermal Envelope Risk'
        : 'Thermal Envelope & Cylinder Head Symmetry',
      severity: isThermalCrit ? 'CRITICAL' : isThermalWarn ? 'WARNING' : 'NORMAL',
      priorityScore: isThermalCrit ? 92 : isThermalWarn ? 78 : 28,
      confidence: 88,
      persistenceSeconds: getSec('thermal', 140),
      status: isThermalCrit ? 'Immediate Action Required' : isThermalWarn ? 'Active and Increasing' : 'Thermal Spread Within Limits',
      missionImpact: isThermalCrit ? 'CRITICAL' : isThermalWarn ? 'MODERATE' : 'NOMINAL',
      explanation: isThermalWarn
        ? `Cylinder head temperature (${maxCht.toFixed(1)}°C) and exhaust gas temperature (${maxEgt.toFixed(0)}°C) are rising faster than expected for present RPM and fuel flow. The pattern indicates thermal stress rather than a short normal throttle transient.`
        : `All cylinder head temperatures (max ${maxCht.toFixed(1)}°C) and exhaust gas temperatures (max ${maxEgt.toFixed(0)}°C) remain well within the 135°C continuous limit with inter-cylinder variance under 2.4°C.`,
      monitorNow: [
        `CHT rise rate — alert if above 1.5°C/min sustained limit (Current: ${maxCht.toFixed(1)}°C).`,
        `EGT deviation against expected engine-map baseline band (${maxEgt.toFixed(0)}°C).`,
        'Correlation between cooling airflow and ambient OAT margin.',
      ],
      decisionOptions: isThermalWarn
        ? [
            'Continue with enhanced monitoring',
            'Request propulsion engineer review',
            'Begin return-to-base assessment',
            'Escalate according to approved SOP',
          ]
        : ['Continue normally', 'Continue with enhanced monitoring'],
      maintenancePriority: isThermalWarn ? 'Inspect before next mission' : 'Routine turnaround inspection',
      maintenanceActions: [
        '• Inspect cooling airflow path, radiator intake duct, and cylinder cooling baffles for obstruction.',
        '• Verify mixture/injection operation and fuel-flow consistency on affected cylinder bank.',
        '• Inspect cylinder head thermocouple probe contacts and wiring harness grounding.',
      ],
      evidence: [
        { label: 'Max CHT Reading', value: `${maxCht.toFixed(1)}°C`, state: isThermalWarn ? (isThermalCrit ? 'critical' : 'warning') : 'nominal' },
        { label: 'Max EGT Reading', value: `${maxEgt.toFixed(0)}°C`, state: isThermalWarn ? 'warning' : 'nominal' },
        { label: 'Thermal Residual', value: isThermalWarn ? '+14.2% above expectation' : '< 0.8σ nominal', state: isThermalWarn ? 'warning' : 'nominal' },
        { label: 'Cylinder Symmetry', value: '±2.1°C variance (Acceptable)', state: 'nominal' },
      ],
      modelContribution: { physics: 45, anomaly: 35, trend: 20 },
      healthImpact: {
        currentHealthScore: healthScore,
        currentRulHours: currentRul,
        rulUncertaintyHours: 8,
        projectedRulIfPersistent: isThermalWarn ? Math.max(currentRul - 45, 20) : currentRul,
      },
      missionRecommendation: isThermalWarn
        ? 'Continue with enhanced monitoring; begin return-to-base assessment if thermal limits exceed 125°C according to approved SOP.'
        : 'Continue mission normally under approved flight profile. Thermal headroom is adequate for full endurance.',
      advisorySource: 'Hybrid physics + AI model',
    });

    // =========================================================================
    // 2. LUBRICATION CIRCUIT / OIL PRESSURE & HYDRAULIC FILM
    // =========================================================================
    const isLubeCrit = (oilP < 2.05 && oilT > 95.0) || oilP < 1.80;
    const isLubeWarn = oilP < 2.30 || oilT > 105.0 || rawFault.includes('oil');

    list.push({
      id: 'lubrication-system-risk',
      category: 'OIL',
      type: 'lubrication_system_risk',
      title: isLubeCrit
        ? 'Consolidated Lubrication Circuit Risk'
        : isLubeWarn
        ? 'Low Oil Pressure / Lubrication Warning'
        : 'Lubrication Circuit & Hydrodynamic Margin',
      severity: isLubeCrit ? 'CRITICAL' : isLubeWarn ? 'WARNING' : 'NORMAL',
      priorityScore: isLubeCrit ? 96 : isLubeWarn ? 84 : 24,
      confidence: 94,
      persistenceSeconds: getSec('lube', 180),
      status: isLubeCrit ? 'Immediate Action Required' : isLubeWarn ? 'Circuit Under Review' : 'Hydrodynamic Film Optimal',
      missionImpact: isLubeCrit ? 'CRITICAL' : isLubeWarn ? 'HIGH' : 'NOMINAL',
      explanation: isLubeCrit
        ? `Concurrent degradation observed: oil pressure (${oilP.toFixed(2)} bar) is depressed while oil temperature (${oilT.toFixed(1)}°C) is elevated. Multi-transducer correlation confirms physical hydraulic circuit stress rather than a single-sensor artifact.`
        : isLubeWarn
        ? `Oil pressure (${oilP.toFixed(2)} bar) is tracking near the minimum continuous limit (2.0 bar minimum). Bearing hydrodynamic film thickness is reduced.`
        : `Oil pressure (${oilP.toFixed(2)} bar) and temperature (${oilT.toFixed(1)}°C) indicate full hydrodynamic journal bearing lubrication with 1.8x safety margin above cavitation threshold.`,
      monitorNow: [
        `Oil pressure slope and minimum safety floor (${oilP.toFixed(2)} bar, min limit 2.0 bar).`,
        `Oil temperature trajectory (${oilT.toFixed(1)}°C, limit 130°C).`,
        'Crankcase high-frequency harmonic vibration shifts.',
      ],
      decisionOptions: isLubeCrit || isLubeWarn
        ? [
            'Request immediate propulsion engineer review',
            'Begin return-to-base assessment',
            'Escalate according to approved SOP',
          ]
        : ['Continue normally', 'Continue with enhanced monitoring'],
      maintenancePriority: isLubeCrit ? 'Ground aircraft pending inspection' : isLubeWarn ? 'Inspect within 1 flight cycle' : 'Routine 50-hr interval',
      maintenanceActions: [
        '• Perform comprehensive lubrication circuit inspection and check oil pressure relief valve.',
        '• Inspect oil cooler core airflow and internal heat exchanger passage for debris.',
        '• Perform spectrographic oil analysis (SOA) and inspect oil filter element for metallic wear particles.',
      ],
      evidence: [
        { label: 'Oil Pressure', value: `${oilP.toFixed(2)} bar`, state: isLubeCrit ? 'critical' : isLubeWarn ? 'warning' : 'nominal' },
        { label: 'Oil Temperature', value: `${oilT.toFixed(1)}°C`, state: isLubeCrit ? 'warning' : 'nominal' },
        { label: 'Viscosity Safety Factor', value: isLubeCrit ? '0.92x (Depressed)' : '1.85x (Adequate)', state: isLubeCrit ? 'critical' : 'nominal' },
        { label: 'Pump Flow Differential', value: isLubeCrit ? '-18.5% deviation' : 'Nominal delivery', state: isLubeCrit ? 'warning' : 'nominal' },
      ],
      modelContribution: { physics: 48, anomaly: 32, trend: 20 },
      healthImpact: {
        currentHealthScore: healthScore,
        currentRulHours: currentRul,
        rulUncertaintyHours: 8,
        projectedRulIfPersistent: isLubeCrit ? Math.max(currentRul - 80, 20) : currentRul,
      },
      missionRecommendation: isLubeCrit
        ? 'Initiate return-to-base assessment. Limit throttle transients and maintain loiter power according to approved SOP.'
        : 'Continue mission normally. Hydraulic film thickness and oil cooler heat rejection are stable.',
      advisorySource: 'Hybrid physics + AI model',
    });

    // =========================================================================
    // 3. MECHANICAL VIBRATION & TORSIONAL HARMONICS
    // =========================================================================
    const isVibCrit = vib > 2.50;
    const isVibWarn = vib > 1.80 || rawFault.includes('vib');

    list.push({
      id: 'abnormal-vibration',
      category: 'MECHANICAL',
      type: 'abnormal_vibration',
      title: isVibCrit
        ? 'Abnormal Crankcase Vibration / Structural Limit Alert'
        : isVibWarn
        ? 'Elevated Engine Mechanical Vibration / Harmonic Peak'
        : 'Crankshaft Torsional & Mechanical Vibration',
      severity: isVibCrit ? 'CRITICAL' : isVibWarn ? 'WARNING' : 'NORMAL',
      priorityScore: isVibCrit ? 88 : isVibWarn ? 70 : 22,
      confidence: 91,
      persistenceSeconds: getSec('vib', 210),
      status: isVibCrit ? 'Structural Alert Active' : isVibWarn ? 'Harmonic Elevation' : 'Vibration Envelope Nominal',
      missionImpact: isVibCrit ? 'HIGH' : isVibWarn ? 'MODERATE' : 'NOMINAL',
      explanation: isVibWarn
        ? `Broadband RMS crankcase vibration (${vib.toFixed(2)}g) has elevated above the 1.5g warning threshold. Energy is concentrated at 1X propeller and 2X crankshaft rotational frequencies.`
        : `Broadband RMS crankcase vibration (${vib.toFixed(2)}g) and fundamental propeller/crankshaft harmonics remain beneath the 2.0g alert limit with no structural anomalies detected.`,
      monitorNow: [
        `Broadband vibration RMS amplitude (${vib.toFixed(2)}g, alert limit 2.0g).`,
        'Spectral energy ratio between 1X and 2X engine rotational orders.',
        'Engine rubber mount dynamic damping deflection.',
      ],
      decisionOptions: isVibWarn
        ? ['Request propulsion engineer review', 'Begin return-to-base assessment', 'Escalate according to approved SOP']
        : ['Continue normally', 'Continue with enhanced monitoring'],
      maintenancePriority: isVibWarn ? 'Inspect before next mission' : 'Routine turnaround check',
      maintenanceActions: [
        '• Inspect engine vibration isolator dampeners and mounting hardware torque.',
        '• Check propeller blade track, balance, and gearbox drive dog clearance.',
        '• Perform acoustic FFT scan of reduction gearbox planetary gearset.',
      ],
      evidence: [
        { label: 'RMS Vibration Amplitude', value: `${vib.toFixed(2)}g`, state: isVibWarn ? 'warning' : 'nominal' },
        { label: 'Order 1X Propeller Harm', value: isVibWarn ? 'Elevated (0.85g)' : '0.24g (Nominal)', state: isVibWarn ? 'warning' : 'nominal' },
        { label: 'Mounting Damping Index', value: '94% integrity', state: 'nominal' },
      ],
      modelContribution: { physics: 40, anomaly: 40, trend: 20 },
      healthImpact: {
        currentHealthScore: healthScore,
        currentRulHours: currentRul,
        rulUncertaintyHours: 8,
        projectedRulIfPersistent: isVibWarn ? Math.max(currentRul - 35, 30) : currentRul,
      },
      missionRecommendation: isVibWarn
        ? 'Monitor vibration trends closely. Avoid prolonged operation in rotational speed resonance band (4800-5100 RPM).'
        : 'Continue mission normally under approved flight profile.',
      advisorySource: 'Prototype rule + trend engine',
    });

    // =========================================================================
    // 4. MAP SENSOR BIAS / INTAKE AIR ACOUSTICS
    // =========================================================================
    const isMapDrift = rawFault.includes('map') || rawFault.includes('sensor_drift');

    list.push({
      id: 'map-sensor-drift',
      category: 'SENSOR',
      type: 'map_sensor_bias_drift',
      title: isMapDrift
        ? 'MAP Sensor Bias Drift (Sensor Quality Anomaly)'
        : 'Manifold Air Pressure (MAP) Calibration',
      severity: isMapDrift ? 'ADVISORY' : 'NORMAL',
      priorityScore: isMapDrift ? 52 : 18,
      confidence: 92,
      persistenceSeconds: getSec('map', 320),
      status: isMapDrift ? 'Sensor Bias Validation' : 'Calibration Confirmed',
      missionImpact: isMapDrift ? 'LOW' : 'NOMINAL',
      explanation: isMapDrift
        ? `Manifold absolute pressure (${mapHpa} hPa) remains slightly above calibrated physics expectations for current RPM and throttle setting, while fuel flow and RPM remain steady. Physics model isolates this as sensor bias drift rather than physical manifold leakage.`
        : `Intake manifold absolute pressure (${mapHpa} hPa) closely correlates with MVEM thermodynamic twin airflow estimation with residual divergence under 0.8σ.`,
      monitorNow: [
        `Manifold absolute pressure reading against engine performance map (${mapHpa} hPa).`,
        'Throttle angle vs. air charge mass flow synthetic estimation.',
        'Ambient barometric pressure reference agreement.',
      ],
      decisionOptions: ['Continue normally', 'Continue with enhanced monitoring', 'Schedule maintenance review'],
      maintenancePriority: isMapDrift ? 'Inspect within 1 flight cycle' : 'Routine turnaround check',
      maintenanceActions: [
        '• Inspect MAP sensor pneumatic line, electrical harness connector, and ground reference.',
        '• Compare sensor reading against calibrated pitot-static reference during post-flight ground test.',
      ],
      evidence: [
        { label: 'Intake MAP Reading', value: `${mapHpa} hPa`, state: isMapDrift ? 'advisory' : 'nominal' },
        { label: 'Physics MVEM Residual', value: isMapDrift ? '+12.4% divergence' : '< 0.75σ (Normal)', state: isMapDrift ? 'advisory' : 'nominal' },
        { label: 'Throttle Plausibility', value: 'Consistent with 75% power', state: 'nominal' },
      ],
      modelContribution: { physics: 50, anomaly: 30, trend: 20 },
      healthImpact: {
        currentHealthScore: healthScore,
        currentRulHours: currentRul,
        rulUncertaintyHours: 8,
        projectedRulIfPersistent: currentRul,
      },
      missionRecommendation: isMapDrift
        ? 'Continue mission under enhanced monitoring. Low mission impact; cross-check MAP against synthetic digital twin.'
        : 'Continue mission normally under approved standard flight profile.',
      advisorySource: 'Hybrid physics + AI model',
    });

    // =========================================================================
    // 5. FUEL INJECTION & COMBUSTION BALANCE
    // =========================================================================
    const isInjWarn = rawFault.includes('injector') || rawFault.includes('combust') || rawFault.includes('misfire');

    list.push({
      id: 'injector-abnormality',
      category: 'FUEL',
      type: 'injector_abnormality',
      title: isInjWarn
        ? 'Fuel Injector Asymmetry / Combustion Imbalance'
        : 'Combustion Balance & Injector Synchronization',
      severity: isInjWarn ? 'WARNING' : 'NORMAL',
      priorityScore: isInjWarn ? 74 : 16,
      confidence: 89,
      persistenceSeconds: getSec('inj', 260),
      status: isInjWarn ? 'Combustion Asymmetry' : 'Multi-Cylinder Balanced',
      missionImpact: isInjWarn ? 'MODERATE' : 'NOMINAL',
      explanation: isInjWarn
        ? `Exhaust gas temperature dispersion across cylinders 1-4 has expanded beyond nominal ±25°C limits, suggesting potential partial nozzle clogging or unequal port injection delivery on cylinder 2.`
        : `Dual-redundant port fuel injectors delivering uniform stoichiometric fuel distribution across cylinders 1-4. Indicated mean effective pressure cyclic variation is under 1.8%.`,
      monitorNow: [
        'Inter-cylinder EGT spread between highest and lowest cylinder.',
        `Total instantaneous fuel flow rate (${fuelFlow.toFixed(1)} L/h).`,
        'Individual cylinder cycle-to-cycle rotational acceleration delta.',
      ],
      decisionOptions: isInjWarn
        ? ['Continue with enhanced monitoring', 'Request propulsion engineer review', 'Escalate according to approved SOP']
        : ['Continue normally', 'Continue with enhanced monitoring'],
      maintenancePriority: isInjWarn ? 'Inspect before next mission' : 'Routine 50-hr interval',
      maintenanceActions: [
        '• Perform fuel injector flow bench balance test and ultrasonic cleaning.',
        '• Inspect high-pressure fuel rail filters and check fuel rail pressure regulator.',
      ],
      evidence: [
        { label: 'EGT Inter-Cyl Spread', value: isInjWarn ? '48°C (Elevated)' : '18°C (Balanced)', state: isInjWarn ? 'warning' : 'nominal' },
        { label: 'Fuel Flow Rate', value: `${fuelFlow.toFixed(1)} L/h`, state: 'nominal' },
        { label: 'Cyclic Dispersion (COV)', value: isInjWarn ? '3.8% (Borderline)' : '1.4% (Normal)', state: isInjWarn ? 'warning' : 'nominal' },
      ],
      modelContribution: { physics: 45, anomaly: 35, trend: 20 },
      healthImpact: {
        currentHealthScore: healthScore,
        currentRulHours: currentRul,
        rulUncertaintyHours: 8,
        projectedRulIfPersistent: isInjWarn ? Math.max(currentRul - 25, 40) : currentRul,
      },
      missionRecommendation: isInjWarn
        ? 'Maintain current throttle setting. Avoid rapid power transients and monitor cylinder temperatures.'
        : 'Continue mission normally under approved standard flight profile.',
      advisorySource: 'Hybrid physics + AI model',
    });

    // =========================================================================
    // 6. ELECTRICAL POWER BUS & DUAL-LANE REGULATION
    // =========================================================================
    const isElecWarn = (s.bus_v && s.bus_v < 24.5) || rawFault.includes('batt') || rawFault.includes('alt');

    list.push({
      id: 'electrical-bus-issue',
      category: 'ELECTRICAL',
      type: 'battery_alternator_issue',
      title: isElecWarn
        ? 'Dual-Lane Electrical Bus & Alternator Alert'
        : 'Electrical Power Distribution & Dual Alternator',
      severity: isElecWarn ? 'WARNING' : 'NORMAL',
      priorityScore: isElecWarn ? 65 : 12,
      confidence: 95,
      persistenceSeconds: getSec('elec', 400),
      status: isElecWarn ? 'Voltage Depressed' : 'Dual Lane Regulated',
      missionImpact: isElecWarn ? 'MODERATE' : 'NOMINAL',
      explanation: isElecWarn
        ? `Main DC avionics bus voltage has dropped below 25.0V. Internal alternator generator output is asymmetric between Lane A and Lane B.`
        : `Lane A and Lane B dual-redundant ECU power rails stable at ${(s.bus_v || 27.8).toFixed(1)}V with balanced generator output ${(s.generator_a || 28.5).toFixed(0)}A.`,
      monitorNow: [
        `Main bus voltage (${(s.bus_v || 27.8).toFixed(1)}V, min 25.0V).`,
        `ECU battery voltage (${(s.ecu_batt_v || 13.8).toFixed(1)}V).`,
        `Generator load balance (${(s.generator_a || 28.5).toFixed(0)}A).`,
      ],
      decisionOptions: isElecWarn
        ? ['Request propulsion engineer review', 'Begin return-to-base assessment', 'Escalate according to approved SOP']
        : ['Continue normally'],
      maintenancePriority: isElecWarn ? 'Inspect before next mission' : 'Routine turnaround check',
      maintenanceActions: [
        '• Check dual alternator drive belts and voltage regulator calibration.',
        '• Inspect battery internal impedance and harness wiring terminals.',
      ],
      evidence: [
        { label: 'Bus Voltage (DC)', value: `${(s.bus_v || 27.8).toFixed(1)} V`, state: isElecWarn ? 'warning' : 'nominal' },
        { label: 'ECU Battery Rail', value: `${(s.ecu_batt_v || 13.8).toFixed(1)} V`, state: 'nominal' },
        { label: 'Generator Output', value: `${(s.generator_a || 28.5).toFixed(0)} A`, state: 'nominal' },
      ],
      modelContribution: { physics: 40, anomaly: 40, trend: 20 },
      healthImpact: {
        currentHealthScore: healthScore,
        currentRulHours: currentRul,
        rulUncertaintyHours: 8,
        projectedRulIfPersistent: isElecWarn ? Math.max(currentRul - 20, 50) : currentRul,
      },
      missionRecommendation: isElecWarn
        ? 'Shed non-essential electrical payloads. Verify Lane A and Lane B dual-channel telemetry integrity.'
        : 'Continue mission normally under approved standard flight profile.',
      advisorySource: 'Hybrid physics + AI model',
    });

    // =========================================================================
    // 7. SYSTEM BASELINE
    // =========================================================================
    list.push({
      id: 'normal-baseline',
      category: 'SYSTEM',
      type: 'normal',
      title: 'All Engine Subsystems Nominal Baseline',
      severity: 'NORMAL',
      priorityScore: 8,
      confidence: 98,
      persistenceSeconds: getSec('base', 720),
      status: 'Baseline Confirmed',
      missionImpact: 'NOMINAL',
      explanation: `Comprehensive digital twin health score at ${healthScore}%. Engine running within certified Rotax 915/916 iS operating limits across all thermal, hydraulic, and electrical telemetry channels.`,
      monitorNow: [
        'Standard periodic cross-checks of CHT and oil pressure.',
        'Routine fuel flow burn against flight plan waypoint estimates.',
        'Propeller rotational harmonic stability during level cruise.',
      ],
      decisionOptions: ['Continue normally', 'Continue with enhanced monitoring', 'Schedule routine turnaround inspection'],
      maintenancePriority: 'Monitor only',
      maintenanceActions: [
        '• Perform standard turnaround walkaround and pre-flight inspection.',
        '• Log engine operating hours and cyclic thermal counts.',
        '• Maintain scheduled 50-hour routine maintenance interval.',
      ],
      evidence: [
        { label: 'EKF State Residual Norm', value: '< 0.75σ (Normal)', state: 'nominal' },
        { label: 'Digital Twin Health', value: `${healthScore}% (High)`, state: 'nominal' },
        { label: 'Oil Pressure Stability', value: '±0.04 bar variance', state: 'nominal' },
        { label: 'Crankcase RMS Vibration', value: `${vib.toFixed(2)}g (Safe)`, state: 'nominal' },
      ],
      modelContribution: { physics: 50, anomaly: 30, trend: 20 },
      healthImpact: {
        currentHealthScore: healthScore,
        currentRulHours: currentRul,
        rulUncertaintyHours: 8,
        projectedRulIfPersistent: currentRul,
      },
      missionRecommendation: 'Continue mission normally under approved standard flight profile.',
      advisorySource: 'Hybrid physics + AI model',
    });

    // =========================================================================
    // SORTING & RANK HYSTERESIS
    // =========================================================================
    list.sort((a, b) => b.priorityScore - a.priorityScore);

    list.forEach((item, idx) => {
      const currentRank = idx + 1;
      item.rank = currentRank;
      item.rankStr = String(currentRank).padStart(2, '0');
      const prevRank = this.previousRanks.get(item.id) || currentRank;
      item.rankShift = prevRank - currentRank; // Positive = climbed up, Negative = dropped
    });

    // Update previous ranks with hysteresis (periodically or on significant changes)
    if (!this.lastRankUpdate || Date.now() - this.lastRankUpdate > 2500) {
      list.forEach((item) => this.previousRanks.set(item.id, item.rank));
      this.lastRankUpdate = Date.now();
    }

    this.advisories = list;

    // Preserve selected item if valid, else pick top ranked
    if (!this.selectedIncidentId || !this.advisories.some((i) => i.id === this.selectedIncidentId)) {
      this.selectedIncidentId = this.advisories[0]?.id || 'overheating-trend';
    }
  }

  updateContext(s, h, res, rul, packet) {
    const rpm = Math.round(s.engine_rpm || 5000);
    const maxCht = Array.isArray(s.cht_c) ? Math.max(...s.cht_c).toFixed(1) : (s.cht || 108.4).toFixed(1);
    const maxEgt = Array.isArray(s.egt_c) ? Math.max(...s.egt_c).toFixed(0) : (s.egt || 785).toFixed(0);
    const oilP = (s.oil_press_bar || 3.8).toFixed(2);
    const oilT = (s.oil_temp_c || 82.0).toFixed(1);
    const fuelFlow = (s.fuel_flow_lph || 24.5).toFixed(1);
    const vib = (s.vibration_g || 1.18).toFixed(2);

    if (this.ctxRpm) this.ctxRpm.innerText = rpm;
    if (this.ctxCht) this.ctxCht.innerText = `${maxCht}°C`;
    if (this.ctxEgt) this.ctxEgt.innerText = `${maxEgt}°C`;
    if (this.ctxOilP) this.ctxOilP.innerText = `${oilP} bar`;
    if (this.ctxOilT) this.ctxOilT.innerText = `${oilT}°C`;
    if (this.ctxFuelFlow) this.ctxFuelFlow.innerText = `${fuelFlow} L/h`;
    if (this.ctxVib) this.ctxVib.innerText = `${vib} g`;

    if (this.ctxHealthScore) this.ctxHealthScore.innerText = `${Math.round(h.health_score_pct || 92)} / 100`;
    if (this.ctxHealthTrend) this.ctxHealthTrend.innerText = packet.health_trend || 'Stable';
    if (this.ctxAnomalyScore) this.ctxAnomalyScore.innerText = `${Math.round(res.anomaly_score_pct || 12)}%`;

    if (this.ctxAlt) this.ctxAlt.innerText = `${Math.round(s.altitude_m || 3000)} m (${Math.round((s.altitude_m || 3000) * 3.28084)} ft)`;
    if (this.ctxOat) this.ctxOat.innerText = `${(s.ambient_temp_c || -4.5).toFixed(1)}°C`;
    if (this.ctxThrottle) this.ctxThrottle.innerText = `${Math.round(s.throttle_pct || 75)}%`;
    if (this.ctxPhase) this.ctxPhase.innerText = packet.mission_phase || 'CRUISE / LOITER';
  }

  renderQueue(force = false) {
    if (!this.queueListEl) return;

    // Filter advisories based on category and search query
    let filtered = this.advisories;
    if (this.queueCategoryFilter && this.queueCategoryFilter !== 'ALL') {
      filtered = filtered.filter((item) => (item.severity || '').toUpperCase() === this.queueCategoryFilter);
    }
    if (this.queueSearchQuery) {
      filtered = filtered.filter((item) => {
        const text = `${item.title} ${item.severity} ${item.status} ${item.id} ${item.category || ''}`.toLowerCase();
        return text.includes(this.queueSearchQuery);
      });
    }

    if (this.queueCountEl) {
      const activeHigh = this.advisories.filter((a) => a.severity === 'CRITICAL' || a.severity === 'WARNING').length;
      this.queueCountEl.innerText = activeHigh > 0 ? `${activeHigh} ALERT / ${this.advisories.length} TOTAL` : `${this.advisories.length} MONITORED`;
    }

    // Check signature & throttle timer to prevent 10 Hz DOM wiping
    const newSignature = filtered.map((i) => `${i.id}:${i.severity}:${i.priorityScore}:${i.rank}:${i.id === this.selectedIncidentId}`).join('|');
    const now = Date.now();
    const shouldUpdateTimer = !this.lastQueueRenderTime || now - this.lastQueueRenderTime > 1500;

    if (!force && this.lastQueueSignature === newSignature && !shouldUpdateTimer) {
      return; // Skip re-rendering to protect mouse clicks, hover, and scroll performance
    }

    this.lastQueueSignature = newSignature;
    this.lastQueueRenderTime = now;

    const currentScroll = this.queueListEl.scrollTop;

    if (filtered.length === 0) {
      this.queueListEl.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: #64748b; font-size: 11px;">
          No advisories matching filter <strong>${this.queueCategoryFilter}</strong>.
        </div>
      `;
      return;
    }

    this.queueListEl.innerHTML = filtered
      .map((item) => {
        const isSelected = item.id === this.selectedIncidentId;
        const sev = (item.severity || 'NORMAL').toLowerCase();
        const min = Math.floor((item.persistenceSeconds || 60) / 60);
        const sec = Math.floor((item.persistenceSeconds || 60) % 60);
        const dur = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

        let shiftBadge = `<span class="adv-priority-shift-pill shift-same" title="Rank stable">―</span>`;
        if (item.rankShift > 0) {
          shiftBadge = `<span class="adv-priority-shift-pill shift-up" title="Priority rank elevated +${item.rankShift}">▲ +${item.rankShift}</span>`;
        } else if (item.rankShift < 0) {
          shiftBadge = `<span class="adv-priority-shift-pill shift-down" title="Priority rank reduced -${Math.abs(item.rankShift)}">▼ -${Math.abs(item.rankShift)}</span>`;
        }

        return `
          <div class="adv-queue-card card-${sev} ${isSelected ? 'selected' : ''}" data-id="${item.id}" role="button" tabindex="0">
            <div class="adv-card-top-row">
              <div class="adv-rank-sev-wrap">
                <span class="adv-rank-num font-mono">${item.rankStr || '01'}</span>
                <span class="ai-badge badge-${sev}">${item.severity}</span>
                ${shiftBadge}
              </div>
              <div class="adv-priority-score font-mono">P-${item.priorityScore}</div>
            </div>
            <div class="adv-card-title">${item.title}</div>
            <div class="adv-card-meta-row">
              <div class="adv-card-metrics">
                <span title="Model Confidence Score">🎯 ${item.confidence}%</span>
                <span title="Condition Duration">⏱️ ${dur}</span>
              </div>
              <div class="adv-card-status font-mono text-muted">${item.status}</div>
            </div>
          </div>
        `;
      })
      .join('');

    this.queueListEl.scrollTop = currentScroll;
  }

  renderActiveAdvisory() {
    const inc = this.advisories.find((i) => i.id === this.selectedIncidentId) || this.advisories[0];
    if (!inc) return;

    const sev = (inc.severity || 'NORMAL').toLowerCase();

    if (this.advAssessmentEl) {
      this.advAssessmentEl.innerText = inc.severity;
      this.advAssessmentEl.className = `ai-badge badge-${sev}`;
    }
    const mgr = window.assuranceManager;
    const qScore = mgr ? mgr.qualityMetrics.dataConfidenceScore : 98;
    const isQualityDegraded = qScore < 85;
    const adjustedConf = isQualityDegraded ? Math.max(15, Math.round(inc.confidence * (qScore / 100))) : inc.confidence;

    if (this.advConditionEl) this.advConditionEl.innerText = inc.title;
    if (this.advConfidenceEl) {
      this.advConfidenceEl.innerHTML = `${adjustedConf}% ${isQualityDegraded ? '<span style="font-size:10px; color:#7c3aed; font-weight:600;">(Reduced by Data Quality)</span>' : ''}`;
    }
    if (this.advPriorityEl) this.advPriorityEl.innerText = `P-${inc.priorityScore}`;
    if (this.advImpactEl) this.advImpactEl.innerText = inc.missionImpact;
    if (this.advStatusEl) this.advStatusEl.innerHTML = `${inc.status} <span style="font-size:10px; color:#38bdf8; font-weight:normal;">[Synthetic Demonstrator]</span>`;
    if (this.advExplanationEl) {
      this.advExplanationEl.innerHTML = `${inc.explanation}<div style="font-size:10px; color:#64748b; margin-top:6px; font-style:italic;">Assurance Note: Illustrative advisory output; data quality index ${qScore}%. Not a certified or flight-critical diagnosis.</div>`;
    }

    // Monitor Now
    if (this.advMonitorListEl) {
      this.advMonitorListEl.innerHTML = (inc.monitorNow || [])
        .map((m) => `<div class="adv-monitor-item"><span class="adv-monitor-bullet">👁️</span><span>${m}</span></div>`)
        .join('');
    }

    // Operator Decision Support Buttons
    if (this.advDecisionButtonsEl) {
      this.advDecisionButtonsEl.innerHTML = (inc.decisionOptions || [])
        .map((opt) => `<button type="button" class="adv-decision-btn" data-decision="${opt}"><span class="adv-decision-btn-icon">⚡</span><span>[ ${opt} ]</span></button>`)
        .join('');

      this.advDecisionButtonsEl.querySelectorAll('.adv-decision-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const decision = btn.getAttribute('data-decision');
          this.openModal(inc, decision);
        });
      });
    }

    // Maintenance
    if (this.advMaintPriorityEl) this.advMaintPriorityEl.innerText = inc.maintenancePriority;
    if (this.advMaintListEl) {
      this.advMaintListEl.innerHTML = (inc.maintenanceActions || [])
        .map((a) => `<div>${a}</div>`)
        .join('');
    }

    // Evidence
    if (this.advEvidenceGridEl) {
      this.advEvidenceGridEl.innerHTML = (inc.evidence || [])
        .map((e) => `
          <div class="adv-evidence-card">
            <div class="adv-evidence-label">${e.label}</div>
            <div class="adv-evidence-value state-${e.state || 'nominal'} font-mono">${e.value}</div>
          </div>
        `)
        .join('');
    }

    // Contribution bars
    const p = inc.modelContribution?.physics ?? 45;
    const a = inc.modelContribution?.anomaly ?? 35;
    const t = inc.modelContribution?.trend ?? 20;

    if (this.barPhysicsVal) this.barPhysicsVal.innerText = `${p}%`;
    if (this.barPhysicsFill) this.barPhysicsFill.style.width = `${p}%`;
    if (this.barAnomalyVal) this.barAnomalyVal.innerText = `${a}%`;
    if (this.barAnomalyFill) this.barAnomalyFill.style.width = `${a}%`;
    if (this.barTrendVal) this.barTrendVal.innerText = `${t}%`;
    if (this.barTrendFill) this.barTrendFill.style.width = `${t}%`;

    // Prognostics
    if (this.advHealthScoreEl) this.advHealthScoreEl.innerText = `${inc.healthImpact?.currentHealthScore ?? 92} / 100`;
    if (this.advRulValEl) this.advRulValEl.innerText = `${inc.healthImpact?.currentRulHours ?? 789} h ± ${inc.healthImpact?.rulUncertaintyHours ?? 8} h`;
    if (this.advProjectedRulEl) this.advProjectedRulEl.innerText = `${inc.healthImpact?.projectedRulIfPersistent ?? 760} h`;
    if (this.advMissionImpactEl) this.advMissionImpactEl.innerText = inc.missionImpact;
    if (this.advRecommendationEl) {
      this.advRecommendationEl.innerText = inc.missionRecommendation;
      this.advRecommendationEl.className = `ai-mission-recommendation-box rec-${sev}`;
    }
  }

  renderTimeline() {
    if (!this.timelineTableBody) return;

    const filtered = this.timelineEvents.filter((ev) => {
      if (this.activeFilter === 'ALL') return true;
      return (ev.category || 'AI').toUpperCase() === this.activeFilter;
    });

    if (this.timelineCountEl) {
      this.timelineCountEl.innerText = `(${filtered.length} / ${this.timelineEvents.length} EVENTS)`;
    }

    this.timelineTableBody.innerHTML = filtered
      .map((ev) => {
        const sev = (ev.severity || 'INFO').toLowerCase();
        const isOp = ev.category === 'OPERATOR';

        return `
          <tr class="${isOp ? 'row-operator-decision' : ''}">
            <td class="font-mono font-bold text-muted">${ev.timeStr || ev.time || '14:30:00'}</td>
            <td><span class="adv-cat-tag cat-${(ev.category || 'ai').toLowerCase()}">${ev.category || 'AI'}</span></td>
            <td><span class="ai-badge badge-${sev}">${ev.severity || 'INFO'}</span></td>
            <td class="adv-desc-cell">
              <span class="adv-desc-text">${ev.description}</span>
              ${ev.operatorNote ? `<span class="adv-operator-note-bubble" title="Operator Note">💬 Note: ${ev.operatorNote}</span>` : ''}
            </td>
            <td class="font-mono text-center font-bold">${ev.priorityScore ? `P-${ev.priorityScore}` : '—'}</td>
            <td class="font-mono text-xs text-muted">${ev.acknowledged ? '✓ ACKNOWLEDGED' : ev.status || 'RECORDED'}</td>
          </tr>
        `;
      })
      .join('');
  }

  openModal(incident, decisionText) {
    this.modalState = { isOpen: true, incident, selectedDecision: decisionText };
    if (this.modalConditionTitle) this.modalConditionTitle.innerText = incident.title;
    if (this.modalConditionSev) {
      this.modalConditionSev.innerText = incident.severity;
      this.modalConditionSev.className = `ai-badge badge-${(incident.severity || 'NORMAL').toLowerCase()}`;
    }
    if (this.modalDecisionText) this.modalDecisionText.innerText = decisionText;
    if (this.modalNoteInput) this.modalNoteInput.value = '';
    if (this.modalBackdrop) this.modalBackdrop.style.display = 'flex';
  }

  closeModal() {
    this.modalState = { isOpen: false, incident: null, selectedDecision: '' };
    if (this.modalBackdrop) this.modalBackdrop.style.display = 'none';
  }

  confirmDecision() {
    const { incident, selectedDecision } = this.modalState;
    if (!incident) return;

    const note = this.modalNoteInput ? this.modalNoteInput.value.trim() : '';
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const newEvent = {
      id: `ev-${Date.now()}`,
      time: timeStr,
      timeStr,
      timestamp: now.toISOString(),
      category: 'OPERATOR',
      severity: incident.severity || 'INFO',
      description: `Operator acknowledged: [${selectedDecision}] for ${incident.title}`,
      priorityScore: incident.priorityScore,
      operatorNote: note,
      selectedDecision,
      acknowledged: true,
      status: 'CONFIRMED',
    };

    this.timelineEvents.push(newEvent);
    if (this.timelineEvents.length > 100) this.timelineEvents.shift();

    try {
      localStorage.setItem('aerotwin_advisory_events', JSON.stringify(this.timelineEvents));
    } catch (e) {}

    this.closeModal();
    this.renderTimeline();
  }

  exportCSV() {
    if (!this.timelineEvents || this.timelineEvents.length === 0) {
      alert('No advisory events recorded to export.');
      return;
    }

    const headers = [
      'Timestamp (UTC)',
      'Mission ID',
      'UAV ID',
      'Category',
      'Severity',
      'Event Description',
      'Priority Score',
      'Operator Acknowledged',
      'Selected Decision',
      'Operator Notes',
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = this.timelineEvents.map((ev) => [
      escapeCSV(ev.timestamp || new Date().toISOString()),
      escapeCSV('M-2025-07-14'),
      escapeCSV('UAV-03'),
      escapeCSV(ev.category || 'AI'),
      escapeCSV(ev.severity || 'INFO'),
      escapeCSV(ev.description || ''),
      escapeCSV(ev.priorityScore ? `P-${ev.priorityScore}` : ''),
      escapeCSV(ev.acknowledged ? 'YES' : 'NO'),
      escapeCSV(ev.selectedDecision || ''),
      escapeCSV(ev.operatorNote || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `AeroTwin_Advisory_Log_M-2025-07-14_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
