# MALE UAV Aero Piston Engine Digital Twin System

A complete, production-ready, modular, and scalable **Digital Twin System for Aero Piston Propulsion Systems** in Medium-Altitude Long-Endurance (MALE) Unmanned Aerial Vehicles (e.g., Rotax 914/915/916 iS and Austro Engine AE300/330 class turbocharged boxer/inline engines).

---

## 1. System Architecture Overview

```
                                  +-------------------------------------------------------------+
                                  |                 MALE UAV ONBOARD SENSORS / CAN              |
                                  | (RPM, MAP, EGT 1-4, CHT 1-4, Oil T/P, Fuel P/Flow, Alt, OAT)|
                                  +------------------------------+------------------------------+
                                                                 |
                                              [CANaerospace / ARINC 825 / UDP Stream]
                                                                 v
+-------------------------------------------------------------------------------------------------------------------------------+
|                                                DIGITAL TWIN CORE FRAMEWORK                                                    |
|                                                                                                                               |
|   +--------------------------+       +-------------------------------+       +--------------------------------------------+   |
|   |   DATA INGESTION LAYER   | ----> |    SYNCHRONIZATION & EKF      | <---> |       PHYSICS & THERMODYNAMIC ENGINE       |   |
|   | - CAN Frame Decoders     |       | - State Estimation (x_hat)    |       | - ISA Atmosphere Model (up to 30,000 ft)   |   |
|   | - Jitter & Outlier Filter|       | - Parameter Tracking (theta)  |       | - Turbocharger & Wastegate Dynamic Model   |   |
|   | - Unit Normalization     |       | - Innovation Residuals (r(t)) |       | - Intercooler / Charge Air Cooler Heat Tx  |   |
|   +--------------------------+       +---------------+---------------+       | - 0D/1D Mean Value Engine Model (MVEM)     |   |
|                                                      |                       | - Lumped CHT / Oil / Coolant Thermal ODEs  |   |
|                                                      |                       | - Performance Maps (BSFC, VolEff, CompMap) |   |
|                                                      v                       +--------------------------------------------+   |
|                                      +---------------+---------------+                                                        |
|                                      |   DIAGNOSTIC & HEALTH ENGINE  |                                                        |
|                                      | - CS-E/FAR-33 Exceedance Check|                                                        |
|                                      | - Mahalanobis Residual Scoring|                                                        |
|                                      | - Fault Isolation Matrix (FIM)|                                                        |
|                                      | - Cylinder Balance / Misfires |                                                        |
|                                      +---------------+---------------+                                                        |
|                                                      |                                                                        |
|                                                      v                                                                        |
|                                      +---------------+---------------+                                                        |
|                                      |  AI/ML PROGNOSTICS & RUL CORE |                                                        |
|                                      | - Archard Cylinder Liner Wear |                                                        |
|                                      | - Valve Thermal Fatigue (Arr) |                                                        |
|                                      | - Oil Viscosity / Aging Index |                                                        |
|                                      | - Weibull / LSTM Hazard Model |                                                        |
|                                      | - Remaining Useful Life (RUL) |                                                        |
|                                      +-------------------------------+                                                        |
|                                                                                                                               |
+-------------------------------------------------------------------------------------------------------------------------------+
       |                                                 |                                                    |
       v                                                 v                                                    v
+-----------------------------+       +-------------------------------------+       +-----------------------------------------+
|   SIMULATION & SCENARIOS    |       |      REAL-TIME FASTAPI SERVER       |       |       POST-FLIGHT & REPLAY ENGINE       |
| - MALE Mission Profiles     |       | - Asynchronous REST API Endpoints   |       | - Telemetry Flight Recorder & Parser    |
| - Environmental ISA Shifts  | ----> | - High-Speed WebSocket (10-50 Hz)   | <---- | - Exceedance & Damage Log Generator     |
| - Dynamic Fault Injection   |       | - State Broadcast & RPC Dispatcher  |       | - Interactive Mission Scrubber & Replay |
+-----------------------------+       +------------------+------------------+       +-----------------------------------------+
                                                         |
                                                         v
                                      +-------------------------------------+
                                      |     AEROSPACE DIGITAL TWIN UI       |
                                      | - Cockpit Telemetry HUD & Gauges    |
                                      | - 3D/Interactive Engine Thermal Map |
                                      | - Real-Time Live vs Twin Comparison |
                                      | - Fault Diagnostic & RUL Breakdown  |
                                      | - Mission Simulator & Fault Trigger |
                                      | - Flight Log Replayer & Report View |
                                      +-------------------------------------+
```

---

