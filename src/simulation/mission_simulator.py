"""Central Digital Twin Mission Simulator and Execution Engine."""

import time
import math
from typing import Dict, Any, Optional, List, Tuple
from src.core.types import (
    SensorFrame,
    TwinThermodynamicState,
    InnovationResiduals,
    HealthStatus,
    SubsystemRUL,
    SimulationState,
    UnifiedTwinPacket,
    HealthSeverity,
)
from src.physics.atmosphere import AtmosphereISA
from src.physics.turbocharger import TurbochargerModel
from src.physics.thermal_circuits import ThermalCircuitsModel
from src.physics.thermodynamic_model import ThermodynamicEngineModel
from src.physics.propeller import PropellerModel
from src.maps.performance_maps import PerformanceMapsEngine
from src.ingestion.synthetic_streamer import SyntheticTelemetryStreamer
from src.ingestion.stream_processor import StreamProcessor
from src.synchronization.kalman_filter import EngineExtendedKalmanFilter
from src.synchronization.parameter_tracker import AdaptiveParameterTracker
from src.health.threshold_monitor import ThresholdMonitor
from src.health.cylinder_balance import CylinderBalanceAnalyzer
from src.health.anomaly_detector import ResidualAnomalyDetector
from src.health.fault_isolator import FaultIsolator
from src.predictive.wear_models import SubsystemWearModels
from src.predictive.rul_estimator import RemainingUsefulLifeEstimator
from src.predictive.ml_pipeline import DegradationMLPipeline
from src.simulation.fault_injector import FaultInjector


