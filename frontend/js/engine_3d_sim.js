/**
 * ============================================================================
 * AEROTWIN // 3D MULTI-ENGINE SIMULATION PHYSICS & SYNTHETIC TELEMETRY ENGINE
 * ============================================================================
 * Autonomous, modular digital twin simulation service supporting four distinct
 * aero propulsion architectures:
 * 1. Four-Stroke Heavy-Fuel Compression-Ignition Engine
 * 2. Horizontally Opposed / Boxer Reciprocating-Piston Engine
 * 3. Wankel Rotary Internal-Combustion Engine (with comparison technical note)
 * 4. Turbocharged / Supercharged Multi-Cylinder Inline or V Engine
 *
 * All telemetry is synthetic simulation data. Generates 10 Hz telemetry packets
 * adapting dynamically to the selected architecture.
 */

class Engine3DSimulator {
  constructor() {
    this.source = 'synthetic_multi_engine_simulation';
    this.simulationId = 'SIM-LAB-' + Math.floor(1000 + Math.random() * 9000);
    this.status = 'STOPPED'; // 'RUNNING', 'PAUSED', 'STOPPED'
    this.speedMultiplier = 1.0;
    this.simTimeSeconds = 0;
    this.timerId = null;
    this.subscribers = [];

    // Active Engine Architecture ('BOXER', 'HEAVY_FUEL_CI', 'WANKEL_ROTARY', 'TURBO_INLINE_V')
    this.activeEngineType = 'BOXER';

    // Mission Profile
    this.missionPhase = 'loiter';

    // Environmental Parameters
    this.env = {
      altitude_ft: 10000,
      ambient_temp_c: 35.0,
      air_pressure_hpa: 697.0,
      humidity_pct: 45.0,
      mission_duration_min: 120.0,
    };

    // Core Engine State (dynamically populated based on architecture)
    this.engine = {};
    this.cylinders = [];
    this.chambers = []; // For Wankel Rotary

    // Analytics & Prognostics
    this.analytics = {
      overall_health_score: 91.0,
      anomaly_score: 0.08,
      estimated_rul_hours: 198.5,
      degradation_percent: 8.5,
      diagnostic_reasoning: 'PHYSICS CORRELATION: EKF sensor residuals nominal.'
    };

    // Generic and architecture-specific faults
    this.faults = {
      enabled: false,
      affected_cylinder: 3,
      // Shared / Boxer faults
      overheating_severity: 0.0,
      low_oil_pressure_severity: 0.0,
      injector_degradation_severity: 0.0,
      misfire_severity: 0.0,
      abnormal_vibration_severity: 0.0,
      high_vibration_severity: 0.0,
      crankcase_vibration_severity: 0.0,
      sensor_drift_severity: 0.0,
      alternator_loss_severity: 0.0,
      bank_imbalance_severity: 0.0,
      // Heavy-Fuel CI faults
      fuel_rail_pressure_drop_severity: 0.0,
      combustion_imbalance_severity: 0.0,
      // Wankel Rotary faults
      apex_seal_wear_severity: 0.0,
      housing_overheating_severity: 0.0,
      port_restriction_severity: 0.0,
      combustion_instability_severity: 0.0,
      thermal_gradient_severity: 0.0,
      // Turbocharged faults
      boost_leak_severity: 0.0,
      turbo_overspeed_severity: 0.0,
      wastegate_fault_severity: 0.0,
      intercooler_degradation_severity: 0.0
    };

    this.alerts = [];

    // Rolling History
    this.history = {
      timestamps: [],
      rpm: [],
      primary_temp: [], // CHT or Rotor Housing Temp
      egt: [],
      vibration: [],
      oil_press: [],
      maxPoints: 80,
    };

    // Initialize initial architecture state
    this.applyArchitectureDefaults(this.activeEngineType);
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(fn => fn !== callback);
    };
  }

  notify(packet) {
    for (let i = 0; i < this.subscribers.length; i++) {
      try {
        this.subscribers[i](packet);
      } catch (e) {
        console.error('Error in subscriber callback:', e);
      }
    }
  }

  switchEngineArchitecture(type, keepSettings = false) {
    if (!type || !(type in (window.ENGINE_ARCHITECTURES || {}))) return;
    this.activeEngineType = type;
    if (!keepSettings) {
      this.clearFaults();
      this.simTimeSeconds = 0;
    }
    this.applyArchitectureDefaults(type);
    this.notify(this.getTelemetryPacket());
  }

  applyArchitectureDefaults(type) {
    const cfg = (window.ENGINE_ARCHITECTURES && window.ENGINE_ARCHITECTURES[type]) ? window.ENGINE_ARCHITECTURES[type] : null;
    const ranges = cfg ? cfg.normalRanges : null;

    if (type === 'HEAVY_FUEL_CI') {
      this.engine = {
        architecture_id: 'HEAVY_FUEL_CI',
        throttle_percent: 72.0,
        target_rpm: 3600.0,
        rpm: 3600.0,
        fuel_rail_press_bar: 1450.0,
        injection_timing_btdc_deg: 14.5,
        combustion_quality_pct: 96.0,
        cht_c: 112.5,
        egt_c: 685.0,
        oil_pressure_bar: 4.6,
        oil_temp_c: 98.0,
        fuel_flow_lph: 22.4,
        vibration_rms_g: 0.58,
        engine_efficiency_pct: 92.4,
        battery_voltage_v: 28.2,
        initial_health_pct: 94.0
      };
      this.cylinders = [
        { id: 1, name: 'Cyl 1', cht_c: 111.0, egt_c: 680.0, health: 95, fault: null },
        { id: 2, name: 'Cyl 2', cht_c: 113.0, egt_c: 690.0, health: 94, fault: null },
        { id: 3, name: 'Cyl 3', cht_c: 112.0, egt_c: 685.0, health: 94, fault: null },
        { id: 4, name: 'Cyl 4', cht_c: 114.0, egt_c: 685.0, health: 93, fault: null }
      ];
      this.chambers = [];
      this.analytics.overall_health_score = 94.0;
      this.analytics.estimated_rul_hours = 245.0;
    } else if (type === 'WANKEL_ROTARY') {
      this.engine = {
        architecture_id: 'WANKEL_ROTARY',
        throttle_percent: 75.0,
        target_rpm: 6200.0,
        rpm: 6200.0,
        rotor_housing_temp_c: 118.0,
        egt_c: 845.0,
        intake_pressure_hpa: 980.0,
        seal_health_pct: 95.0,
        thermal_stress_pct: 28.0,
        oil_pressure_bar: 4.8,
        fuel_flow_lph: 42.0,
        vibration_rms_g: 0.18, // Ultra smooth rotary
        engine_efficiency_pct: 84.0,
        battery_voltage_v: 28.0,
        initial_health_pct: 93.0
      };
      this.cylinders = []; // Wankel has NO pistons or cylinders!
      this.chambers = [
        { id: 'A', name: 'Chamber A [Intake/Comp]', temp_c: 72.0, status: 'NOMINAL', seal_wear: 4 },
        { id: 'B', name: 'Chamber B [Combustion/Exp]', temp_c: 142.0, status: 'NOMINAL', seal_wear: 6 },
        { id: 'C', name: 'Chamber C [Exhaust Sector]', temp_c: 118.0, status: 'NOMINAL', seal_wear: 5 }
      ];
      this.analytics.overall_health_score = 93.0;
      this.analytics.estimated_rul_hours = 180.0;
    } else if (type === 'TURBO_INLINE_V') {
      this.engine = {
        architecture_id: 'TURBO_INLINE_V',
        throttle_percent: 82.0,
        target_rpm: 5400.0,
        rpm: 5400.0,
        boost_pressure_bar: 0.95,
        manifold_pressure_hpa: 1420.0,
        turbo_speed_pct: 84.0,
        iat_c: 42.5,
        intercooler_eff_pct: 88.0,
        cht_c: 114.2,
        egt_c: 815.0,
        oil_pressure_bar: 4.4,
        oil_temp_c: 104.0,
        fuel_flow_lph: 44.5,
        vibration_rms_g: 0.46,
        engine_efficiency_pct: 89.2,
        battery_voltage_v: 28.0,
        initial_health_pct: 90.0
      };
      this.cylinders = [
        { id: 1, name: 'Cyl 1', cht_c: 113.0, egt_c: 810.0, health: 91, fault: null },
        { id: 2, name: 'Cyl 2', cht_c: 115.0, egt_c: 820.0, health: 90, fault: null },
        { id: 3, name: 'Cyl 3', cht_c: 114.0, egt_c: 815.0, health: 90, fault: null },
        { id: 4, name: 'Cyl 4', cht_c: 115.0, egt_c: 815.0, health: 89, fault: null }
      ];
      this.chambers = [];
      this.analytics.overall_health_score = 90.0;
      this.analytics.estimated_rul_hours = 192.0;
    } else {
      // BOXER (Horizontally Opposed)
      this.engine = {
        architecture_id: 'BOXER',
        throttle_percent: 78.0,
        target_rpm: 5200.0,
        rpm: 5200.0,
        cht_left_bank_c: 105.5,
        cht_right_bank_c: 107.0,
        bank_imbalance_c: 1.5,
        cht_c: 108.4,
        egt_c: 795.2,
        oil_pressure_bar: 4.1,
        oil_temp_c: 101.5,
        fuel_flow_lph: 38.5,
        vibration_rms_g: 0.42,
        engine_efficiency_pct: 88.4,
        battery_voltage_v: 27.8,
        initial_health_pct: 91.0
      };
      this.cylinders = [
        { id: 1, bank: 'LEFT',  name: 'Cyl 1 [L]', cht_c: 104.0, egt_c: 780.0, health: 92, fault: null, spark_ok: true },
        { id: 2, bank: 'RIGHT', name: 'Cyl 2 [R]', cht_c: 108.0, egt_c: 795.0, health: 89, fault: null, spark_ok: true },
        { id: 3, bank: 'LEFT',  name: 'Cyl 3 [L]', cht_c: 107.0, egt_c: 785.0, health: 91, fault: null, spark_ok: true },
        { id: 4, bank: 'RIGHT', name: 'Cyl 4 [R]', cht_c: 106.0, egt_c: 788.0, health: 90, fault: null, spark_ok: true }
      ];
      this.chambers = [];
      this.analytics.overall_health_score = 91.0;
      this.analytics.estimated_rul_hours = 198.5;
    }
  }

  start() {
    if (this.status === 'RUNNING') return;
    this.status = 'RUNNING';
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => this.tick(), 100);
  }

  pause() {
    this.status = 'PAUSED';
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  stop() {
    this.status = 'STOPPED';
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  reset() {
    this.stop();
    this.simTimeSeconds = 0;
    this.clearFaults();
    this.applyArchitectureDefaults(this.activeEngineType);
    this.alerts = [];
    this.history.timestamps = [];
    this.history.rpm = [];
    this.history.primary_temp = [];
    this.history.egt = [];
    this.history.vibration = [];
    this.history.oil_press = [];
    this.notify(this.getTelemetryPacket());
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(0.2, Math.min(10.0, multiplier));
  }

  setMissionProfile(profile) {
    this.missionPhase = profile;
    const isTurbo = this.activeEngineType === 'TURBO_INLINE_V';
    const isWankel = this.activeEngineType === 'WANKEL_ROTARY';
    const isHeavy = this.activeEngineType === 'HEAVY_FUEL_CI';

    switch (profile) {
      case 'takeoff':
        this.env.altitude_ft = 500;
        this.engine.throttle_percent = 100.0;
        this.engine.target_rpm = isWankel ? 7500 : (isHeavy ? 4200 : 5800);
        break;
      case 'climb':
        this.env.altitude_ft = isTurbo ? 18000 : 8000;
        this.engine.throttle_percent = 90.0;
        this.engine.target_rpm = isWankel ? 6800 : (isHeavy ? 3900 : 5500);
        break;
      case 'cruise':
        this.env.altitude_ft = 12000;
        this.engine.throttle_percent = 78.0;
        this.engine.target_rpm = isWankel ? 6200 : (isHeavy ? 3600 : 5200);
        break;
      case 'loiter':
        this.env.altitude_ft = 10000;
        this.engine.throttle_percent = isHeavy ? 68.0 : 75.0;
        this.engine.target_rpm = isWankel ? 5800 : (isHeavy ? 3400 : 5000);
        break;
      case 'descent':
        this.env.altitude_ft = 4000;
        this.engine.throttle_percent = 45.0;
        this.engine.target_rpm = isWankel ? 4200 : (isHeavy ? 2600 : 3800);
        break;
      case 'landing':
        this.env.altitude_ft = 200;
        this.engine.throttle_percent = 32.0;
        this.engine.target_rpm = isWankel ? 3500 : (isHeavy ? 2200 : 3000);
        break;
      default:
        break;
    }
  }

  setThrottle(percent) {
    this.engine.throttle_percent = Math.max(0.0, Math.min(100.0, percent));
    const isWankel = this.activeEngineType === 'WANKEL_ROTARY';
    const isHeavy = this.activeEngineType === 'HEAVY_FUEL_CI';
    const minRpm = isWankel ? 2200 : (isHeavy ? 1400 : 1800);
    const maxRpm = isWankel ? 7500 : (isHeavy ? 4200 : 5800);
    this.engine.target_rpm = minRpm + (this.engine.throttle_percent / 100.0) * (maxRpm - minRpm);
  }

  setAffectedCylinder(cylinderId) {
    this.faults.affected_cylinder = cylinderId;
  }

  setFault(type, severity, cylinderId = 3) {
    this.faults.enabled = true;
    if (cylinderId !== undefined && cylinderId !== null) {
      this.faults.affected_cylinder = cylinderId;
    }
    const val = Math.max(0.0, Math.min(1.0, severity));

    // Normalize type string
    let key = type;
    if (!key.endsWith('_severity')) key += '_severity';

    // Map aliases
    if (key === 'high_vibration_severity' || key === 'crankcase_vibration_severity') {
      this.faults.abnormal_vibration_severity = val;
      this.faults.high_vibration_severity = val;
      this.faults.crankcase_vibration_severity = val;
    } else if (key === 'combustion_instability_severity') {
      this.faults.combustion_imbalance_severity = val;
      this.faults.combustion_instability_severity = val;
    } else if (key === 'thermal_gradient_severity') {
      this.faults.housing_overheating_severity = val;
      this.faults.thermal_gradient_severity = val;
    }

    if (key in this.faults) {
      this.faults[key] = val;
    }
  }

  clearFaults() {
    this.faults.enabled = false;
    for (const k in this.faults) {
      if (k.endsWith('_severity')) {
        this.faults[k] = 0.0;
      }
    }
  }

  // --------------------------------------------------------------------------
  // FAULT INJECTION PRESETS (8 1-CLICK BUTTONS)
  // --------------------------------------------------------------------------
  applyFaultPreset(preset) {
    this.clearFaults();
    this.faults.enabled = (preset !== 'nominal_cruise');
    const isWankel = this.activeEngineType === 'WANKEL_ROTARY';
    const isHeavy = this.activeEngineType === 'HEAVY_FUEL_CI';
    const isTurbo = this.activeEngineType === 'TURBO_INLINE_V';

    switch (preset) {
      case 'nominal_cruise':
        this.clearFaults();
        this.setMissionProfile('cruise');
        this.env.altitude_ft = 10000;
        this.env.ambient_temp_c = 25.0;
        this.setThrottle(isHeavy ? 72 : (isWankel ? 75 : (isTurbo ? 82 : 78)));
        this.analytics.diagnostic_reasoning =
          'PHYSICS CORRELATION: Continuous EKF state synchronization nominal. All thermodynamic parameters within operating baseline envelope.';
        break;

      case 'hot_high':
        this.setMissionProfile('cruise');
        this.env.altitude_ft = isTurbo ? 22000 : 16000;
        this.env.ambient_temp_c = 42.0; // Hot desert OAT
        this.setThrottle(88.0);
        this.setFault('overheating_severity', 0.55);
        if (isWankel) this.setFault('housing_overheating_severity', 0.55);
        if (isTurbo) this.setFault('intercooler_degradation_severity', 0.45);
        this.analytics.diagnostic_reasoning =
          'ENVIRONMENTAL STRESS: High-altitude high-temperature operational envelope. Reduced cooling air density and ambient heat rejection limits approaching continuous thresholds.';
        break;

      case 'cyl3_injector':
        this.faults.affected_cylinder = 3;
        if (isHeavy) {
          this.setFault('injector_degradation_severity', 0.65, 3);
          this.setFault('fuel_rail_pressure_drop_severity', 0.35);
          this.analytics.diagnostic_reasoning =
            'FUEL SYSTEM DEGRADATION: Heavy-Fuel CI injector #3 nozzle fouling. Micro-imbalance in direct rail delivery and localized combustion delay.';
        } else if (isWankel) {
          this.setFault('apex_seal_wear_severity', 0.60);
          this.setFault('port_restriction_severity', 0.40);
          this.analytics.diagnostic_reasoning =
            'ROTARY COMPRESSION LOSS: Apex seal tip wear and peripheral port restriction. Compression cross-leakage between chambers A and B.';
        } else if (isTurbo) {
          this.setFault('wastegate_fault_severity', 0.65);
          this.setFault('boost_leak_severity', 0.35);
          this.analytics.diagnostic_reasoning =
            'BOOST INDUCTION FAULT: Wastegate actuator servo float and charge air coupler leakage. MAP pressure dropping below electronic target.';
        } else {
          this.setFault('injector_degradation_severity', 0.60, 3);
          this.setFault('bank_imbalance_severity', 0.65);
          this.analytics.diagnostic_reasoning =
            'MIXTURE DISPARITY: Left-bank cylinder #3 injector restriction. Fuel trim offset causing 21°C CHT divergence against right bank.';
        }
        break;

      case 'oil_loss':
        this.setFault('low_oil_pressure_severity', 0.78);
        this.analytics.diagnostic_reasoning =
          'LUBRICATION WARNING: Main gallery scavenge pump pressure loss. Critical risk of journal bearing boundary friction and thermal galling.';
        break;

      case 'misfire':
        if (isHeavy) {
          this.setFault('combustion_imbalance_severity', 0.70);
          this.analytics.diagnostic_reasoning =
            'COMBUSTION IRREGULARITY: Compression ignition delay and cylinder peak pressure oscillation (diesel knock).';
        } else if (isWankel) {
          this.setFault('combustion_instability_severity', 0.65);
          this.setFault('apex_seal_wear_severity', 0.45);
          this.analytics.diagnostic_reasoning =
            'ROTARY COMBUSTION INSTABILITY: Dual-plug ignition quench and cyclic flame propagation scatter in expansion chamber.';
        } else {
          this.setFault('misfire_severity', 0.75, 3);
          this.setFault('abnormal_vibration_severity', 0.40);
          this.analytics.diagnostic_reasoning =
            'IGNITION MISFIRE: Intermittent spark breakdown detected on cylinder 3. Unburned fuel hydrocarbons elevate exhaust manifold EGT.';
        }
        break;

      case 'vibration_spike':
        this.setFault('abnormal_vibration_severity', 0.85);
        this.analytics.diagnostic_reasoning =
          'STRUCTURAL DYNAMICS ALERT: Harmonic vibration exceedance (>1.25 g RMS). Propeller reduction balance shift or crankshaft torsional damper fatigue.';
        break;

      case 'sensor_drift':
        this.setFault('sensor_drift_severity', 0.75);
        this.analytics.diagnostic_reasoning =
          'SENSOR / ECU INCONSISTENCY (PURPLE): Dual-channel FADEC thermocouple calibration divergence vs EKF thermodynamic twin model.';
        break;

      case 'alternator_loss':
        this.setFault('alternator_loss_severity', 0.80);
        this.analytics.diagnostic_reasoning =
          'AVIONICS POWER WARNING: Main 28V engine-driven alternator excitation failure. FADEC and twin drawing reserve capacity from emergency lithium bus.';
        break;

      default:
        console.warn('Unknown fault preset:', preset);
        break;
    }

    this.notify(this.getTelemetryPacket());
  }

  // --------------------------------------------------------------------------
  // ONE-CLICK DEMO SCENARIOS
  // --------------------------------------------------------------------------
  loadDemoScenario(scenarioId) {
    switch (scenarioId) {
      case 'heavy_fuel_endurance':
        this.switchEngineArchitecture('HEAVY_FUEL_CI');
        this.setMissionProfile('loiter');
        this.env.altitude_ft = 10000;
        this.env.ambient_temp_c = 36.0;
        this.setThrottle(72.0);
        this.setFault('injector_degradation_severity', 0.65, 3);
        this.setFault('fuel_rail_pressure_drop_severity', 0.40);
        this.analytics.diagnostic_reasoning =
          'PHYSICS CORRELATION: Heavy-Fuel CI common rail pressure drop (-160 bar). High-pressure injector #3 nozzle degradation detected. Micro-imbalance in diesel compression ignition.';
        break;

      case 'boxer_imbalance':
        this.switchEngineArchitecture('BOXER');
        this.setMissionProfile('cruise');
        this.env.altitude_ft = 12000;
        this.env.ambient_temp_c = 34.0;
        this.setThrottle(82.0);
        this.setFault('bank_imbalance_severity', 0.85);
        this.setFault('overheating_severity', 0.65, 3);
        this.setFault('injector_degradation_severity', 0.50, 3);
        this.analytics.diagnostic_reasoning =
          'PHYSICS CORRELATION: Horizontally Opposed left/right cylinder bank thermal imbalance (22.5°C split). Cylinder 3 CHT exceedance (128.5°C) caused by mixture lean trim.';
        break;

      case 'wankel_seal_wear':
        this.switchEngineArchitecture('WANKEL_ROTARY');
        this.setMissionProfile('loiter');
        this.env.altitude_ft = 8000;
        this.env.ambient_temp_c = 38.0;
        this.setThrottle(85.0);
        this.setFault('apex_seal_wear_severity', 0.60);
        this.setFault('housing_overheating_severity', 0.55);
        this.analytics.diagnostic_reasoning =
          'PHYSICS CORRELATION: Wankel apex seal wear index exceedance (52% seal integrity). Hot-arc combustion sector housing temperature 142.5°C with compression leakage across flanks.';
        break;

      case 'turbo_altitude_climb':
        this.switchEngineArchitecture('TURBO_INLINE_V');
        this.setMissionProfile('climb');
        this.env.altitude_ft = 25000; // FL250 High Altitude!
        this.env.ambient_temp_c = -22.0;
        this.setThrottle(95.0);
        this.setFault('wastegate_fault_severity', 0.65);
        this.setFault('turbo_overspeed_severity', 0.45);
        this.analytics.diagnostic_reasoning =
          'PHYSICS CORRELATION: FL250 High-Altitude Ceiling: Turbocharger impeller spooling at 112% speed. Electronic wastegate servo response lag; turbine inlet EGT 875°C approaching thermal limit.';
        break;

      default:
        console.warn('Unknown demo scenario:', scenarioId);
        break;
    }

    this.start();
    this.notify(this.getTelemetryPacket());
  }

  tick() {
    if (this.status !== 'RUNNING') return;

    const dt = 0.1 * this.speedMultiplier;
    this.simTimeSeconds += dt;

    // Smooth RPM slew
    const rpmSlewRate = 1200.0 * dt;
    const rpmErr = this.engine.target_rpm - this.engine.rpm;
    if (Math.abs(rpmErr) < rpmSlewRate) {
      this.engine.rpm = this.engine.target_rpm;
    } else {
      this.engine.rpm += Math.sign(rpmErr) * rpmSlewRate;
    }

    const throttleRatio = this.engine.throttle_percent / 100.0;
    const alerts = [];

    // Dispatch physics update by architecture
    if (this.activeEngineType === 'HEAVY_FUEL_CI') {
      this.tickHeavyFuel(throttleRatio, alerts);
    } else if (this.activeEngineType === 'WANKEL_ROTARY') {
      this.tickWankel(throttleRatio, alerts);
    } else if (this.activeEngineType === 'TURBO_INLINE_V') {
      this.tickTurbo(throttleRatio, alerts);
    } else {
      this.tickBoxer(throttleRatio, alerts);
    }

    this.alerts = alerts;

    // Record History for chart
    const timeLabel = this.formatSimTime(this.simTimeSeconds);
    this.history.timestamps.push(timeLabel);
    this.history.rpm.push(this.engine.rpm);
    this.history.primary_temp.push(this.engine.cht_c || this.engine.rotor_housing_temp_c || 108);
    this.history.egt.push(this.engine.egt_c);
    this.history.vibration.push(this.engine.vibration_rms_g);
    this.history.oil_press.push(this.engine.oil_pressure_bar);

    if (this.history.timestamps.length > this.history.maxPoints) {
      this.history.timestamps.shift();
      this.history.rpm.shift();
      this.history.primary_temp.shift();
      this.history.egt.shift();
      this.history.vibration.shift();
      this.history.oil_press.shift();
    }

    this.notify(this.getTelemetryPacket());
  }

  tickHeavyFuel(throttleRatio, alerts) {
    const altFt = this.env.altitude_ft;
    const oatC = this.env.ambient_temp_c;
    const oatDelta = (oatC - 25.0) * 0.4; // ambient temperature bias

    let railP = 1450.0 - 50.0 * (1.0 - throttleRatio);
    let qual = 96.0;
    let cht = 104.0 + 16.0 * throttleRatio + oatDelta;
    let egt = 640.0 + 75.0 * throttleRatio + oatDelta * 0.5;
    let vib = 0.52 + 0.12 * throttleRatio;
    let fuelFlow = 14.0 + 16.0 * Math.pow(throttleRatio, 1.2);
    let oilP = 4.6 - 0.2 * (altFt / 25000.0);
    let oilT = 94.0 + 12.0 * throttleRatio + oatDelta * 0.7;
    let battV = 28.2;

    if (this.faults.enabled) {
      if (this.faults.fuel_rail_pressure_drop_severity > 0) {
        const drop = this.faults.fuel_rail_pressure_drop_severity * 320.0;
        railP -= drop;
        qual -= this.faults.fuel_rail_pressure_drop_severity * 24.0;
        alerts.push({
          level: 'WARNING',
          message: `Heavy-Fuel Rail Pressure Drop (${railP.toFixed(0)} bar). Direct injection supply regulator float.`
        });
      }
      if (this.faults.injector_degradation_severity > 0) {
        qual -= this.faults.injector_degradation_severity * 20.0;
        vib += this.faults.injector_degradation_severity * 0.38;
        egt += this.faults.injector_degradation_severity * 35.0;
        alerts.push({
          level: 'CAUTION',
          message: `Common-rail injector #${this.faults.affected_cylinder} nozzle deposit fouling. Asymmetric spray duration.`
        });
      }
      if (this.faults.combustion_imbalance_severity > 0) {
        vib += this.faults.combustion_imbalance_severity * 0.52;
        qual -= this.faults.combustion_imbalance_severity * 18.0;
        alerts.push({
          level: 'WARNING',
          message: `Diesel Compression Ignition Knock / Peak Pressure Wave Imbalance.`
        });
      }
      if (this.faults.low_oil_pressure_severity > 0) {
        oilP = Math.max(1.4, 4.6 - this.faults.low_oil_pressure_severity * 3.0);
        oilT += this.faults.low_oil_pressure_severity * 16.0;
        alerts.push({ level: 'CRITICAL', message: `Low Lubrication Sump Pressure (${oilP.toFixed(1)} bar). Heavy-duty bearing wear risk.` });
      }
      if (this.faults.overheating_severity > 0) {
        cht += this.faults.overheating_severity * 26.0;
        oilT += this.faults.overheating_severity * 14.0;
        alerts.push({ level: 'CRITICAL', message: `Cooling Jacket Thermal Overload (Mean CHT: ${cht.toFixed(1)}°C).` });
      }
      if (this.faults.abnormal_vibration_severity > 0) {
        vib += this.faults.abnormal_vibration_severity * 0.85;
        alerts.push({ level: 'WARNING', message: `Structural Crankcase Vibration Anomaly (${vib.toFixed(2)} g RMS).` });
      }
      if (this.faults.sensor_drift_severity > 0) {
        alerts.push({ level: 'SENSOR', message: `[PURPLE] Rail Pressure Transducer Calibration Divergence (+${(this.faults.sensor_drift_severity * 140).toFixed(0)} bar). Discrepancy with twin model.` });
      }
      if (this.faults.alternator_loss_severity > 0) {
        battV = Math.max(22.8, 28.2 - this.faults.alternator_loss_severity * 4.6);
        alerts.push({ level: 'WARNING', message: `28V Heavy-Duty Alternator Excitation Drop (${battV.toFixed(1)} V).` });
      }
    }

    this.engine.fuel_rail_press_bar = +Math.max(800, railP).toFixed(0);
    this.engine.combustion_quality_pct = +Math.max(40, qual).toFixed(1);
    this.engine.cht_c = +cht.toFixed(1);
    this.engine.egt_c = +egt.toFixed(1);
    this.engine.vibration_rms_g = +vib.toFixed(2);
    this.engine.fuel_flow_lph = +fuelFlow.toFixed(1);
    this.engine.oil_pressure_bar = +oilP.toFixed(2);
    this.engine.oil_temp_c = +oilT.toFixed(1);
    this.engine.battery_voltage_v = +battV.toFixed(1);

    // Update 4 cylinders
    const affCyl = this.faults.affected_cylinder || 3;
    this.cylinders = [1, 2, 3, 4].map(id => {
      const isTarget = (id === affCyl || affCyl === 'all');
      const injFlt = (this.faults.enabled && isTarget) ? this.faults.injector_degradation_severity : 0;
      const cylCht = +(cht + (injFlt ? 8.0 : (id % 2 === 1 ? -1.5 : 1.5))).toFixed(1);
      const cylEgt = +(egt + (injFlt ? 32.0 : (id % 2 === 1 ? -8.0 : 8.0))).toFixed(0);
      const health = Math.round(Math.max(30, 94 - injFlt * 40 - (this.faults.combustion_imbalance_severity * 20)));
      return { id, name: `Cyl ${id}`, cht_c: cylCht, egt_c: cylEgt, health, fault: injFlt > 0 ? 'INJ_DEGRADED' : null };
    });

    const healthLoss = (100 - qual) * 1.1 + (railP < 1300 ? 15 : 0) + (oilP < 2.8 ? 20 : 0) + (cht > 125 ? 15 : 0);
    this.analytics.overall_health_score = Math.round(Math.max(25, 94.0 - healthLoss));
    this.analytics.estimated_rul_hours = +(Math.max(15, 245.0 - healthLoss * 2.2)).toFixed(1);
    this.analytics.anomaly_score = +(healthLoss / 100.0).toFixed(2);
  }

  tickWankel(throttleRatio, alerts) {
    const altFt = this.env.altitude_ft;
    const oatC = this.env.ambient_temp_c;
    const oatDelta = (oatC - 25.0) * 0.45;
    const ambientPressureHpa = Math.max(350, 1013.25 * Math.pow(1 - 6.875e-6 * altFt, 5.2559));

    let housingT = 108.0 + 20.0 * throttleRatio + oatDelta;
    let sealH = 95.0;
    let stress = 24.0 + 12.0 * throttleRatio + oatDelta * 0.6;
    let egt = 780.0 + 95.0 * throttleRatio + oatDelta * 0.5;
    let vib = 0.16 + 0.05 * throttleRatio; // naturally ultra low rotary vibration!
    let fuelFlow = 28.0 + 24.0 * Math.pow(throttleRatio, 1.3);
    let intakeP = Math.round(ambientPressureHpa * (0.85 + 0.15 * throttleRatio));
    let oilP = 4.8 - 0.2 * (altFt / 25000.0);
    let battV = 28.0;

    if (this.faults.enabled) {
      if (this.faults.apex_seal_wear_severity > 0) {
        const sev = this.faults.apex_seal_wear_severity;
        sealH -= sev * 50.0;
        stress += sev * 38.0;
        housingT += sev * 22.0;
        vib += sev * 0.18;
        fuelFlow += sev * 4.5;
        alerts.push({
          level: 'WARNING',
          message: `Wankel Apex Seal Degradation (${sealH.toFixed(0)}% seal integrity). Compression cross-leakage across rotor tips.`
        });
      }
      if (this.faults.housing_overheating_severity > 0) {
        const ovh = this.faults.housing_overheating_severity;
        housingT += ovh * 28.0;
        stress += ovh * 32.0;
        alerts.push({
          level: 'CRITICAL',
          message: `Rotor Housing Hot-Arc Thermal Gradient Exceedance (${housingT.toFixed(1)}°C). Epitrochoid deformation risk.`
        });
      }
      if (this.faults.port_restriction_severity > 0) {
        const pr = this.faults.port_restriction_severity;
        intakeP -= pr * 120.0;
        egt += pr * 45.0;
        alerts.push({
          level: 'CAUTION',
          message: `Peripheral Intake/Exhaust Port Restriction. Volumetric charge reduction.`
        });
      }
      if (this.faults.combustion_imbalance_severity > 0) {
        const ci = this.faults.combustion_imbalance_severity;
        vib += ci * 0.22;
        stress += ci * 18.0;
        alerts.push({
          level: 'WARNING',
          message: `Combustion Chamber Flame Front Instability. Dual-plug ignition quench.`
        });
      }
      if (this.faults.low_oil_pressure_severity > 0) {
        oilP = Math.max(1.6, 4.8 - this.faults.low_oil_pressure_severity * 2.8);
        alerts.push({ level: 'CRITICAL', message: `Eccentric Shaft & Metering Oil Pressure Drop (${oilP.toFixed(1)} bar).` });
      }
      if (this.faults.abnormal_vibration_severity > 0) {
        vib += this.faults.abnormal_vibration_severity * 0.45;
        alerts.push({ level: 'WARNING', message: `Rotor Dynamic Imbalance / Eccentric Bearing Chatter (${vib.toFixed(2)} g RMS).` });
      }
      if (this.faults.sensor_drift_severity > 0) {
        alerts.push({ level: 'SENSOR', message: `[PURPLE] Rotor Housing Pyrometer Calibration Drift (+${(this.faults.sensor_drift_severity * 22).toFixed(1)}°C). Discrepancy with twin model.` });
      }
      if (this.faults.alternator_loss_severity > 0) {
        battV = Math.max(22.5, 28.0 - this.faults.alternator_loss_severity * 4.8);
        alerts.push({ level: 'WARNING', message: `Alternator Output Drop (${battV.toFixed(1)} V). Drawing emergency lithium reserve.` });
      }
    }

    this.engine.rotor_housing_temp_c = +housingT.toFixed(1);
    this.engine.seal_health_pct = +Math.max(25, sealH).toFixed(1);
    this.engine.thermal_stress_pct = +Math.min(100, stress).toFixed(1);
    this.engine.egt_c = +egt.toFixed(1);
    this.engine.vibration_rms_g = +vib.toFixed(2);
    this.engine.fuel_flow_lph = +fuelFlow.toFixed(1);
    this.engine.intake_pressure_hpa = +Math.max(400, intakeP).toFixed(0);
    this.engine.oil_pressure_bar = +oilP.toFixed(2);
    this.engine.battery_voltage_v = +battV.toFixed(1);

    // Update 3 moving chambers
    const tempA = 65.0 + 12.0 * throttleRatio + oatDelta * 0.4;
    const tempB = housingT;
    const tempC = 105.0 + 18.0 * throttleRatio + oatDelta * 0.5;
    const sealWearA = Math.round(5 + this.faults.apex_seal_wear_severity * 25);
    const sealWearB = Math.round(8 + this.faults.apex_seal_wear_severity * 55);
    const sealWearC = Math.round(6 + this.faults.apex_seal_wear_severity * 30);

    this.chambers = [
      { id: 'A', name: 'Chamber A [Intake/Comp]', temp_c: +tempA.toFixed(1), status: 'NOMINAL', seal_wear: sealWearA },
      { id: 'B', name: 'Chamber B [Combustion/Exp]', temp_c: +tempB.toFixed(1), status: tempB > 132 ? 'CRITICAL' : (tempB > 122 ? 'WARNING' : 'NOMINAL'), seal_wear: sealWearB },
      { id: 'C', name: 'Chamber C [Exhaust Sector]', temp_c: +tempC.toFixed(1), status: 'NOMINAL', seal_wear: sealWearC }
    ];

    const healthLoss = (100 - sealH) * 1.1 + (housingT > 130 ? 18 : 0) + (oilP < 3.0 ? 15 : 0);
    this.analytics.overall_health_score = Math.round(Math.max(20, 93.0 - healthLoss));
    this.analytics.estimated_rul_hours = +(Math.max(10, 180.0 - healthLoss * 1.9)).toFixed(1);
    this.analytics.anomaly_score = +(healthLoss / 100.0).toFixed(2);
  }

  tickTurbo(throttleRatio, alerts) {
    const altFt = this.env.altitude_ft;
    const oatC = this.env.ambient_temp_c;
    const oatDelta = (oatC - 25.0) * 0.45;
    // Turbo boost demand compensates for altitude
    const boostDemand = 0.5 + 0.5 * throttleRatio + (altFt / 25000.0) * 0.45;
    let boost = Math.min(1.45, boostDemand);
    let map = 1000.0 + boost * 600.0;
    let turboSpeed = 50.0 + 40.0 * throttleRatio + (altFt / 25000.0) * 24.0;
    let iat = 30.0 + 18.0 * boost + oatDelta * 0.8;
    let icEff = 88.0;
    let cht = 104.0 + 18.0 * throttleRatio + oatDelta * 0.6;
    let egt = 750.0 + 85.0 * throttleRatio + oatDelta * 0.5;
    let vib = 0.42 + 0.12 * throttleRatio;
    let fuelFlow = 32.0 + 20.0 * Math.pow(throttleRatio, 1.25);
    let oilP = 4.4 - 0.2 * (altFt / 25000.0);
    let oilT = 98.0 + 14.0 * throttleRatio + oatDelta * 0.7;
    let battV = 28.0;

    if (this.faults.enabled) {
      if (this.faults.wastegate_fault_severity > 0) {
        boost -= this.faults.wastegate_fault_severity * 0.48;
        map -= this.faults.wastegate_fault_severity * 320.0;
        egt += this.faults.wastegate_fault_severity * 65.0;
        alerts.push({ level: 'WARNING', message: `Electronic Wastegate Actuator Sticking (-${(this.faults.wastegate_fault_severity * 0.48).toFixed(2)} bar boost). Turbine inlet EGT rising.` });
      }
      if (this.faults.boost_leak_severity > 0) {
        boost -= this.faults.boost_leak_severity * 0.58;
        map -= this.faults.boost_leak_severity * 390.0;
        turboSpeed += this.faults.boost_leak_severity * 26.0; // overspins trying to maintain MAP target
        alerts.push({ level: 'WARNING', message: `Charge Air Boost Leak detected across intercooler silicon couplers.` });
      }
      if (this.faults.turbo_overspeed_severity > 0) {
        turboSpeed += this.faults.turbo_overspeed_severity * 30.0;
        alerts.push({ level: 'CRITICAL', message: `Turbocharger Impeller Over-Speed (${turboSpeed.toFixed(0)}% rated RPM limit).` });
      }
      if (this.faults.intercooler_degradation_severity > 0) {
        iat += this.faults.intercooler_degradation_severity * 30.0;
        icEff = Math.max(45, 88.0 - this.faults.intercooler_degradation_severity * 36.0);
        cht += this.faults.intercooler_degradation_severity * 10.0;
        alerts.push({ level: 'CAUTION', message: `Intercooler Heat Rejection Loss (Eff: ${icEff.toFixed(0)}%, IAT: ${iat.toFixed(1)}°C).` });
      }
      if (this.faults.low_oil_pressure_severity > 0) {
        oilP = Math.max(1.5, 4.4 - this.faults.low_oil_pressure_severity * 2.8);
        alerts.push({ level: 'CRITICAL', message: `Turbocharger Journal Bearing Oil Feed Low (${oilP.toFixed(1)} bar). Coking risk.` });
      }
      if (this.faults.overheating_severity > 0) {
        cht += this.faults.overheating_severity * 24.0;
        oilT += this.faults.overheating_severity * 15.0;
        alerts.push({ level: 'CRITICAL', message: `Inline/V Thermal Overheating (CHT: ${cht.toFixed(1)}°C).` });
      }
      if (this.faults.abnormal_vibration_severity > 0) {
        vib += this.faults.abnormal_vibration_severity * 0.85;
        alerts.push({ level: 'WARNING', message: `Turbo Shaft Rotor Dynamic Vibration Anomaly (${vib.toFixed(2)} g RMS).` });
      }
      if (this.faults.sensor_drift_severity > 0) {
        alerts.push({ level: 'SENSOR', message: `[PURPLE] Manifold Absolute Pressure (MAP) Sensor Drift (+${(this.faults.sensor_drift_severity * 180).toFixed(0)} hPa). Inconsistent with twin.` });
      }
      if (this.faults.alternator_loss_severity > 0) {
        battV = Math.max(22.6, 28.0 - this.faults.alternator_loss_severity * 4.6);
        alerts.push({ level: 'WARNING', message: `Alternator Output Drop (${battV.toFixed(1)} V).` });
      }
    }

    this.engine.boost_pressure_bar = +Math.max(0.0, boost).toFixed(2);
    this.engine.manifold_pressure_hpa = +Math.max(500, map).toFixed(0);
    this.engine.turbo_speed_pct = +turboSpeed.toFixed(0);
    this.engine.iat_c = +iat.toFixed(1);
    this.engine.intercooler_eff_pct = +icEff.toFixed(0);
    this.engine.cht_c = +cht.toFixed(1);
    this.engine.egt_c = +egt.toFixed(1);
    this.engine.vibration_rms_g = +vib.toFixed(2);
    this.engine.fuel_flow_lph = +fuelFlow.toFixed(1);
    this.engine.oil_pressure_bar = +oilP.toFixed(2);
    this.engine.oil_temp_c = +oilT.toFixed(1);
    this.engine.battery_voltage_v = +battV.toFixed(1);

    // Update 4 cylinders
    this.cylinders = [1, 2, 3, 4].map(id => {
      const cylCht = +(cht + (id % 2 === 1 ? -1.0 : 1.0)).toFixed(1);
      const cylEgt = +(egt + (id % 2 === 1 ? -6.0 : 6.0)).toFixed(0);
      const health = Math.round(Math.max(30, 90 - (turboSpeed > 105 ? 15 : 0) - (cht > 125 ? 18 : 0)));
      return { id, name: `Cyl ${id}`, cht_c: cylCht, egt_c: cylEgt, health, fault: null };
    });

    const healthLoss = (turboSpeed > 105 ? 16 : 0) + (icEff < 70 ? 12 : 0) + (map < 1150 ? 12 : 0) + (oilP < 2.5 ? 20 : 0) + (cht > 125 ? 15 : 0);
    this.analytics.overall_health_score = Math.round(Math.max(25, 90.0 - healthLoss));
    this.analytics.estimated_rul_hours = +(Math.max(15, 192.0 - healthLoss * 1.9)).toFixed(1);
    this.analytics.anomaly_score = +(healthLoss / 100.0).toFixed(2);
  }

  tickBoxer(throttleRatio, alerts) {
    const altFt = this.env.altitude_ft;
    const oatC = this.env.ambient_temp_c;
    const oatDelta = (oatC - 25.0) * 0.45;

    let chtL = 100.0 + 16.0 * throttleRatio + oatDelta;
    let chtR = 101.0 + 16.0 * throttleRatio + oatDelta;
    let egt = 750.0 + 65.0 * throttleRatio + oatDelta * 0.5;
    let vib = 0.38 + 0.12 * throttleRatio;
    let fuelFlow = 22.0 + 22.0 * Math.pow(throttleRatio, 1.2);
    let oilP = 4.1 - 0.2 * (altFt / 25000.0);
    let oilT = 96.0 + 12.0 * throttleRatio + oatDelta * 0.7;
    let battV = 27.8;

    if (this.faults.enabled) {
      if (this.faults.bank_imbalance_severity > 0) {
        const split = this.faults.bank_imbalance_severity * 24.0;
        chtL += split;
        chtR -= split * 0.2;
        alerts.push({ level: 'WARNING', message: `Boxer Cylinder Bank Thermal Imbalance (${(chtL - chtR).toFixed(1)}°C split). Cowling cooling duct asymmetry.` });
      }
      if (this.faults.overheating_severity > 0) {
        const ovh = this.faults.overheating_severity * 24.0;
        chtL += ovh;
        chtR += ovh * 0.8;
        oilT += ovh * 0.4;
        alerts.push({ level: 'CRITICAL', message: `Cylinder Head Overheating (Peak CHT: ${Math.max(chtL, chtR).toFixed(1)}°C). Baffle airflow starvation.` });
      }
      if (this.faults.injector_degradation_severity > 0) {
        chtL += this.faults.injector_degradation_severity * 14.0;
        egt += this.faults.injector_degradation_severity * 45.0;
        vib += this.faults.injector_degradation_severity * 0.18;
        alerts.push({ level: 'CAUTION', message: `Cylinder #${this.faults.affected_cylinder} Injector Restriction. Lean mixture deviation.` });
      }
      if (this.faults.misfire_severity > 0) {
        vib += this.faults.misfire_severity * 0.48;
        egt += this.faults.misfire_severity * 50.0;
        alerts.push({ level: 'WARNING', message: `Combustion Misfire detected on cylinder #${this.faults.affected_cylinder}. Spark plug fouling.` });
      }
      if (this.faults.low_oil_pressure_severity > 0) {
        oilP = Math.max(1.5, 4.1 - this.faults.low_oil_pressure_severity * 2.6);
        oilT += this.faults.low_oil_pressure_severity * 16.0;
        alerts.push({ level: 'CRITICAL', message: `Low Lubrication Oil Pressure (${oilP.toFixed(2)} bar). Relief valve float.` });
      }
      if (this.faults.abnormal_vibration_severity > 0) {
        vib += this.faults.abnormal_vibration_severity * 0.92;
        alerts.push({ level: 'WARNING', message: `Crankcase Vibration Anomaly (${vib.toFixed(2)} g RMS). Prop reduction dynamic harmonic shift.` });
      }
      if (this.faults.sensor_drift_severity > 0) {
        alerts.push({ level: 'SENSOR', message: `[PURPLE] CHT Thermocouple Sensor Drift (+${(this.faults.sensor_drift_severity * 19.5).toFixed(1)}°C calibration offset). Discrepancy with twin model.` });
      }
      if (this.faults.alternator_loss_severity > 0) {
        battV = Math.max(22.4, 27.8 - this.faults.alternator_loss_severity * 4.6);
        alerts.push({ level: 'WARNING', message: `Alternator Output Drop (${battV.toFixed(1)} V). Drawing emergency lithium reserve.` });
      }
    }

    this.engine.cht_left_bank_c = +chtL.toFixed(1);
    this.engine.cht_right_bank_c = +chtR.toFixed(1);
    this.engine.bank_imbalance_c = +Math.abs(chtL - chtR).toFixed(1);
    this.engine.cht_c = +Math.max(chtL, chtR).toFixed(1);
    this.engine.egt_c = +egt.toFixed(1);
    this.engine.vibration_rms_g = +vib.toFixed(2);
    this.engine.fuel_flow_lph = +fuelFlow.toFixed(1);
    this.engine.oil_pressure_bar = +oilP.toFixed(2);
    this.engine.oil_temp_c = +oilT.toFixed(1);
    this.engine.battery_voltage_v = +battV.toFixed(1);

    // Update 4 cylinders
    const affCyl = this.faults.affected_cylinder || 3;
    const isMisfire = this.faults.enabled && this.faults.misfire_severity > 0;
    const isInj = this.faults.enabled && this.faults.injector_degradation_severity > 0;
    const isOvh = this.faults.enabled && this.faults.overheating_severity > 0;

    this.cylinders = [
      { id: 1, bank: 'LEFT',  name: 'Cyl 1 [L]', cht_c: +chtL.toFixed(1), egt_c: +(egt - 10).toFixed(0), health: Math.round(Math.max(40, 92 - (this.faults.bank_imbalance_severity * 15))), fault: null, spark_ok: true },
      { id: 2, bank: 'RIGHT', name: 'Cyl 2 [R]', cht_c: +chtR.toFixed(1), egt_c: +egt.toFixed(0), health: 89, fault: null, spark_ok: true },
      { id: 3, bank: 'LEFT',  name: 'Cyl 3 [L]', cht_c: +(chtL + (isOvh ? 8.0 : 0) + (isInj && (affCyl === 3 || affCyl === 'all') ? 12.0 : 0)).toFixed(1), egt_c: +(egt + (isInj && (affCyl === 3 || affCyl === 'all') ? 35 : 0)).toFixed(0), health: Math.round(Math.max(25, 91 - (isInj && affCyl === 3 ? 35 : 0) - (isMisfire && affCyl === 3 ? 40 : 0) - (isOvh ? 25 : 0))), fault: (isMisfire && (affCyl === 3 || affCyl === 'all')) ? 'MISFIRE' : ((isInj && (affCyl === 3 || affCyl === 'all')) ? 'INJ_LEAN' : null), spark_ok: !(isMisfire && (affCyl === 3 || affCyl === 'all')) },
      { id: 4, bank: 'RIGHT', name: 'Cyl 4 [R]', cht_c: +chtR.toFixed(1), egt_c: +(egt - 5).toFixed(0), health: 90, fault: null, spark_ok: true }
    ];

    const healthLoss = this.engine.bank_imbalance_c * 1.5 + (this.engine.cht_c > 125 ? 18 : 0) + (oilP < 2.5 ? 20 : 0) + (vib > 0.9 ? 15 : 0);
    this.analytics.overall_health_score = Math.round(Math.max(25, 91.0 - healthLoss));
    this.analytics.estimated_rul_hours = +(Math.max(15, 198.5 - healthLoss * 1.9)).toFixed(1);
    this.analytics.anomaly_score = +(healthLoss / 100.0).toFixed(2);
  }

  formatSimTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getTelemetryPacket() {
    return {
      source: this.source,
      simulation_id: this.simulationId,
      engine_type: this.activeEngineType,
      timestamp: new Date().toISOString(),
      simulation_time_seconds: +this.simTimeSeconds.toFixed(1),
      mission_phase: this.missionPhase,
      status: this.status,
      speed_multiplier: this.speedMultiplier,
      engine: { ...this.engine },
      cylinders: this.cylinders ? this.cylinders.map(c => ({ ...c })) : [],
      chambers: this.chambers ? this.chambers.map(c => ({ ...c })) : [],
      analytics: { ...this.analytics },
      alerts: [...this.alerts],
      faults: { ...this.faults },
    };
  }
}

// Global export
window.Engine3DSimulator = Engine3DSimulator;
