/**
 * ============================================================================
 * AEROTWIN // MULTI-ENGINE DIGITAL TWIN ARCHITECTURE CONFIGURATIONS
 * ============================================================================
 * Defines specification schemas, operating parameters, telemetry profiles,
 * fault models, and component inspection databases for the four selectable
 * MALE UAV aero propulsion architectures.
 *
 * All telemetry is synthetic simulation data. All models are demonstrator visualizations.
 */

const VISUALIZATION_LAYERS = {
  mechanical: {
    id: 'mechanical',
    name: 'Mechanical Assembly',
    icon: '⚙️',
    defaultVisible: true,
    description: 'Pistons, crankshaft, conrods, eccentric shaft, rotor, gears, propeller reduction & hub'
  },
  airflow: {
    id: 'airflow',
    name: 'Airflow & Induction',
    icon: '🌬️',
    defaultVisible: true,
    description: 'Air intake filter, manifold plenum, intercooler core, charge air ducts, and boost piping'
  },
  fuel: {
    id: 'fuel',
    name: 'Fuel Delivery Circuit',
    icon: '⛽',
    defaultVisible: true,
    description: 'High-pressure common rail, direct injectors, feed lines, and precision AN-couplings'
  },
  thermal: {
    id: 'thermal',
    name: 'Combustion & Thermal Zones',
    icon: '🔥',
    defaultVisible: true,
    description: 'Cylinder heads, combustion zones, exhaust manifolds, downpipes, and turbine scrolls'
  },
  lube: {
    id: 'lube',
    name: 'Lubrication Circuit',
    icon: '🛢️',
    defaultVisible: true,
    description: 'Ribbed oil sump, high-pressure oil pump, scavenge lines, and turbo bearing oil feeds'
  },
  electrical: {
    id: 'electrical',
    name: 'Electrical & FADEC',
    icon: '⚡',
    defaultVisible: true,
    description: 'Engine-driven alternator, redundant FADEC ECU, ignition coils, spark leads, and sensors'
  },
  health: {
    id: 'health',
    name: 'Health & Stress Overlay',
    icon: '🛡️',
    defaultVisible: true,
    description: 'STANAG 4586 color-coded stress overlay (Nominal Green, Caution Amber, Warning Orange, Critical Red)'
  },
  ai: {
    id: 'ai',
    name: 'AI Anomaly & Residuals',
    icon: '🧠',
    defaultVisible: true,
    description: 'EKF residual confidence halos, multi-sensor anomaly attribution, and predicted fault markers'
  }
};