## 2. Directory Structure

```
aero/
├── config/
│   ├── engine_specs_rotax915.yaml        # Complete physical parameters (1352cc, 4-cyl boxer, 141 hp @ 5800 RPM)
│   ├── flight_profiles.yaml              # MALE UAV mission profiles (Standard ISR 18h, FL250 Recon, Hot & High)
│   └── fault_definitions.yaml            # Fault symptom signatures & thresholds
├── src/
│   ├── core/
│   │   ├── types.py                      # Strongly typed Pydantic v2 schemas (SensorFrame, TwinState, HealthStatus, RUL)
│   │   ├── config.py                     # YAML configuration parser & validator
│   │   └── registry.py                   # Extensible plugin registry for custom sensors, models, and fault models
│   ├── ingestion/
│   │   ├── can_interface.py              # CANaerospace / ARINC 825 / UAVCAN frame packing & decoding
│   │   ├── stream_processor.py           # Sliding-window buffer, jitter correction, and rate-of-change filter
│   │   └── synthetic_streamer.py         # Hardware-in-the-Loop telemetry synthesizer with sensor noise
│   ├── physics/
│   │   ├── atmosphere.py                 # ISA standard atmosphere model (T, P, rho, a up to 30,000 ft)
│   │   ├── thermodynamic_model.py        # 0D/1D Mean Value Engine Model (Otto cycle, indicated work, MEP, BSFC)
│   │   ├── turbocharger.py               # Turbocharger compressor, turbine, electronic wastegate, and intercooler
│   │   ├── thermal_circuits.py           # Lumped thermal ODEs for CHT (cyl 1-4), oil sump, coolant jacket
│   │   └── propeller.py                  # Constant-speed governor, advance ratio J, and aerodynamic load torque
│   ├── maps/
│   │   ├── interpolator.py               # 1D/2D fast bilinear lookup table interpolator
│   │   └── performance_maps.py           # Volumetric efficiency, BSFC, Compressor efficiency, and Timing maps
│   ├── synchronization/
│   │   ├── kalman_filter.py              # Continuous-Discrete EKF for real-time live synchronization
│   │   └── parameter_tracker.py          # Adaptive observer for component degradation parameter tracking
│   ├── health/
│   │   ├── threshold_monitor.py          # CS-E / FAR-33 aero engine limit exceedance monitor
│   │   ├── anomaly_detector.py           # Mahalanobis distance & CUSUM residual anomaly detector
│   │   ├── cylinder_balance.py           # Cylinder-to-cylinder balance, EGT spread, misfire analyzer
│   │   └── fault_isolator.py             # Fault Isolation Matrix (FIM) mapping signatures to root causes
│   ├── predictive/
│   │   ├── wear_models.py                # Piston ring/liner Archard wear, valve thermal fatigue, oil breakdown
│   │   ├── rul_estimator.py              # Physics-informed Weibull & ML-based RUL and TTF forecaster
│   │   └── ml_pipeline.py                # Degradation dataset generator, feature extractor, and regression model
│   ├── simulation/
│   │   ├── mission_simulator.py          # Full mission execution engine (Taxi -> Climb -> Cruise -> Loiter -> Descent)
│   │   └── fault_injector.py             # Dynamic fault injection harness (wastegate stick, injector drift, etc.)
│   ├── postflight/
│   │   ├── flight_recorder.py            # High-rate blackbox flight data recorder
│   │   ├── log_parser.py                 # Flight log parser and integrity validator
│   │   ├── damage_accumulator.py         # Equivalent operating hours & cumulative fatigue counter
│   │   └── mission_replayer.py           # Interactive flight playback with timeline seeking and speed control
│   └── api/
│       ├── server.py                     # FastAPI REST API & WebSocket server
│       ├── routes.py                     # Endpoints for telemetry, twin state, diagnostics, simulation, replay
│       └── ws_manager.py                 # Real-time WebSocket connection and telemetry broadcast manager
├── frontend/
│   ├── index.html                        # Aerospace Digital Twin Cockpit UI application
│   ├── css/
│   │   └── style.css                     # Aerospace HUD / Dark theme styling, glassmorphic panels, gauge styles
│   └── js/
│       ├── app.js                        # UI Controller, WebSocket client, state manager
│       ├── gauges.js                     # High-performance Canvas aviation gauges (RPM, MAP, EGT, CHT, OP, OT)
│       ├── charts.js                     # Synced real-time dual-series charts (Live vs Twin vs Residual)
│       ├── engine3d.js                   # Interactive Engine 2.5D/3D cutaway schematic with live thermal heatmap
│       ├── diagnostics_view.js           # Fault Isolation Matrix, health status, and RUL decay forecast
│       └── replay_view.js                # Mission playback scrubber, flight logs viewer, and export tools
├── tests/                                # Full pytest test suite (23 unit & integration tests)
├── requirements.txt                      # Dependencies
└── run.py                                # One-click unified launcher
```