class MissionSimulator:
    """Orchestrates end-to-end simulation, twin synchronization, diagnostics, and prognostics."""

    def __init__(self, flight_profiles: Optional[Dict[str, Any]] = None):
        self.flight_profiles = flight_profiles or {}
        
        # Sub-systems
        self.streamer = SyntheticTelemetryStreamer()
        self.processor = StreamProcessor()
        self.maps = PerformanceMapsEngine()
        self.thermo = ThermodynamicEngineModel()
        self.turbo = TurbochargerModel()
        self.thermal = ThermalCircuitsModel()
        self.prop = PropellerModel()
        self.ekf = EngineExtendedKalmanFilter()
        self.param_tracker = AdaptiveParameterTracker()
        self.threshold_mon = ThresholdMonitor()
        self.balance_analyzer = CylinderBalanceAnalyzer()
        self.anomaly_detector = ResidualAnomalyDetector()
        self.fault_isolator = FaultIsolator()
        self.wear_model = SubsystemWearModels()
        self.rul_estimator = RemainingUsefulLifeEstimator(self.wear_model)
        self.ml_pipeline = DegradationMLPipeline()
        self.fault_injector = FaultInjector()

        # Mission state
        self.current_mission_id = "standard_isr_18h"
        self.phases = self._load_phases(self.current_mission_id)
        self.phase_index = 0
        self.phase_elapsed_s = 0.0
        self.mission_elapsed_s = 0.0
        
        # Control flags
        self.is_running = True
        self.is_paused = False
        self.time_scale = 1.0

        # Manual overrides (if user controls directly from UI)
        self.manual_override = False
        self.manual_throttle_pct = 65.0
        self.manual_altitude_m = 3000.0
        self.manual_airspeed_kts = 85.0
        self.manual_oat_c = 15.0

        # Latest generated unified packet
        self.latest_packet: Optional[UnifiedTwinPacket] = None

    def _load_phases(self, mission_id: str) -> List[Dict[str, Any]]:
        """Loads flight profile phase sequence."""
        if mission_id in self.flight_profiles:
            return self.flight_profiles[mission_id].get("phases", [])
        
        # Default fallback phases
        return [
            {"name": "Engine Warmup & Taxi", "duration_s": 120, "throttle_pct": 20.0, "altitude_m": 100.0, "airspeed_kts": 15.0},
            {"name": "Takeoff Run & Climb", "duration_s": 180, "throttle_pct": 100.0, "altitude_m": 1500.0, "airspeed_kts": 80.0},
            {"name": "Climb to FL180", "duration_s": 600, "throttle_pct": 88.0, "altitude_m": 5486.0, "airspeed_kts": 90.0},
            {"name": "Long-Endurance Loiter", "duration_s": 3600, "throttle_pct": 58.0, "altitude_m": 5486.0, "airspeed_kts": 80.0},
            {"name": "Descent & Approach", "duration_s": 400, "throttle_pct": 32.0, "altitude_m": 300.0, "airspeed_kts": 75.0},
        ]

    def set_mission(self, mission_id: str):
        self.current_mission_id = mission_id
        self.phases = self._load_phases(mission_id)
        self.phase_index = 0
        self.phase_elapsed_s = 0.0
        self.mission_elapsed_s = 0.0
        self.manual_override = False

    def step(self, dt_real_s: float = 0.1) -> UnifiedTwinPacket:
        """Executes one simulation tick, synchronizing live telemetry with Digital Twin."""
        dt = dt_real_s * self.time_scale if not self.is_paused else 0.0
        self.mission_elapsed_s += dt
        self.phase_elapsed_s += dt

        # 1. Determine Current Flight Flight Envelope Conditions
        if not self.manual_override and self.phases:
            curr_phase = self.phases[self.phase_index]
            if self.phase_elapsed_s > curr_phase.get("duration_s", 300):
                if self.phase_index < len(self.phases) - 1:
                    self.phase_index += 1
                    self.phase_elapsed_s = 0.0
                    curr_phase = self.phases[self.phase_index]

            throttle_pct = curr_phase.get("throttle_pct", 60.0)
            altitude_m = curr_phase.get("altitude_m", 2000.0)
            airspeed_kts = curr_phase.get("airspeed_kts", 80.0)
            phase_name = curr_phase.get("name", "Flight Phase")
        else:
            throttle_pct = self.manual_throttle_pct
            altitude_m = self.manual_altitude_m
            airspeed_kts = self.manual_airspeed_kts
            phase_name = "Manual Pilot Control"

        # 2. Ambient Atmosphere at Altitude
        atmo = AtmosphereISA.get_state(altitude_m)
        ambient_press_hpa = atmo["pressure_hpa"]
        ambient_temp_c = atmo["temperature_c"] if not self.manual_override else self.manual_oat_c

        # 3. Active Fault Injections
        active_faults = self.fault_injector.get_active_faults(self.mission_elapsed_s)

        # 4. Generate Ingested Sensor Telemetry (with sensor noise & injected faults)
        raw_sensor = self.streamer.generate_frame(
            timestamp=self.mission_elapsed_s,
            throttle_pct=throttle_pct,
            altitude_m=altitude_m,
            airspeed_kts=airspeed_kts,
            ambient_temp_c=ambient_temp_c,
            ambient_press_hpa=ambient_press_hpa,
            active_faults=active_faults,
        )
        # Sanitize and buffer through stream processor
        sensor_frame = self.processor.process(raw_sensor)

        # 5. Physics & Thermodynamic Engine Virtual Twin Prediction (Nominal expectations)
        # 5a. Performance Map Lookup for Volumetric Efficiency
        vol_eff_nominal = self.maps.get_volumetric_efficiency(sensor_frame.engine_rpm, sensor_frame.map_hpa)
        
        # 5b. Turbocharger & Intercooler Model
        turbo_state = self.turbo.compute(
            throttle_pct=sensor_frame.throttle_pct,
            ambient_press_hpa=ambient_press_hpa,
            ambient_temp_c=ambient_temp_c,
            air_mass_flow_g_s=45.0,
            intercooler_eff_scale=1.0,
        )

        # 5c. MVEM Engine Core
        twin_state = self.thermo.compute(
            timestamp=sensor_frame.timestamp,
            engine_rpm=sensor_frame.engine_rpm,
            map_hpa=turbo_state["manifold_pressure_hpa"],
            mat_c=turbo_state["mat_c"],
            ambient_temp_c=ambient_temp_c,
            vol_eff=vol_eff_nominal,
            turbo_pr=turbo_state["pressure_ratio"],
            turbo_rpm=turbo_state["turbo_speed_rpm"],
            intercooler_eff=turbo_state["intercooler_effectiveness"],
        )

        # 5d. Thermal Circuits Integration
        self.thermal.step(
            dt_s=dt,
            combustion_power_kw=twin_state.indicated_power_hp * 0.7457,
            cylinder_fractions=[0.25, 0.25, 0.25, 0.25],
            engine_rpm=sensor_frame.engine_rpm,
            ambient_temp_c=ambient_temp_c,
            airspeed_kts=airspeed_kts,
        )

        # 6. Real-Time State Estimation & EKF Model Synchronization
        x_hat, residuals = self.ekf.update(sensor_frame, twin_state)
        self.param_tracker.update(residuals)

        # 7. Diagnostics & Health Assessment
        alarms, cautions, thr_severity = self.threshold_mon.evaluate(sensor_frame)
        balance_info = self.balance_analyzer.analyze(sensor_frame.egt_c, sensor_frame.cht_c)
        anomaly_info = self.anomaly_detector.evaluate(residuals)
        diagnosed_faults = self.fault_isolator.isolate_faults(sensor_frame, twin_state, residuals, balance_info)

        # Compute Overall Health Score
        health_score = 100.0 - min(100.0, len(alarms) * 30.0 + len(cautions) * 12.0 + anomaly_info["anomaly_score_pct"] * 0.4)
        health_score = max(0.0, health_score)

        if len(alarms) > 0 or any(d.severity == HealthSeverity.CRITICAL for d in diagnosed_faults):
            overall_severity = HealthSeverity.CRITICAL
        elif len(cautions) > 0 or any(d.severity == HealthSeverity.WARNING for d in diagnosed_faults) or anomaly_info["is_anomaly"]:
            overall_severity = HealthSeverity.WARNING
        else:
            overall_severity = HealthSeverity.NORMAL

        health_status = HealthStatus(
            overall_health=overall_severity,
            health_score_pct=round(health_score, 1),
            active_alarms=alarms,
            active_cautions=cautions,
            cylinder_egt_spread_c=balance_info["egt_spread_c"],
            cylinder_cht_spread_c=balance_info["cht_spread_c"],
            is_cylinder_imbalanced=balance_info["is_imbalanced"],
            isolated_faults=diagnosed_faults,
        )

        # 8. Predictive Wear Accumulation & RUL Estimation
        if dt > 0:
            self.wear_model.accumulate_step(
                dt_s=dt,
                engine_rpm=sensor_frame.engine_rpm,
                map_hpa=sensor_frame.map_hpa,
                max_egt_c=max(sensor_frame.egt_c),
                max_cht_c=max(sensor_frame.cht_c),
                oil_temp_c=sensor_frame.oil_temp_c,
                turbo_rpm=twin_state.turbo_speed_rpm,
            )

        rul_status = self.rul_estimator.estimate(
            current_flight_severity=1.0 + (100.0 - health_score) / 100.0
        )

        # 9. Simulation Status
        sim_status = SimulationState(
            mission_name=self.current_mission_id,
            phase_name=phase_name,
            phase_index=self.phase_index,
            elapsed_time_s=round(self.mission_elapsed_s, 2),
            is_running=self.is_running,
            is_paused=self.is_paused,
            time_scale=self.time_scale,
            active_faults=active_faults,
        )

        # 10. Assemble Unified Packet
        packet = UnifiedTwinPacket(
            sensor=sensor_frame,
            twin=twin_state,
            residuals=residuals,
            health=health_status,
            rul=rul_status,
            simulation=sim_status,
        )
        self.latest_packet = packet
        return packet