const ENGINE_ARCHITECTURES = {
  HEAVY_FUEL_CI: {
    id: 'HEAVY_FUEL_CI',
    displayName: 'Four-Stroke Heavy-Fuel Compression-Ignition Engine',
    shortName: 'Heavy-Fuel CI',
    categoryBadge: 'COMPRESSION IGNITION // DIESEL & JET-A1',
    icon: '⛽',
    silhouette: 'heavy_fuel',
    architecture: 'reciprocating_compression_ignition',
    cylinderCount: 4,
    hasPistons: true,
    hasRotor: false,
    hasTurbocharger: false,
    fuelType: 'Heavy Fuel (Diesel / JP-8 / Jet-A1)',
    description: 'Four-stroke compression-ignition engine designed to operate with heavy fuels such as diesel or aviation kerosene-class fuels in this synthetic demonstrator.',
    strengths: [
      'Strong fuel efficiency for long endurance',
      'Simplified military fuel logistics concept',
      'Lower fuel volatility relative to gasoline'
    ],
    tradeOffs: [
      'Higher engine mass',
      'Higher compression and structural load',
      'Thermal and vibration management remain critical'
    ],
    monitoringFocus: 'Common-rail fuel pressure, high-pressure direct injector spray pattern balance, cylinder head thermal stress, and crankcase vibration signature.',
    relevantMission: 'Extended-endurance persistent surveillance (18+ hours loiter) with standard military forward-operating-base fuel supplies.',
    specialViews: [
      { id: 'endurance_efficiency', label: 'Endurance Efficiency View', icon: '⏱️', desc: 'Simulated fuel burn per mission phase & forward logistics footprint' },
      { id: 'fuel_pulse_map', label: 'Common-Rail Pulse Map', icon: '💉', desc: '1450 bar piezo injection timing & multi-hole nozzle atomization' }
    ],
    damageWeights: { thermal: 0.35, lube: 0.25, vibration: 0.25, fuel: 0.15 },
    normalRanges: {
      rpm: { min: 1200, max: 4200, nominal: 3600, unit: 'RPM' },
      throttle: { min: 0, max: 100, nominal: 72, unit: '%' },
      fuel_rail_press: { min: 1100, max: 1800, nominal: 1450, unit: 'bar' },
      fuel_flow: { min: 12.0, max: 32.0, nominal: 22.4, unit: 'L/h' },
      cht: { min: 80, max: 135, nominal: 112.5, unit: '°C' },
      egt: { min: 550, max: 780, nominal: 685.0, unit: '°C' },
      oil_pressure: { min: 3.2, max: 6.0, nominal: 4.6, unit: 'bar' },
      oil_temp: { min: 75, max: 115, nominal: 98.0, unit: '°C' },
      vibration: { min: 0.2, max: 1.2, nominal: 0.58, unit: 'g RMS' },
      combustion_quality: { min: 70, max: 100, nominal: 96, unit: '%' },
      health_score: { min: 0, max: 100, nominal: 94, unit: '%' },
      rul: { min: 0, max: 500, nominal: 245.0, unit: 'hrs' }
    },
    telemetryProfile: [
      { key: 'rpm', label: 'Crankshaft Speed', unit: 'RPM', category: 'speed' },
      { key: 'throttle', label: 'Throttle Demand', unit: '%', category: 'control' },
      { key: 'fuel_rail_press', label: 'Fuel Rail Pressure', unit: 'bar', category: 'fuel' },
      { key: 'fuel_flow', label: 'Fuel Flow Rate', unit: 'L/h', category: 'fuel' },
      { key: 'cht', label: 'Mean CHT', unit: '°C', category: 'thermal' },
      { key: 'egt', label: 'Exhaust Gas Temp', unit: '°C', category: 'thermal' },
      { key: 'oil_press', label: 'Oil Pressure', unit: 'bar', category: 'lube' },
      { key: 'oil_temp', label: 'Oil Sump Temp', unit: '°C', category: 'thermal' },
      { key: 'vibration', label: 'Vibration RMS', unit: 'g RMS', category: 'vib' },
      { key: 'combustion_quality', label: 'Combustion Quality', unit: '%', category: 'health' },
      { key: 'health_score', label: 'Engine Health Index', unit: '%', category: 'health' },
      { key: 'rul', label: 'Estimated RUL', unit: 'hrs', category: 'rul' }
    ],
    supportedFaults: [
      { id: 'injector_degradation', name: 'High-Pressure Injector Clogging', desc: 'Nozzle deposits cause spray asymmetry and EGT drop', unit: '%' },
      { id: 'fuel_rail_pressure_drop', name: 'Fuel Rail Pressure Drop', desc: 'High-pressure fuel delivery leak or valve regulator float', unit: '%' },
      { id: 'combustion_imbalance', name: 'Combustion Imbalance (Diesel Knock)', desc: 'Cylinder compression variance causing mechanical roughness', unit: '%' },
      { id: 'low_oil_pressure', name: 'Low Lubrication Pressure', desc: 'Viscosity breakdown or oil pump bypass degradation', unit: '%' },
      { id: 'overheating', name: 'Thermal Overload / Coolant Jacket', desc: 'Cooling jacket heat accumulation under high loiter OAT', unit: '%' },
      { id: 'high_vibration', name: 'Structural / Crankcase Vibration', desc: 'Unbalanced reciprocating harmonics and bearing chatter', unit: '%' },
      { id: 'sensor_drift', name: 'Rail Pressure Sensor Drift (Purple)', desc: 'CAN-bus calibration offset between twin and FADEC', unit: '%' }
    ],
    inspectionComponents: {
      'FuelRail': {
        name: 'High-Pressure Common Rail Manifold',
        category: 'FUEL INJECTION SYSTEM // CI DIRECT',
        nominalStatus: 'NOMINAL (1450 bar steady)',
        inspectText: 'Forged high-tensile steel rail operating at 1450 bar. Supplies calibrated heavy fuel direct to micro-solenoid injectors.',
        actionNominal: 'Verify piezo regulator response and pressure relief valve seating.',
        actionFault: 'Immediate rail pressure transducer calibration; verify high-pressure feed pump seal integrity.'
      },
      'Injector1': {
        name: 'Common-Rail Injector #1',
        category: 'DIRECT INJECTION NOZZLE // SOLENOID',
        nominalStatus: 'NOMINAL',
        inspectText: 'Multi-hole direct heavy-fuel injector operating at 1450 bar injection pressure.',
        actionNominal: 'Monitor injection duration and advance angle.',
        actionFault: 'Ultrasonic cleaning of nozzle tips; inspect return flow orifice.'
      },
      'Injector3': {
        name: 'Common-Rail Injector #3 [Cyl 3]',
        category: 'DIRECT INJECTION NOZZLE // SOLENOID',
        nominalStatus: 'NOMINAL',
        inspectText: 'Multi-hole direct heavy-fuel injector with micro-solenoid actuation.',
        actionNominal: 'Check cylinder #3 pulse timing and fuel trim balance.',
        actionFault: 'Clean nozzle deposits; check fuel return line backpressure; replace injector seal.'
      },
      'CylinderBlock': {
        name: 'Heavy-Duty Cast Iron Engine Block',
        category: 'STRUCTURAL MONOBLOCK // CI PROPULSION',
        nominalStatus: 'NOMINAL',
        inspectText: 'High-rigidity monoblock designed for extreme compression ignition peak cylinder pressures (Pmax > 160 bar).',
        actionNominal: 'Borescope inspection of cylinder liners during 100-hour depot check.',
        actionFault: 'Inspect crankcase breathing filter and verify oil aeration limits.'
      },
      'OilSump': {
        name: 'Ribbed Heavy-Duty Oil Sump',
        category: 'LUBRICATION CIRCUIT // SUMP & SCAVENGE',
        nominalStatus: 'NOMINAL',
        inspectText: 'Reinforced cast aluminum sump with internal baffles to ensure uninterrupted suction during UAV tactical maneuvering.',
        actionNominal: 'Regular oil analysis for soot accumulation and TBN depletion.',
        actionFault: 'Sample synthetic heavy-duty oil for fuel dilution and viscosity index drop.'
      }
    }
  },

  BOXER: {
    id: 'BOXER',
    displayName: 'Horizontally Opposed / Boxer Reciprocating-Piston Engine',
    shortName: 'Horizontally Opposed / Boxer',
    categoryBadge: 'RECIPROCATING // HORIZONTALLY OPPOSED BOXER',
    icon: '↔️',
    silhouette: 'boxer',
    architecture: 'reciprocating_horizontally_opposed',
    cylinderCount: 4,
    hasPistons: true,
    hasRotor: false,
    hasTurbocharger: false,
    fuelType: 'Aviation Gasoline (Avgas 100LL / 91UL)',
    description: 'Reciprocating engine with cylinders arranged horizontally opposite each other around a central crankshaft.',
    strengths: [
      'Low engine profile fits easily inside slender UAV airframes',
      'Good primary balance due to opposing piston kinematics',
      'Suitable geometry for streamlined pusher/tractor installation'
    ],
    tradeOffs: [
      'Wider engine package requires careful cowling design',
      'Cowl and cooling-path design are important for bank balance',
      'Cylinder-to-cylinder temperature imbalance must be monitored'
    ],
    monitoringFocus: 'Left-bank vs right-bank CHT balance, individual cylinder EGT spread, crankcase vibration RMS, and cylinder misfire harmonics.',
    relevantMission: 'Standard reconnaissance and tactical border surveillance flights requiring minimal aerodynamic drag and low vibration.',
    specialViews: [
      { id: 'opposing_motion', label: 'Opposing Motion Highlight', icon: '↔️', desc: 'Visual paired piston motion trajectory and dynamic primary reciprocating balance' },
      { id: 'bank_balance', label: 'Bank Thermal Balance', icon: '⚖️', desc: 'Left-bank vs right-bank CHT delta temperature and cowl cooling flow distribution' }
    ],
    damageWeights: { thermal: 0.40, lube: 0.20, vibration: 0.20, fuel: 0.20 },
    normalRanges: {
      rpm: { min: 1400, max: 5800, nominal: 5200, unit: 'RPM' },
      throttle: { min: 0, max: 100, nominal: 78, unit: '%' },
      cht: { min: 85, max: 135, nominal: 108.4, unit: '°C' },
      egt: { min: 680, max: 880, nominal: 795.0, unit: '°C' },
      oil_pressure: { min: 2.5, max: 5.5, nominal: 4.1, unit: 'bar' },
      oil_temp: { min: 70, max: 120, nominal: 101.5, unit: '°C' },
      fuel_flow: { min: 18.0, max: 50.0, nominal: 38.5, unit: 'L/h' },
      vibration: { min: 0.15, max: 0.85, nominal: 0.42, unit: 'g RMS' },
      bank_imbalance: { min: 0.0, max: 15.0, nominal: 3.2, unit: '°C' },
      health_score: { min: 0, max: 100, nominal: 91, unit: '%' },
      rul: { min: 0, max: 400, nominal: 198.5, unit: 'hrs' }
    },
    telemetryProfile: [
      { key: 'rpm', label: 'Engine Speed', unit: 'RPM', category: 'speed' },
      { key: 'throttle', label: 'Throttle Position', unit: '%', category: 'control' },
      { key: 'cht_left', label: 'Left Bank CHT (Cyl 1/3)', unit: '°C', category: 'thermal' },
      { key: 'cht_right', label: 'Right Bank CHT (Cyl 2/4)', unit: '°C', category: 'thermal' },
      { key: 'bank_imbalance', label: 'Bank Temp Imbalance', unit: '°C', category: 'balance' },
      { key: 'egt', label: 'Peak Exhaust Gas Temp', unit: '°C', category: 'thermal' },
      { key: 'oil_press', label: 'Oil Pressure', unit: 'bar', category: 'lube' },
      { key: 'oil_temp', label: 'Oil Temp', unit: '°C', category: 'thermal' },
      { key: 'fuel_flow', label: 'Fuel Flow Rate', unit: 'L/h', category: 'fuel' },
      { key: 'vibration', label: 'Vibration RMS', unit: 'g RMS', category: 'vib' },
      { key: 'health_score', label: 'Overall Health', unit: '%', category: 'health' },
      { key: 'rul', label: 'Estimated RUL', unit: 'hrs', category: 'rul' }
    ],
    supportedFaults: [
      { id: 'bank_imbalance', name: 'Left/Right Bank Thermal Imbalance', desc: 'Cooling duct obstruction or mixture disparity across banks', unit: '%' },
      { id: 'misfire', name: 'Combustion Misfire (Spark/Ignition)', desc: 'Intermittent spark plug fouling or ignition coil drop', unit: '%' },
      { id: 'injector_degradation', name: 'Cylinder Injector Degradation', desc: 'Deposit accumulation causing lean burn on targeted cylinder', unit: '%' },
      { id: 'low_oil_pressure', name: 'Low Oil Lubrication Pressure', desc: 'Internal relief valve wear or high-temperature oil thinning', unit: '%' },
      { id: 'overheating', name: 'Cylinder Head Overheating', desc: 'Restricted baffle airflow during extended climb/loiter', unit: '%' },
      { id: 'crankcase_vibration', name: 'Crankcase Vibration Anomaly', desc: 'Torsional resonance and propeller balance harmonic shift', unit: '%' },
      { id: 'sensor_drift', name: 'CHT Thermocouple Sensor Drift (Purple)', desc: 'Sensor calibration divergence between dual redundant probes', unit: '%' }
    ],
    inspectionComponents: {
      'Cylinder3': {
        name: 'Cylinder #3 [Left Bank Rear]',
        category: 'COMBUSTION CHAMBER // ROTAX 915 iS',
        nominalStatus: 'NOMINAL (107°C / 785°C)',
        inspectText: 'Horizontally opposed cylinder with water-cooled cylinder head and ram-air cooled cylinder barrel.',
        actionNominal: 'Verify dual spark plug gap and ignition timing synchronization.',
        actionFault: 'Inspect injector nozzle orifice and verify left-bank cooling air ducting.'
      },
      'Crankcase': {
        name: 'Split Crankcase Housing',
        category: 'STRUCTURAL CORE // ALUMINUM CASTING',
        nominalStatus: 'NOMINAL',
        inspectText: 'High-strength aluminum split crankcase housing a dynamically balanced forged crankshaft with plane bearings.',
        actionNominal: 'Check main oil gallery pressure and crankcase pressure differential.',
        actionFault: 'Verify crankcase breather check-valve and perform oil filter particulate analysis.'
      },
      'PropellerGearbox': {
        name: 'Integrated Propeller Reduction Gearbox',
        category: 'TRANSMISSION // 2.54:1 GEARBOX & SLIP CLUTCH',
        nominalStatus: 'NOMINAL',
        inspectText: 'Straight-cut reduction gearbox with integrated mechanical overload slip clutch protecting crankshaft from prop strikes.',
        actionNominal: 'Verify gearbox oil level and inspect slip clutch dog engagement.',
        actionFault: 'Measure gearbox backlash and inspect torsional vibration damper elastomer.'
      }
    }
  },

  WANKEL_ROTARY: {
    id: 'WANKEL_ROTARY',
    displayName: 'Wankel Rotary Internal-Combustion Engine',
    shortName: 'Wankel Rotary',
    technicalNote: 'Rotary internal-combustion architecture; included for propulsion-system comparison.',
    categoryBadge: 'ROTARY IC // EPITROCHOID ROTOR // COMPARISON ARCHITECTURE',
    icon: '🔺',
    silhouette: 'wankel',
    architecture: 'rotary_epitrochoid',
    cylinderCount: 0,
    rotorCount: 1,
    hasPistons: false,
    hasRotor: true,
    hasTurbocharger: false,
    fuelType: 'Synthetic Gasoline / Aviation Gasoline (Heavy Fuel adaptable)',
    description: 'Rotary internal-combustion engine using a triangular rotor moving inside an epitrochoid-like housing rather than conventional pistons.',
    strengths: [
      'Compact architecture with exceptionally small frontal cross-section',
      'High power-to-weight potential (up to 2x higher than reciprocating equivalents)',
      'Smooth rotational operation and low reciprocating vibration for electro-optical sensors'
    ],
    tradeOffs: [
      'Thermal management challenge with concentrated hot-arc combustion sector',
      'Seal wear/degradation concern (apex, side, and corner seals)',
      'Fuel efficiency and emissions characteristics differ from piston engines'
    ],
    monitoringFocus: 'Apex seal integrity index, rotor housing hot-spot thermal stress, eccentric shaft bearing oil pressure, and peripheral port intake velocity.',
    relevantMission: 'High-payload electro-optical/infrared (EO/IR) reconnaissance sorties requiring extreme sensor stability and compact engine volume.',
    specialViews: [
      { id: 'rotor_cycle_explain', label: 'Rotor Cycle Explanation', icon: '🔄', desc: 'Slowed 1:3 planetary motion with labeled Intake, Compression, Combustion, and Exhaust phases' },
      { id: 'thermal_seal_focus', label: 'Thermal & Seal Focus', icon: '🔺', desc: 'Apex seal wear indices, side seal clearances, and housing hot-arc heat rejection' }
    ],
    damageWeights: { thermal: 0.45, seal: 0.35, lube: 0.20 },
    normalRanges: {
      rpm: { min: 2000, max: 7500, nominal: 6200, unit: 'RPM' },
      throttle: { min: 0, max: 100, nominal: 75, unit: '%' },
      rotor_housing_temp: { min: 85, max: 155, nominal: 118.0, unit: '°C' },
      egt: { min: 720, max: 960, nominal: 845.0, unit: '°C' },
      intake_pressure: { min: 700, max: 1050, nominal: 980.0, unit: 'hPa' },
      oil_pressure: { min: 3.5, max: 6.5, nominal: 4.8, unit: 'bar' },
      fuel_flow: { min: 24.0, max: 62.0, nominal: 42.0, unit: 'L/h' },
      seal_health: { min: 0, max: 100, nominal: 95, unit: '%' },
      vibration: { min: 0.08, max: 0.45, nominal: 0.18, unit: 'g RMS' },
      thermal_stress: { min: 0, max: 100, nominal: 28, unit: '%' },
      health_score: { min: 0, max: 100, nominal: 93, unit: '%' },
      rul: { min: 0, max: 350, nominal: 180.0, unit: 'hrs' }
    },
    telemetryProfile: [
      { key: 'rpm', label: 'Rotor Output Shaft Speed', unit: 'RPM', category: 'speed' },
      { key: 'throttle', label: 'Throttle Position', unit: '%', category: 'control' },
      { key: 'rotor_housing_temp', label: 'Rotor Housing Temp', unit: '°C', category: 'thermal' },
      { key: 'egt', label: 'Exhaust Gas Temp', unit: '°C', category: 'thermal' },
      { key: 'intake_pressure', label: 'Intake Port Pressure', unit: 'hPa', category: 'air' },
      { key: 'seal_health', label: 'Apex Seal Health Index', unit: '%', category: 'health' },
      { key: 'thermal_stress', label: 'Housing Thermal Gradient', unit: '%', category: 'thermal' },
      { key: 'oil_press', label: 'Eccentric Shaft Oil Press', unit: 'bar', category: 'lube' },
      { key: 'fuel_flow', label: 'Fuel Flow Rate', unit: 'L/h', category: 'fuel' },
      { key: 'vibration', label: 'Vibration RMS (Ultra-Low)', unit: 'g RMS', category: 'vib' },
      { key: 'health_score', label: 'Overall Rotary Health', unit: '%', category: 'health' },
      { key: 'rul', label: 'Estimated RUL', unit: 'hrs', category: 'rul' }
    ],
    supportedFaults: [
      { id: 'apex_seal_wear', name: 'Apex Seal Wear / Compression Leak', desc: 'Seal spring fatigue and apex tip abrasion causing chamber cross-leakage', unit: '%' },
      { id: 'housing_overheating', name: 'Rotor Housing Hot-Sector Overheat', desc: 'Cooling jacket vapor lock on the expansion/combustion sector', unit: '%' },
      { id: 'low_oil_pressure', name: 'Lubrication / Metering Oil Issue', desc: 'Metering pump shortfall starving rotor face and apex seals', unit: '%' },
      { id: 'port_restriction', name: 'Intake / Exhaust Port Restriction', desc: 'Carbon fouling around peripheral exhaust timing port', unit: '%' },
      { id: 'combustion_instability', name: 'Combustion Chamber Instability', desc: 'Dual spark-plug timing offset or lean quench phenomenon', unit: '%' },
      { id: 'sensor_drift', name: 'Housing Pyrometer Sensor Drift (Purple)', desc: 'Optical/thermal sensor drift in the hot expansion zone', unit: '%' },
      { id: 'thermal_gradient', name: 'Abnormal Axial Thermal Gradient', desc: 'Differential expansion between side plates and trochoid casing', unit: '%' }
    ],
    inspectionComponents: {
      'Rotor': {
        name: 'Triangular Reuleaux Rotor',
        category: 'ROTATING CORE // CAST IRON / NODULAR',
        nominalStatus: 'NOMINAL (Orbiting at 1:3 ratio)',
        inspectText: 'Triangular rotor with internal gear engaging stationary timing pinion. Generates 3 moving combustion chambers.',
        actionNominal: 'Inspect combustion recess pocket for carbon deposits.',
        actionFault: 'Borescope inspection of flank pocket surface; check internal bearing oil clearance.'
      },
      'ApexSeal1': {
        name: 'Apex Seal #1 [Leading Tip]',
        category: 'SEALING ELEMENT // CERAMIC-METALLIC COMPOSITE',
        nominalStatus: 'NOMINAL',
        inspectText: 'Multi-piece ceramic-metallic apex seal with internal bow spring sealing chamber gap against epitrochoid chrome lining.',
        actionNominal: 'Measure dynamic chamber compression via cranking transducer.',
        actionFault: 'Replace apex seal set and check epitrochoid surface for chattering score marks.'
      },
      'ApexSeal2': {
        name: 'Apex Seal #2 [Trailing Tip]',
        category: 'SEALING ELEMENT // CERAMIC-METALLIC COMPOSITE',
        nominalStatus: 'NOMINAL',
        inspectText: 'Spring-loaded apex seal providing gas-tight separation between expansion and compression sectors.',
        actionNominal: 'Verify apex lubrication injection metering rate.',
        actionFault: 'Inspect apex seal groove clearance and oil metering pump delivery rate.'
      },
      'RotorHousing': {
        name: 'Epitrochoid Rotor Housing',
        category: 'THERMAL ENVELOPE // CERMET COATED ALUMINUM',
        nominalStatus: 'NOMINAL',
        inspectText: 'Water-cooled aluminum housing with wear-resistant Cermet/Nikasil inner trochoidal surface and multipath cooling passages.',
        actionNominal: 'Check coolant flow rate across hot combustion sector.',
        actionFault: 'Inspect for localized thermal distortion and verify coolant pump head pressure.'
      },
      'EccentricShaft': {
        name: 'Eccentric Output Shaft',
        category: 'POWER OUTPUT // HIGH-STRENGTH ALLOY SHAFT',
        nominalStatus: 'NOMINAL',
        inspectText: 'High-alloy eccentric shaft translating triangular rotor orbit into high-speed rotational shaft torque directly to propeller hub.',
        actionNominal: 'Verify rotor bearing oil pressure and thrust washer float.',
        actionFault: 'Check journal bearing wear index and evaluate magnetic chip detector.'
      }
    }
  },

  TURBO_INLINE_V: {
    id: 'TURBO_INLINE_V',
    displayName: 'Turbocharged / Supercharged Multi-Cylinder Inline or V Engine',
    shortName: 'Turbocharged Inline/V',
    categoryBadge: 'FORCED INDUCTION // TURBOCHARGED & INTERCOOLED',
    icon: '🌀',
    silhouette: 'turbo',
    architecture: 'reciprocating_forced_induction',
    cylinderCount: 4,
    hasPistons: true,
    hasRotor: false,
    hasTurbocharger: true,
    fuelType: 'Aviation Gasoline (Avgas 100LL) / High-Octane Blend',
    description: 'Multi-cylinder inline or V-style engine with forced induction to sustain intake pressure and available power at altitude.',
    strengths: [
      'Better high-altitude power retention at MALE operational ceilings (15k - 30k ft)',
      'Suitable for high-altitude MALE mission profiles requiring full takeoff power at elevation',
      'Adjustable boost and manifold-pressure control via electronic wastegate'
    ],
    tradeOffs: [
      'Added turbocharger/supercharger complexity and higher component count',
      'Additional thermal load on oil cooler, intercooler, and cylinder heads',
      'More failure modes in boost, lubrication, and charge air-path systems'
    ],
    monitoringFocus: 'Compressor boost pressure, electronic wastegate actuator position, intercooler heat rejection efficiency, and turbocharger bearing oil feed temperature.',
    relevantMission: 'High-altitude loiter (FL200 - FL280) and rapid climb reconnaissance sorties requiring sustained high-altitude engine power.',
    specialViews: [
      { id: 'boost_path', label: 'Boost Path & Intercooler View', icon: '🌀', desc: 'Compressor wheel spool, charge air heat dissipation, and plenum pressure' },
      { id: 'altitude_retention', label: 'High-Altitude Power Retention', icon: '🏔️', desc: 'Wastegate duty modulation maintaining sea-level manifold pressure up to FL250' }
    ],
    damageWeights: { thermal: 0.35, turbo: 0.30, lube: 0.20, vibration: 0.15 },
    normalRanges: {
      rpm: { min: 1400, max: 5800, nominal: 5400, unit: 'RPM' },
      throttle: { min: 0, max: 100, nominal: 82, unit: '%' },
      boost_pressure: { min: 0.0, max: 1.45, nominal: 0.95, unit: 'bar' },
      manifold_pressure: { min: 650, max: 1850, nominal: 1420.0, unit: 'hPa' },
      turbo_speed_pct: { min: 0, max: 120, nominal: 84, unit: '%' },
      iat: { min: 15, max: 75, nominal: 42.5, unit: '°C' },
      intercooler_eff: { min: 60, max: 98, nominal: 88.0, unit: '%' },
      cht: { min: 85, max: 135, nominal: 114.2, unit: '°C' },
      egt: { min: 700, max: 920, nominal: 815.0, unit: '°C' },
      oil_pressure: { min: 3.0, max: 6.0, nominal: 4.4, unit: 'bar' },
      oil_temp: { min: 75, max: 125, nominal: 104.0, unit: '°C' },
      fuel_flow: { min: 20.0, max: 58.0, nominal: 44.5, unit: 'L/h' },
      vibration: { min: 0.18, max: 0.90, nominal: 0.46, unit: 'g RMS' },
      health_score: { min: 0, max: 100, nominal: 90, unit: '%' },
      rul: { min: 0, max: 400, nominal: 192.0, unit: 'hrs' }
    },
    telemetryProfile: [
      { key: 'rpm', label: 'Engine Speed', unit: 'RPM', category: 'speed' },
      { key: 'throttle', label: 'Throttle Demand', unit: '%', category: 'control' },
      { key: 'boost_pressure', label: 'Turbo Boost Pressure', unit: 'bar', category: 'turbo' },
      { key: 'manifold_pressure', label: 'Manifold Air Press (MAP)', unit: 'hPa', category: 'turbo' },
      { key: 'turbo_speed_pct', label: 'Turbo Shaft Spool Speed', unit: '%', category: 'turbo' },
      { key: 'iat', label: 'Charge Air Temp (IAT)', unit: '°C', category: 'thermal' },
      { key: 'intercooler_eff', label: 'Intercooler Heat Tx', unit: '%', category: 'turbo' },
      { key: 'cht', label: 'Peak Cylinder CHT', unit: '°C', category: 'thermal' },
      { key: 'egt', label: 'Turbine Inlet EGT', unit: '°C', category: 'thermal' },
      { key: 'oil_press', label: 'Turbo & Engine Oil Press', unit: 'bar', category: 'lube' },
      { key: 'oil_temp', label: 'Oil Sump Temp', unit: '°C', category: 'thermal' },
      { key: 'fuel_flow', label: 'Fuel Flow Rate', unit: 'L/h', category: 'fuel' },
      { key: 'vibration', label: 'Vibration RMS', unit: 'g RMS', category: 'vib' },
      { key: 'health_score', label: 'Overall Propulsion Health', unit: '%', category: 'health' },
      { key: 'rul', label: 'Estimated RUL', unit: 'hrs', category: 'rul' }
    ],
    supportedFaults: [
      { id: 'boost_leak', name: 'Charge Air Boost Pipe Leak', desc: 'Coupling clamp looseness causing manifold pressure drop and over-fueling', unit: '%' },
      { id: 'turbo_overspeed', name: 'Turbocharger Impeller Over-Speed', desc: 'Extreme high-altitude throttle without adequate wastegate bleed', unit: '%' },
      { id: 'turbo_bearing_fault', name: 'Turbo Center Bearing / Oil Starvation', desc: 'Bearing coke buildup causing friction and spool lag', unit: '%' },
      { id: 'wastegate_fault', name: 'Electronic Wastegate Actuator Sticking', desc: 'Servo motor binding leading to underboost or overboost', unit: '%' },
      { id: 'intercooler_degradation', name: 'Intercooler Heat Rejection Loss', desc: 'Cooling fin blockage driving charge air temperature up', unit: '%' },
      { id: 'overboost', name: 'Dangerous Overboost Exceedance', desc: 'Exceeding structural MAP limit (> 1850 hPa)', unit: '%' },
      { id: 'exhaust_overtemp', name: 'Turbine Housing Over-Temperature', desc: 'Excessive turbine inlet temperature threatening turbine wheel life', unit: '%' },
      { id: 'low_oil_pressure', name: 'Low Oil Lubrication Pressure', desc: 'Threatens high-speed hydrodynamic turbo shaft bearings', unit: '%' },
      { id: 'sensor_drift', name: 'MAP / Boost Pressure Sensor Drift (Purple)', desc: 'Dual-sensor disparity in manifold pressure reading', unit: '%' }
    ],
    inspectionComponents: {
      'TurboCompressor': {
        name: 'Centrifugal Compressor Assembly',
        category: 'FORCED INDUCTION // MILLED BILLET WHEEL',
        nominalStatus: 'NOMINAL (Spooling at 145,000 RPM equivalent)',
        inspectText: 'Precision milled billet aluminum compressor wheel drawing ambient air and delivering up to 1.45 bar boost pressure.',
        actionNominal: 'Inspect compressor wheel leading edges for FOD erosion.',
        actionFault: 'Check axial and radial bearing play; verify charge pipe silicone coupler clamp torque.'
      },
      'TurbineHousing': {
        name: 'High-Temperature Turbine Housing',
        category: 'EXHAUST EXPANSION // NICKEL-RESIST ALLOY',
        nominalStatus: 'NOMINAL',
        inspectText: 'Inconel/nickel-resist alloy turbine housing driven by high-temperature engine exhaust gas up to 920°C.',
        actionNominal: 'Inspect housing for thermal fatigue micro-cracks.',
        actionFault: 'Borescope inspection of turbine wheel blades; verify exhaust gasket sealing.'
      },
      'WastegateActuator': {
        name: 'Electronic Wastegate Servo Actuator',
        category: 'BOOST CONTROL // CLOSED-LOOP FADEC ACTUATION',
        nominalStatus: 'NOMINAL',
        inspectText: 'High-torque electronic stepper actuator modulating the wastegate flapper valve to maintain target manifold pressure across altitudes.',
        actionNominal: 'Run actuator sweep calibration test during pre-flight.',
        actionFault: 'Inspect linkage arm ball joints and perform electronic calibration zero-reset.'
      },
      'Intercooler': {
        name: 'Air-to-Air Charge Cooler (Intercooler)',
        category: 'HEAT EXCHANGER // BAR & PLATE ALUMINUM',
        nominalStatus: 'NOMINAL (88% effectiveness)',
        inspectText: 'High-efficiency bar-and-plate aluminum heat exchanger reducing charge air temperature from 135°C down to 42°C.',
        actionNominal: 'Inspect cooling duct intake for insect or dust accumulation.',
        actionFault: 'Pressure test core for internal pinhole leaks; clean external cooling fins.'
      },
      'BoostPiping': {
        name: 'Reinforced Silicone & Aluminum Boost Pipe',
        category: 'CHARGE AIR DUCTING // 4-PLY REINFORCED',
        nominalStatus: 'NOMINAL',
        inspectText: 'Mandrel-bent aluminum boost ducting with 4-ply reinforced fluoro-silicone couplers and constant-torque clamps.',
        actionNominal: 'Inspect clamp tightness and verify absence of oil pooling.',
        actionFault: 'Smoke-test charge air circuit to isolate boost leakage point.'
      },
      'CompressorHousing': {
        name: 'Centrifugal Compressor Housing & Scroll',
        category: 'FORCED INDUCTION // COLD SIDE SCROLL',
        nominalStatus: 'NOMINAL (Cold Side)',
        inspectText: 'Cast aluminium compressor housing delivering charged air to the intercooler plenum under electronic wastegate control.',
        actionNominal: 'Inspect inlet duct silicone seal and compressor inducer lip.',
        actionFault: 'Borescope inspection of compressor impeller vanes for erosion or foreign object damage.'
      },
      'Wastegate': {
        name: 'Electronic Wastegate Actuator',
        category: 'BOOST CONTROL // ELECTRONIC STEPPER ACTUATOR',
        nominalStatus: 'NOMINAL (FADEC Controlled)',
        inspectText: 'High-speed electronic wastegate servo regulating turbine bypass flow to maintain target manifold absolute pressure.',
        actionNominal: 'Verify stepper calibration zero and linkage travel.',
        actionFault: 'Inspect linkage arm spherical bearings for binding; check FADEC drive current.'
      },
      'ThrottleBody': {
        name: 'Electronic Drive-by-Wire Throttle Body',
        category: 'AIR INDUCTION // ELECTRONIC THROTTLE',
        nominalStatus: 'NOMINAL',
        inspectText: 'Precision dual-potentiometer drive-by-wire throttle controlling mass airflow downstream of the charge intercooler.',
        actionNominal: 'Perform throttle sweep position verification during pre-flight BIT.',
        actionFault: 'Clean throttle bore deposits and test return spring tension.'
      },
      'BOV': {
        name: 'Recirculating Diverter / Blow-Off Valve',
        category: 'BOOST CIRCUIT // COMPRESSOR SURGE PROTECTION',
        nominalStatus: 'NOMINAL',
        inspectText: 'Pneumatically-piloted diverter valve preventing compressor stall and surge shockwaves during rapid throttle reduction.',
        actionNominal: 'Check vacuum reference line integrity and diaphragm seal.',
        actionFault: 'Disassemble and lubricate piston seal; inspect bypass return duct.'
      },
      'ExhaustManifold': {
        name: '4-into-1 High-Temperature Exhaust Collector',
        category: 'EXHAUST SYSTEM // TURBINE FEED',
        nominalStatus: 'NOMINAL',
        inspectText: 'Tuned 4-into-1 stainless alloy exhaust manifold channeling high-enthalpy pulse energy directly into the turbine housing.',
        actionNominal: 'Inspect exhaust port flange gaskets and EGT probe fittings.',
        actionFault: 'Check for thermal fatigue micro-cracking and verify turbine flange torque.'
      },
      'EngineBlock': {
        name: 'Turbocharged Inline-4 Cylinder Block',
        category: 'STRUCTURAL MONOBLOCK // HIGH-PRESSURE ALLOY',
        nominalStatus: 'NOMINAL',
        inspectText: 'Reinforced cast aluminium block with integrated cast-in iron liners designed for forced-induction cylinder pressures.',
        actionNominal: 'Monitor crankcase blowby pressure and main oil gallery pressure.',
        actionFault: 'Check crankcase breather valve and verify cylinder compression ratios.'
      },
      'CylinderHead': {
        name: 'DOHC 4-Valve Turbo Cylinder Head',
        category: 'COMBUSTION ZONE // HIGH-FLOW HEAD',
        nominalStatus: 'NOMINAL',
        inspectText: 'High-flow DOHC cylinder head with dual camshafts, 4 valves per cylinder, sodium-filled exhaust valves, and central direct spark ignition.',
        actionNominal: 'Check valve clearance and camshaft journal bearing oil supply.',
        actionFault: 'Inspect valve seats and check spark plug ceramic insulator integrity.'
      },
      'OilSump': {
        name: 'Reinforced Dry Sump Pan',
        category: 'LUBRICATION // SCAVENGE & RESERVOIR',
        nominalStatus: 'NOMINAL',
        inspectText: 'Baffled structural oil pan with multi-stage scavenge pickup ensuring positive oil delivery to turbo shaft bearings under tactical g-loads.',
        actionNominal: 'Check magnetic drain plug and monitor scavenge pressure delta.',
        actionFault: 'Inspect scavenge screen for debris; check oil return line couplings.'
      },
      'ECU': {
        name: 'Dual-Channel FADEC Engine Control Unit',
        category: 'AVIONICS & CONTROL // CLOSED-LOOP FADEC',
        nominalStatus: 'NOMINAL',
        inspectText: 'Fault-tolerant dual-channel electronic engine control unit orchestrating wastegate servo position, fuel trim, and ignition timing.',
        actionNominal: 'Verify CAN-bus telemetry link and health diagnostics registers.',
        actionFault: 'Check fault error codes in non-volatile memory; verify sensor harness connector seating.'
      },
      'Alternator': {
        name: 'Engine-Driven 28V Tactical Alternator',
        category: 'ELECTRICAL POWER // 28V DC BUS',
        nominalStatus: 'NOMINAL (28.0V Bus Steady)',
        inspectText: 'High-output engine-driven alternator providing continuous electrical power to the UAV avionics bus, FADEC, and digital twin node.',
        actionNominal: 'Verify voltage regulator output stability under heavy payload electrical draw.',
        actionFault: 'Inspect drive belt tension and test alternator stator winding resistance.'
      },
      'OilFilter': {
        name: 'Full-Flow Spin-On Oil Filter & Bypass',
        category: 'LUBRICATION // FILTRATION & COOLING',
        nominalStatus: 'NOMINAL',
        inspectText: 'Micro-glass synthetic media full-flow filter with internal pressure relief bypass protecting high-speed turbocharger journal bearings.',
        actionNominal: 'Inspect differential pressure indicator and verify oil filter torque.',
        actionFault: 'Replace filter element; perform spectrographic oil analysis for bearing metal wear particles.'
      }
    }
  }
};

// Global export
if (typeof window !== 'undefined') {
  window.ENGINE_ARCHITECTURES = ENGINE_ARCHITECTURES;
  window.VISUALIZATION_LAYERS = VISUALIZATION_LAYERS;
}