---

## 3. Mathematical Formulations

### 3.1 Mean Value Thermodynamic Engine Model (0D/1D MVEM)
- **Trapped Air Mass Flow Rate**:
  $$\dot{m}_{air} = \eta_v(N, P_{man}) \cdot \left(\frac{V_d \cdot N}{120}\right) \cdot \left(\frac{P_{man}}{R \cdot T_{man}}\right)$$
- **Fuel Mass Flow Rate**:
  $$\dot{m}_f = \frac{\dot{m}_{air}}{\lambda \cdot AFR_{stoich}}$$
- **Indicated Power**:
  $$P_i = \dot{m}_f \cdot LHV \cdot \eta_i$$
- **Friction Mean Effective Pressure (Chen-Flynn model)**:
  $$FMEP = A + B \cdot P_{max} + C \cdot S_p + D \cdot S_p^2 \quad \text{where } S_p = 2 \cdot L_{stroke} \cdot \frac{N}{60}$$
- **Brake Power & Torque**:
  $$P_e = P_i - P_{fric}, \quad T_e = \frac{P_e}{\omega}$$
- **Brake Specific Fuel Consumption (BSFC)**:
  $$BSFC = \frac{\dot{m}_f \cdot 3600 \cdot 1000}{P_e / 1000} \quad [\text{g/kWh}]$$

### 3.2 Turbocharger & Intercooler (CAC)
- **Compressor Discharge Temperature**:
  $$T_{c,out} = T_{amb} \cdot \left[1 + \frac{1}{\eta_c} \left(\Pi_c^{\frac{\gamma-1}{\gamma}} - 1\right)\right]$$
- **Intercooler Heat Exchange**:
  $$T_{man} = T_{c,out} - \epsilon_{CAC} \cdot (T_{c,out} - T_{amb})$$

### 3.3 Continuous-Discrete Extended Kalman Filter (EKF)
- **State Vector** ($\mathbf{x} \in \mathbb{R}^8$):
  $$\mathbf{x} = [P_{man}, T_{man}, T_{cyl,1}, T_{cyl,2}, T_{cyl,3}, T_{cyl,4}, T_{oil}, \theta_{wear}]^T$$
- **Innovation Residual Vector**:
  $$\mathbf{r}_k = \mathbf{y}_k - \mathbf{H} \hat{\mathbf{x}}_k^-$$
- **Mahalanobis Anomaly Distance**:
  $$D_M(\mathbf{r}) = \sqrt{\mathbf{r}^T \mathbf{S}^{-1} \mathbf{r}}$$

