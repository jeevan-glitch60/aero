/**
 * Comprehensive Failure Mode & Health Advisory Templates
 * Rotax 915/916 iS Class Engine Digital Twin (MALE UAV Defense GCS)
 *
 * Provides situation-specific decision support templates across 13 conditions.
 * NOTE: Decision support only. Does not command vehicle actuators or flight surfaces.
 */

export const ADVISORY_TEMPLATES = {
  normal: {
    id: 'normal-nominal',
    type: 'normal',
    title: 'All Engine Subsystems Nominal',
    baseSeverity: 'NORMAL',
    basePriority: 10,
    confidence: 98,
    missionImpact: 'NOMINAL',
    status: 'Operational Baseline Confirmed',
    explanation:
      'All monitored combustion, thermal, hydraulic, and electrical metrics match calibrated physics-twin expectations. Cylinder head temperature variance across cylinders is under 2.5°C and lubrication film thickness remains optimal.',
    monitorNow: [
      'Standard periodic cross-checks of CHT and oil pressure.',
      'Routine fuel flow burn against flight plan waypoint estimates.',
      'Propeller rotational harmonic stability during level cruise.',
    ],
    decisionOptions: [
      'Continue normally',
      'Continue with enhanced monitoring',
      'Schedule routine turnaround inspection',
    ],
    maintenancePriority: 'Monitor only',
    maintenanceActions: [
      'Perform standard turnaround walkaround and pre-flight inspection.',
      'Log engine operating hours and cyclic thermal counts.',
      'Maintain scheduled 50-hour routine maintenance interval.',
    ],
    evidence: [
      { label: 'EKF State Residual Norm', value: '< 0.75σ (Normal)', state: 'nominal' },
      { label: 'Cylinder Head Temp Spread', value: '±1.9°C (Tight)', state: 'nominal' },
      { label: 'Oil Pressure Stability', value: '±0.04 bar variance', state: 'nominal' },
      { label: 'Crankcase RMS Vibration', value: '1.18g (< 2.0g alert limit)', state: 'nominal' },
    ],
    modelContribution: { physics: 50, anomaly: 30, trend: 20 },
    missionRecommendation: 'Continue mission normally under approved standard flight profile.',
    correlatedSignals: ['RPM', 'CHT', 'EGT', 'Oil Pressure'],
  },

  overheating_risk: {
    id: 'overheating-trend',
    type: 'overheating_risk',
    title: 'Overheating Trend / Thermal Envelope Risk',
    baseSeverity: 'WARNING',
    basePriority: 78,
    confidence: 84,
    missionImpact: 'MODERATE',
    status: 'Active and increasing',
    explanation:
      'Cylinder-head and exhaust-gas temperatures are rising faster than expected for the present RPM, fuel flow, altitude, and mission phase. The pattern indicates increasing thermal stress rather than a short normal throttle transient.',
    monitorNow: [
      'CHT rise rate — alert if above configured sustained 1.5°C/min limit.',
      'EGT deviation against expected engine-map baseline band.',
      'Oil temperature and oil pressure correlation (viscosity thinning risk).',
      'Vibration change during throttle transitions.',
    ],
    decisionOptions: [
      'Continue with enhanced monitoring',
      'Request propulsion engineer review',
      'Begin return-to-base assessment',
      'Escalate according to approved SOP',
    ],
    maintenancePriority: 'Inspect before next mission',
    maintenanceActions: [
      'Inspect cooling airflow path, radiator intake duct, and cylinder baffles for obstruction.',
      'Verify mixture/injection operation and fuel-flow consistency.',
      'Inspect oil level, liquid coolant expansion tank, and thermal relief valves.',
      'Review high-rate trend history and thermal cycle accumulator logs.',
    ],
    evidence: [
      { label: 'CHT rise over 60 sec', value: '+7.8°C', state: 'warning' },
      { label: 'EGT rise over 60 sec', value: '+14.2°C', state: 'warning' },
      { label: 'Thermal circuit model residual', value: '+16.0%', state: 'warning' },
      { label: 'Current load stability', value: 'RPM ±1.4%', state: 'nominal' },
      { label: 'Persistence', value: '58 sec', state: 'warning' },
    ],
    modelContribution: { physics: 45, anomaly: 35, trend: 20 },
    missionRecommendation:
      'Continue with enhanced monitoring; begin return-to-base assessment if thermal limits exceed 125°C according to approved SOP.',
    correlatedSignals: ['CHT', 'EGT', 'Coolant Temp'],
  },

  low_oil_pressure: {
    id: 'oil-press-loss',
    type: 'low_oil_pressure',
    title: 'Low Oil Pressure / Lubrication Starvation',
    baseSeverity: 'CRITICAL',
    basePriority: 96,
    confidence: 94,
    missionImpact: 'CRITICAL',
    status: 'Immediate action required',
    explanation:
      'Engine oil pressure has dropped below nominal operating envelope despite normal RPM, indicating possible pump cavitation, oil thinning, or oil circuit leakage. High risk of hydrodynamic journal bearing breakdown.',
    monitorNow: [
      'Oil pressure slope and minimum floor (< 2.0 bar alarm).',
      'Oil temperature rapid escalation (bearing friction indicator).',
      'Crankcase 1X/2X mechanical vibration harmonics for metal-to-metal distress.',
      'Engine RPM stability under minimum loiter power.',
    ],
    decisionOptions: [
      'Request immediate propulsion engineer review',
      'Begin return-to-base assessment',
      'Escalate according to approved SOP',
    ],
    maintenancePriority: 'Ground aircraft pending inspection',
    maintenanceActions: [
      'Ground aircraft pending immediate inspection of oil pump and pressure relief valve.',
      'Perform oil filter cut-open inspection and spectrographic oil analysis (SOAP) for metallic wear.',
      'Inspect entire oil circuit plumbing, scavenge lines, and cooler fittings for leaks.',
      'Inspect magnetic drain plug for ferrous particles.',
    ],
    evidence: [
      { label: 'Measured Oil Pressure', value: '1.92 bar (Low, Limit 2.0 bar)', state: 'critical' },
      { label: 'Oil Pressure Gradient', value: '-0.18 bar/min', state: 'critical' },
      { label: 'Hydrodynamic Film Index', value: 'Critical safety floor', state: 'critical' },
      { label: 'Engine Speed', value: 'Stable at 5,020 RPM', state: 'nominal' },
    ],
    modelContribution: { physics: 40, anomaly: 40, trend: 20 },
    missionRecommendation:
      'Request immediate propulsion engineer review. Initiate return-to-base assessment and consider mission abort according to approved SOP.',
    correlatedSignals: ['Oil Pressure', 'Oil Temp', 'Vibration'],
  },

  lubrication_system_risk: {
    id: 'lubrication-system-risk',
    type: 'lubrication_system_risk',
    title: 'Consolidated Lubrication Circuit Risk',
    baseSeverity: 'CRITICAL',
    basePriority: 92,
    confidence: 91,
    missionImpact: 'HIGH',
    status: 'Multi-symptom correlated distress',
    explanation:
      'Concurrent degradation observed across oil pressure depression, elevated oil temperature, and elevated crankcase high-frequency vibration. Multi-transducer correlation confirms physical lubrication circuit stress rather than single-sensor failure.',
    monitorNow: [
      'Correlation trajectory between oil pressure loss and oil temperature rise.',
      'RMS crankcase vibration and harmonic order FFT shifts.',
      'Engine torque output degradation at constant throttle angle.',
    ],
    decisionOptions: [
      'Request propulsion engineer review',
      'Begin return-to-base assessment',
      'Escalate according to approved SOP',
    ],
    maintenancePriority: 'Ground aircraft pending inspection',
    maintenanceActions: [
      'Perform comprehensive lubrication system teardown check.',
      'Inspect oil cooler core airflow and internal heat exchanger channel.',
      'Examine oil bypass valve calibration and oil pressure transducer harness.',
      'Take oil sample for analytical ferrography.',
    ],
    evidence: [
      { label: 'Oil Pressure Drop', value: '-22% below nominal target', state: 'critical' },
      { label: 'Oil Temp Rise', value: '+14.5°C above expected band', state: 'warning' },
      { label: 'Vibration RMS Increase', value: '+35% above cruise baseline', state: 'warning' },
      { label: 'Cross-Signal Correlation', value: '96% confidence multi-signal link', state: 'critical' },
    ],
    modelContribution: { physics: 42, anomaly: 38, trend: 20 },
    missionRecommendation:
      'Initiate return-to-base assessment. Limit throttle transients and maintain loiter power according to approved SOP.',
    correlatedSignals: ['Oil Pressure', 'Oil Temp', 'Vibration'],
  },

  injector_abnormality: {
    id: 'injector-imbalance',
    type: 'injector_abnormality',
    title: 'Fuel Injector Delivery Imbalance',
    baseSeverity: 'WARNING',
    basePriority: 68,
    confidence: 86,
    missionImpact: 'MODERATE',
    status: 'Localized thermal deviation',
    explanation:
      'Individual cylinder exhaust gas temperature disparity indicates lean delivery or partial nozzle restriction on one injector, causing localized combustion temperature elevation and cylinder power imbalance.',
    monitorNow: [
      'Individual cylinder EGT delta spread (alert if spread exceeds 60°C).',
      'Fuel rail pressure stability and pulse duration trims.',
      'Engine roughness and 2X firing frequency vibration order.',
    ],
    decisionOptions: [
      'Continue with enhanced monitoring',
      'Request propulsion engineer review',
      'Begin return-to-base assessment',
    ],
    maintenancePriority: 'Inspect within 1 flight cycle',
    maintenanceActions: [
      'Remove and ultrasonic clean fuel injectors; bench-test spray pattern and flow rate.',
      'Replace inline fuel filter micro-screens.',
      'Download ECU log for individual cylinder lambda and pulse width trim adaptation.',
    ],
    evidence: [
      { label: 'Cylinder EGT Delta Spread', value: '58.4°C between Cyl 2 and Cyl 3', state: 'warning' },
      { label: 'Pulse Width Trim Delta', value: '+8.4% commanded on Lane B', state: 'warning' },
      { label: 'Fuel Rail Pressure', value: '3.18 bar (Nominal)', state: 'nominal' },
    ],
    modelContribution: { physics: 45, anomaly: 35, trend: 20 },
    missionRecommendation:
      'Continue with enhanced monitoring. Avoid high-power climbing envelopes; escalate to RTB assessment if EGT spread exceeds 75°C according to approved SOP.',
    correlatedSignals: ['EGT', 'Fuel Rail Pressure', 'Vibration'],
  },

  misfire_risk: {
    id: 'misfire-combustion',
    type: 'misfire_risk',
    title: 'Intermittent Combustion Misfire Risk',
    baseSeverity: 'WARNING',
    basePriority: 74,
    confidence: 83,
    missionImpact: 'HIGH',
    status: 'Combustion irregularity detected',
    explanation:
      'Cyclic crank angular deceleration pulses and unburned fuel residual indicate intermittent ignition breakdown or incomplete flame propagation in one or more combustion chambers.',
    monitorNow: [
      'FADEC dual-ignition lane A/B diagnostics and firing status.',
      'Crank angular velocity instantaneous variance.',
      'Cylinder head temperature and EGT drop on affected cylinder.',
    ],
    decisionOptions: [
      'Continue with enhanced monitoring',
      'Request propulsion engineer review',
      'Begin return-to-base assessment',
    ],
    maintenancePriority: 'Inspect before next mission',
    maintenanceActions: [
      'Inspect dual spark plugs for carbon deposits, electrode wear, or gap erosion.',
      'Test high-voltage ignition coils, suppressor boots, and trigger sensor air gap.',
      'Perform dry and wet cylinder compression test.',
    ],
    evidence: [
      { label: 'Crank Deceleration Events', value: '18 per 1,000 engine cycles', state: 'warning' },
      { label: 'COV of Indicated Mean Effective Pressure', value: '9.2% (Threshold 8.0%)', state: 'warning' },
      { label: '2X Firing Order Harmonic', value: '+28% amplitude spike', state: 'warning' },
    ],
    modelContribution: { physics: 44, anomaly: 36, trend: 20 },
    missionRecommendation:
      'Continue with enhanced monitoring; enrich mixture if permitted by flight manual. Escalate to RTB assessment if misfire frequency increases.',
    correlatedSignals: ['RPM', 'EGT', 'Vibration'],
  },

  abnormal_vibration: {
    id: 'abnormal-vibration',
    type: 'abnormal_vibration',
    title: 'Elevated Mechanical Vibration Harmonics',
    baseSeverity: 'WARNING',
    basePriority: 64,
    confidence: 88,
    missionImpact: 'MODERATE',
    status: 'Harmonic spectral elevation',
    explanation:
      'Crankcase and gearbox accelerometers detect elevated spectral harmonics, suggesting propeller unbalance, gearbox dog clutch lash, or engine mount isolator settling.',
    monitorNow: [
      'Overall RMS vibration level against 2.0g caution and 2.8g alarm thresholds.',
      '1X propeller shaft and 2X crankshaft order amplitude ratio.',
      'Gearbox temperature and propeller governor oil pressure.',
    ],
    decisionOptions: [
      'Continue with enhanced monitoring',
      'Adjust cruise RPM band by ±150 RPM',
      'Request propulsion engineer review',
    ],
    maintenancePriority: 'Inspect before next mission',
    maintenanceActions: [
      'Perform dynamic propeller balancing using ground optical balance kit.',
      'Inspect engine mount elastomeric isolators for settling or fuel/oil damage.',
      'Inspect reduction gearbox overload clutch backlash and drain plug magnet.',
    ],
    evidence: [
      { label: 'Overall Vibration RMS', value: '2.14g (Caution > 2.0g)', state: 'warning' },
      { label: '1X Rotational Harmonic', value: '0.84g (+32% above baseline)', state: 'warning' },
      { label: '2X & 4X Orders', value: 'Nominal baseline match', state: 'nominal' },
    ],
    modelContribution: { physics: 38, anomaly: 42, trend: 20 },
    missionRecommendation:
      'Continue with enhanced monitoring. Sweep engine RPM by ±100 RPM to evaluate resonant detuning if flight envelope permits.',
    correlatedSignals: ['Vibration', 'RPM'],
  },

  sensor_drift: {
    id: 'sensor-drift-general',
    type: 'sensor_drift',
    title: 'Avionics Sensor Calibration Drift',
    baseSeverity: 'ADVISORY',
    basePriority: 44,
    confidence: 90,
    missionImpact: 'LOW',
    status: 'Sensor validation alert',
    explanation:
      'Discrepancy detected between raw sensor measurements and redundant synthetic digital twin estimators. Physical engine operating state remains stable while sensor confidence is downgraded.',
    monitorNow: [
      'Correlation between physical engine power output and drifting transducer.',
      'Redundant sensor cross-check channels where available.',
      'FADEC health status flags and CAN bus message parity checks.',
    ],
    decisionOptions: [
      'Continue normally',
      'Continue with enhanced monitoring',
      'Schedule maintenance review',
    ],
    maintenancePriority: 'Inspect within 1 flight cycle',
    maintenanceActions: [
      'Recalibrate or replace identified sensor during next turnaround.',
      'Verify sensor harness wiring continuity, shielding, and reference voltage rail.',
      'Review ECU calibration offset logs.',
    ],
    evidence: [
      { label: 'Sensor vs Physics Model Delta', value: '+2.4σ divergence', state: 'advisory' },
      { label: 'Physical Engine Performance', value: 'Completely stable output', state: 'nominal' },
      { label: 'Sensor Confidence Score', value: 'Downgraded to 72%', state: 'advisory' },
    ],
    modelContribution: { physics: 45, anomaly: 35, trend: 20 },
    missionRecommendation:
      'Continue mission under enhanced monitoring. Treat parameter as advisory and cross-verify with synthetic twin values.',
    correlatedSignals: ['Sensor Confidence', 'Residuals'],
  },

  map_sensor_bias_drift: {
    id: 'map-sensor-drift',
    type: 'map_sensor_bias_drift',
    title: 'MAP Sensor Bias Drift (Sensor Quality)',
    baseSeverity: 'ADVISORY',
    basePriority: 42,
    confidence: 92,
    missionImpact: 'LOW',
    status: 'Lower-priority sensor advisory',
    explanation:
      'Manifold-pressure readings remain above the expected range for the current RPM, fuel flow, and ambient conditions. Engine RPM, thermal levels, and fuel burn remain stable, confirming sensor bias rather than an actual engine load increase.',
    monitorNow: [
      'Manifold absolute pressure reading against expected engine performance map.',
      'Engine RPM and fuel flow stability during steady cruise.',
      'Exhaust gas temperature symmetry across cylinders.',
    ],
    decisionOptions: [
      'Continue normally',
      'Continue with enhanced monitoring',
      'Schedule maintenance review',
    ],
    maintenancePriority: 'Inspect within 1 flight cycle',
    maintenanceActions: [
      'Inspect MAP sensor connector, wiring, and ground reference.',
      'Compare sensor reading with calibrated precision pressure source.',
      'Review ECU diagnostic codes and calibration history.',
      'Log this advisory in maintenance records.',
    ],
    evidence: [
      { label: 'MAP Sensor Residual', value: '+18.4% above map expectation', state: 'advisory' },
      { label: 'RPM Stability', value: '±1.2% (Steady cruise)', state: 'nominal' },
      { label: 'Fuel Flow Stability', value: '±0.3 L/h (Steady burn)', state: 'nominal' },
      { label: 'Thermal Indicators', value: 'Nominal across all cylinders', state: 'nominal' },
    ],
    modelContribution: { physics: 45, anomaly: 35, trend: 20 },
    missionRecommendation:
      'Continue mission under enhanced monitoring. Low mission impact; cross-check MAP against synthetic physics model.',
    correlatedSignals: ['MAP', 'RPM', 'Fuel Flow'],
  },

  combustion_instability: {
    id: 'combustion-instability',
    type: 'combustion_instability',
    title: 'Combustion Chamber Instability',
    baseSeverity: 'WARNING',
    basePriority: 72,
    confidence: 87,
    missionImpact: 'MODERATE',
    status: 'Dynamic combustion fluctuation',
    explanation:
      'Rapid cyclic oscillation detected in exhaust gas temperatures and intake plenum pressure. Pattern indicates localized lean-limit surging or variable turbocharger wastegate modulation at current density altitude.',
    monitorNow: [
      'Wastegate position stability and turbo boost pressure.',
      'EGT rapid flutter amplitude across all cylinders.',
      'Fuel rail pressure oscillations.',
    ],
    decisionOptions: [
      'Continue with enhanced monitoring',
      'Request propulsion engineer review',
      'Begin return-to-base assessment',
    ],
    maintenancePriority: 'Inspect before next mission',
    maintenanceActions: [
      'Perform cylinder differential compression test (leakdown test).',
      'Borescope inspection of intake valves and combustion chamber roofs.',
      'Calibrate electronic wastegate actuator and throttle position sensor.',
    ],
    evidence: [
      { label: 'EGT Dynamic Flutter', value: '±16°C oscillations at 2 Hz', state: 'warning' },
      { label: 'Intake Manifold Pressure Variance', value: '±22 hPa cyclic oscillation', state: 'warning' },
      { label: 'Air-Fuel Lambda Flutter', value: 'Detected in Lane A controller', state: 'warning' },
    ],
    modelContribution: { physics: 46, anomaly: 34, trend: 20 },
    missionRecommendation:
      'Continue with enhanced monitoring. Avoid rapid throttle changes; maintain level flight envelope according to approved SOP.',
    correlatedSignals: ['EGT', 'MAP', 'Fuel Pressure'],
  },

  battery_alternator_issue: {
    id: 'elec-alternator-drop',
    type: 'battery_alternator_issue',
    title: 'Electrical Generation / Bus Voltage Sag',
    baseSeverity: 'WARNING',
    basePriority: 62,
    confidence: 90,
    missionImpact: 'MODERATE',
    status: 'Electrical bus anomaly',
    explanation:
      'Avionics main bus voltage has drifted below nominal 28.0V charging baseline during continuous engine operation, indicating potential alternator stator thermal degradation or regulator diode breakdown.',
    monitorNow: [
      'ECU bus voltage trend (critical floor 24.5V).',
      'Current draw on mission avionics bus.',
      'Fuel pump secondary electrical lane backup status.',
    ],
    decisionOptions: [
      'Continue with enhanced monitoring',
      'Request propulsion engineer review',
      'Begin return-to-base assessment',
    ],
    maintenancePriority: 'Inspect before next mission',
    maintenanceActions: [
      'Inspect internal alternator windings, slip rings, and brushes.',
      'Test electronic voltage regulator/rectifier unit under simulated electrical load.',
      'Inspect engine-to-airframe grounding straps for corrosion.',
    ],
    evidence: [
      { label: 'Bus Voltage Level', value: '25.2V (Nominal 28.0V - 28.4V)', state: 'warning' },
      { label: 'Alternator Temperature', value: '+18°C above baseline', state: 'warning' },
      { label: 'Engine Operating RPM', value: '5,000 RPM (Full charging range)', state: 'nominal' },
    ],
    modelContribution: { physics: 40, anomaly: 40, trend: 20 },
    missionRecommendation:
      'Continue with enhanced monitoring. Shed non-essential payload electrical consumers if bus drops below 24.8V according to approved SOP.',
    correlatedSignals: ['Bus Voltage', 'Engine RPM'],
  },

  fuel_flow_anomaly: {
    id: 'fuel-flow-anomaly',
    type: 'fuel_flow_anomaly',
    title: 'Fuel Flow Rate & BSFC Discrepancy',
    baseSeverity: 'WARNING',
    basePriority: 58,
    confidence: 85,
    missionImpact: 'MODERATE',
    status: 'Brake-specific fuel consumption elevation',
    explanation:
      'Calculated brake-specific fuel consumption (BSFC) exceeds expected engine operating envelope by 14% for current brake horsepower, indicating excessive fuel bypass, injector over-fueling, or unmetered fuel loss.',
    monitorNow: [
      'Fuel tank quantity depletion rate vs calculated fuel flow rate.',
      'Fuel rail pressure regulator delta.',
      'Exhaust lambda sensor status for rich combustion signature.',
    ],
    decisionOptions: [
      'Continue with enhanced monitoring',
      'Request propulsion engineer review',
      'Begin return-to-base assessment',
    ],
    maintenancePriority: 'Inspect within 1 flight cycle',
    maintenanceActions: [
      'Pressure test fuel supply and return lines for external weeping or fitting leaks.',
      'Bench-test fuel pressure regulator and flow transducer calibration.',
      'Check spark plug deposits for unburned rich fuel residue.',
    ],
    evidence: [
      { label: 'Measured Fuel Flow', value: '28.4 L/h (Expected 24.8 L/h)', state: 'warning' },
      { label: 'BSFC Index', value: '285 g/kWh (+14% above target map)', state: 'warning' },
      { label: 'Engine Power Output', value: 'Nominal 112 HP', state: 'nominal' },
    ],
    modelContribution: { physics: 48, anomaly: 32, trend: 20 },
    missionRecommendation:
      'Continue with enhanced monitoring. Verify remaining fuel endurance against divert airfield reserves according to approved SOP.',
    correlatedSignals: ['Fuel Flow', 'Fuel Pressure', 'RPM'],
  },

  data_quality_issue: {
    id: 'data-quality-drop',
    type: 'data_quality_issue',
    title: 'Telemetry Telecommunication Jitter & Data Age Elevation',
    baseSeverity: 'ADVISORY',
    basePriority: 36,
    confidence: 76,
    missionImpact: 'LOW',
    status: 'Data fidelity notice',
    explanation:
      'Telemetry downlink latency has exceeded normal 100ms threshold or intermittent frame dropouts detected. Model inference confidence is temporarily derated to prevent spurious fault classification.',
    monitorNow: [
      'Datalink signal-to-noise ratio and packet drop percentage.',
      'Data age timer in top telemetry status ribbon.',
      'State estimator covariance matrix convergence.',
    ],
    decisionOptions: [
      'Continue normally',
      'Continue with enhanced monitoring',
      'Request communications check',
    ],
    maintenancePriority: 'Monitor only',
    maintenanceActions: [
      'Check GCS antenna tracking positioning and RF cable VSWR.',
      'Review airborne data acquisition logger buffer overrun statistics.',
    ],
    evidence: [
      { label: 'Telemetry Data Age', value: '1.4s (Nominal < 0.2s)', state: 'advisory' },
      { label: 'Packet Drop Rate', value: '2.8% over previous 60s', state: 'advisory' },
      { label: 'State Estimator Status', value: 'Preserving last valid state', state: 'nominal' },
    ],
    modelContribution: { physics: 30, anomaly: 50, trend: 20 },
    missionRecommendation:
      'Continue normal mission monitoring. Advisory engine will automatically restore full confidence upon packet stream normalization.',
    correlatedSignals: ['Data Age', 'Drop Rate', 'Latency'],
  },
};