### 3.4 Predictive Subsystem Wear & Remaining Useful Life (RUL)
- **Piston Ring / Cylinder Liner Wear (Archard's Law)**:
  $$W_{liner} = k_{wear} \cdot \int (N)^{1.8} \cdot (P_{man})^{1.5} \cdot \exp(0.04 \cdot (T_{CHT} - 120)) \, dt$$
- **Exhaust Valve Thermal Fatigue (Arrhenius Law)**:
  $$D_{valve} = \int \exp\left(-\frac{E_a}{R \cdot T_{EGT}(t)}\right) \, dt$$
- **Weibull Subsystem Survival & RUL Estimation**:
  $$R(t) = \exp\left(-\left(\frac{t}{\eta}\right)^\beta\right), \quad RUL_{P10} = RUL_{nominal} \cdot (1 - 1.28 \sigma)$$

---

## 4. How the Virtual Model Stays Synchronized with Live Data

```
   [Onboard Sensors / CAN]  ---- y_meas(t) ----+
                                               |
                                               v
   [Virtual Physics Twin]   ---- y_pred(t) ---> [Innovation Residual r(t) = y_meas - y_pred]
                                               |
                                               v
                                        [EKF State Update & Gain K]
                                               |
                                               +---> Synchronized Twin State (x_hat)
                                               |
                                               +---> Parameter Tracking (eta_vol_trim, CAC_fouling)
                                               |
                                               +---> Mahalanobis Anomaly Index & FIM
```
1. **High-Frequency Innovation Calculation**: At every telemetry frame ($10\text{--}50\text{ Hz}$), the virtual thermodynamic engine model computes nominal expectations for manifold pressure, charge temperature, cylinder CHTs/EGTs, and oil temperature based on current power lever angle, engine speed, and altitude.
2. **Measurement Residual Vector**: Innovation residuals $\mathbf{r}(t) = \mathbf{y}_{meas}(t) - \mathbf{y}_{pred}(t)$ are calculated in real time.
3. **Adaptive State Correction**: The Extended Kalman Filter uses measurement noise covariance $\mathbf{R}$ and process covariance $\mathbf{Q}$ to update the state estimate $\hat{\mathbf{x}}_k$ without numerical divergence.
4. **Adaptive Observer Tracking**: Slow model biases (e.g., air filter restriction or intercooler dust fouling) are tracked via exponential forgetting to prevent model drift while preserving sensitivity to sudden faults.

---

## 5. Deployment Considerations: Edge vs Ground Control Station (GCS)

| Layer | Deployment Location | Execution Environment | Key Responsibilities |
|---|---|---|---|
| **Edge Core (Onboard UAV)** | Onboard Avionics Companion Computer (e.g., NVIDIA Jetson / Raspberry Pi CM4 / ARM Cortex-A53) | C/Python lightweight runner | - CAN bus frame ingestion (`0x200` to `0x206`)<br>- Real-time EKF state synchronization (50 Hz)<br>- Level-1 threshold limit & rapid misfire alerts<br>- Binary blackbox flight data recording |
| **GCS Digital Twin Engine** | UAV Ground Control Station (GCS) / Mission Operations Center | Python FastAPI + WebSocket server | - High-fidelity 0D/1D thermodynamic cycle model<br>- Fault Isolation Matrix (FIM) & diagnostic engine<br>- Real-time AI/ML wear & RUL prediction<br>- Telemetry down-link stream decoding |
| **GCS Cockpit Dashboard** | Pilot & Flight Engineer Workstations | Modern Browser (HTML5 Canvas / SVG) | - Real-time cockpit telemetry HUD & gauges<br>- Interactive 2.5D/3D thermal heatmap cutaway<br>- Live vs Twin dual-trace comparison charts<br>- Dynamic in-flight fault injection deck<br>- Post-flight mission replay scrubber & damage report |

---

## 6. Quickstart & Operation

### 1. Requirements
- Python 3.10+ (tested on Python 3.14)
- Dependencies installed via `requirements.txt`:
  ```bash
  pip install -r requirements.txt
  ```

### 2. Run Automated Test Suite
```bash
python -m pytest tests -v
```
All 23 unit and integration tests will execute, validating physics ODEs, EKF tracking, fault isolation, RUL estimation, and API endpoints.

### 3. Launch Digital Twin System
```bash
python run.py --port 8000
```
Open your browser and navigate to:
```
http://localhost:8000
```

### 4. Interactive Operations
- **Live Cockpit**: Observe real-time RPM, MAP, Fuel Flow, Oil Temp/Press, and Bus Voltage gauges streaming at 10 Hz over WebSocket.
- **Engine Thermal Cutaway**: Click on any cylinder (1-4) on the interactive schematic to inspect cylinder thermodynamic temperatures and spark balance.
- **Dual-Trace Graphs**: Switch between MAP, RPM, CHT, EGT, and Oil Temp channels to view real-time Live vs Twin vs Residual divergence.
- **Fault Injection**: Click any fault injection button (e.g., *⚡ Cyl #2 Injector Clog* or *⚡ Wastegate Stuck Open*) to observe real-time anomaly detection, CUSUM drift, and Fault Isolation Matrix (FIM) root-cause identification with confidence percentages.
- **Mission Replay**: Click the *📼 POST-FLIGHT REPLAY & DAMAGE LOG* tab, load demo flight telemetry, scrub through the flight timeline, and review equivalent operating hours (EOH) and exceedance reports.

---

## 7. Next Steps & Roadmap

1. **Hardware-in-the-Loop (HIL) Integration**: Connect physical CAN transceiver (e.g. PEAK-System PCAN-USB or SocketCAN) directly to `CANBusDecoder` for bench testing with physical UAV engine ECUs.
2. **Multi-Engine Support**: Extend twin manager to support twin-engine MALE configurations (e.g. Hermes 900 / Heron TP dual nacelles) with synchronized differential power tracking.
3. **Deep Reinforcement Learning Optimization**: Add autonomous ECU trim optimizer recommending continuous fuel-lean-of-peak cruise points for maximum loiter endurance.
4. **Cloud Fleet-Wide Prognostics**: Aggregate post-flight JSONL flight logs across multiple UAV airframes into a centralized fleet reliability database for fleet-wide Weibull failure rate updating.
