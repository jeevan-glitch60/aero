"""Synthetic Telemetry Streamer for Hardware-in-the-Loop (HIL) & Flight Testing."""

import time
import math
import numpy as np
from typing import Optional, Dict, Any, List
from src.core.types import SensorFrame, InjectedFaultState


class SyntheticTelemetryStreamer:
    """Generates realistic noisy physical engine telemetry according to throttle & flight conditions."""

    def __init__(self, seed: Optional[int] = 42):
        if seed is not None:
            np.random.seed(seed)
        self.noise_enabled = True

    def generate_frame(
        self,
        timestamp: float,
        throttle_pct: float,
        altitude_m: float,
        airspeed_kts: float,
        ambient_temp_c: float,
        ambient_press_hpa: float,
        active_faults: Optional[List[InjectedFaultState]] = None,
        gearbox_ratio: float = 2.54167,
    ) -> SensorFrame:
        """Synthesizes a realistic SensorFrame representing raw engine output."""
        active_faults = active_faults or []
        fault_dict = {f.fault_id: f for f in active_faults if f.is_active}

        # 1. Engine & Propeller Speed
        # Idle ~1400 RPM @ 0% throttle, Max ~5800 RPM @ 100% throttle
        target_rpm = 1400.0 + (throttle_pct / 100.0) * (5800.0 - 1400.0)
        rpm_noise = np.random.normal(0, 8.0) if self.noise_enabled else 0.0
        engine_rpm = max(1300.0, min(5900.0, target_rpm + rpm_noise))
        prop_rpm = engine_rpm / gearbox_ratio

        # 2. Turbocharger & Wastegate Behavior
        # At sea level (1013 hPa), wastegate opens more to prevent overboost.
        # At high altitude, wastegate closes towards 0% to spool turbo and maintain MAP.
        base_wastegate_pct = max(0.0, min(100.0, 100.0 - (throttle_pct * 0.85) - (altitude_m / 6000.0 * 25.0)))
        
        # Fault: Wastegate Stuck Open (FA-01)
        if "FA-01" in fault_dict:
            severity = fault_dict["FA-01"].severity_factor
            wastegate_pct = 95.0 * severity + base_wastegate_pct * (1.0 - severity)
        else:
            wastegate_pct = base_wastegate_pct

        # 3. Manifold Absolute Pressure (MAP)
        # Standard sea level max boost = ~1650 hPa (~48.7 inHg).
        boost_capability = 1.0 + (1.0 - wastegate_pct / 100.0) * 1.85
        target_map = ambient_press_hpa * (0.35 + 0.65 * (throttle_pct / 100.0)) * boost_capability
        
        # Cap at mechanical relief ~1750 hPa
        target_map = min(1750.0, target_map)

        # Fault: MAP Sensor Bias Drift (FA-06)
        map_bias = 150.0 * fault_dict["FA-06"].severity_factor if "FA-06" in fault_dict else 0.0
        map_noise = np.random.normal(0, 3.0) if self.noise_enabled else 0.0
        map_hpa = max(400.0, target_map + map_bias + map_noise)

        # 4. Manifold Air Temperature (MAT) after Intercooler (CAC)
        # Compressor heats air, CAC cools it down with ambient airflow
        comp_temp_rise = max(0.0, (map_hpa / max(300.0, ambient_press_hpa) - 1.0) * 85.0)
        cac_effectiveness = 0.78
        if "FA-02" in fault_dict:  # Intercooler Fouling
            cac_effectiveness *= (1.0 - 0.55 * fault_dict["FA-02"].severity_factor)

        mat_c = ambient_temp_c + comp_temp_rise * (1.0 - cac_effectiveness) + (np.random.normal(0, 0.4) if self.noise_enabled else 0.0)

        # 5. Cylinder Exhaust Gas Temperature (EGT 1-4)
        base_egt = 650.0 + (throttle_pct / 100.0) * 190.0 + (mat_c - 20.0) * 0.4
        egt = [
            base_egt + np.random.normal(-5.0, 3.0),
            base_egt + np.random.normal(2.0, 3.0),
            base_egt + np.random.normal(-1.0, 3.0),
            base_egt + np.random.normal(4.0, 3.0),
        ]

        # Fault: Injector Lean Drift Cyl #2 (FA-03)
        if "FA-03" in fault_dict:
            sev = fault_dict["FA-03"].severity_factor
            egt[1] += 85.0 * sev  # Severe lean spike on Cyl 2

        # 6. Cylinder Head Temperature (CHT 1-4)
        base_cht = 75.0 + (throttle_pct / 100.0) * 45.0 + (ambient_temp_c - 15.0) * 0.35 - (airspeed_kts / 100.0) * 12.0
        cht = [
            base_cht + np.random.normal(-2.0, 0.8),
            base_cht + np.random.normal(1.0, 0.8),
            base_cht + np.random.normal(-0.5, 0.8),
            base_cht + np.random.normal(2.0, 0.8),
        ]
        if "FA-03" in fault_dict:
            cht[1] += 26.0 * fault_dict["FA-03"].severity_factor
        if "FA-02" in fault_dict:
            for i in range(4):
                cht[i] += 12.0 * fault_dict["FA-02"].severity_factor

        # 7. Lubrication & Coolant System
        base_oil_temp = 80.0 + (throttle_pct / 100.0) * 28.0 + (ambient_temp_c - 15.0) * 0.4
        if "FA-05" in fault_dict:  # Oil Cooler Airflow Blockage
            base_oil_temp += 32.0 * fault_dict["FA-05"].severity_factor
        if "FA-04" in fault_dict:  # Piston Ring Blow-by
            base_oil_temp += 16.0 * fault_dict["FA-04"].severity_factor

        oil_temp_c = base_oil_temp + (np.random.normal(0, 0.5) if self.noise_enabled else 0.0)

        # Oil pressure inversely proportional to oil temp (viscosity) + proportional to RPM
        oil_visc_factor = max(0.5, 1.0 - (oil_temp_c - 80.0) * 0.006)
        base_oil_press = (1.8 + (engine_rpm / 5800.0) * 3.2) * oil_visc_factor
        if "FA-05" in fault_dict:
            base_oil_press *= (1.0 - 0.20 * fault_dict["FA-05"].severity_factor)

        oil_press_bar = max(0.8, min(6.5, base_oil_press + (np.random.normal(0, 0.04) if self.noise_enabled else 0.0)))

        # Coolant Temperature
        coolant_temp_c = 78.0 + (throttle_pct / 100.0) * 22.0 + (ambient_temp_c - 15.0) * 0.3

        # 8. Fuel Flow and Pressure
        # Approximate fuel flow: 8 L/h at idle to 42 L/h at max takeoff
        base_ff = 7.5 + (throttle_pct / 100.0) ** 1.3 * 34.5
        fuel_flow_lph = max(4.0, base_ff + (np.random.normal(0, 0.2) if self.noise_enabled else 0.0))
        fuel_press_bar = 3.2 + (np.random.normal(0, 0.02) if self.noise_enabled else 0.0)

        # 9. Engine Vibration & Harmonics (g)
        # Nominal baseline: 0.7g idle to 1.5g full power
        base_vib = 0.70 + (engine_rpm / 5800.0) * 0.85
        harmonic_1x = 0.45 + (engine_rpm / 5800.0) * 0.45
        harmonic_2x = 0.22 + (engine_rpm / 5800.0) * 0.20
        harmonic_3x = 0.08 + (engine_rpm / 5800.0) * 0.08

        # Imbalance or faults increase mechanical vibration & 2x harmonic
        if "FA-03" in fault_dict:  # Injector clog / combustion imbalance
            sev = fault_dict["FA-03"].severity_factor
            base_vib += 1.40 * sev
            harmonic_2x *= (1.0 + 0.65 * sev)
        if "FA-04" in fault_dict:  # Ring blow-by
            sev = fault_dict["FA-04"].severity_factor
            base_vib += 0.95 * sev
            harmonic_1x *= (1.0 + 0.40 * sev)

        vib_noise = np.random.normal(0, 0.05) if self.noise_enabled else 0.0
        vibration_g = max(0.4, round(base_vib + vib_noise, 2))

        return SensorFrame(
            timestamp=round(timestamp, 3),
            engine_rpm=round(engine_rpm, 1),
            prop_rpm=round(prop_rpm, 1),
            throttle_pct=round(throttle_pct, 1),
            wastegate_pct=round(wastegate_pct, 1),
            map_hpa=round(map_hpa, 1),
            mat_c=round(mat_c, 1),
            egt_c=[round(t, 1) for t in egt],
            cht_c=[round(t, 1) for t in cht],
            oil_temp_c=round(oil_temp_c, 1),
            oil_press_bar=round(oil_press_bar, 2),
            fuel_press_bar=round(fuel_press_bar, 2),
            fuel_flow_lph=round(fuel_flow_lph, 2),
            coolant_temp_c=round(coolant_temp_c, 1),
            ambient_temp_c=round(ambient_temp_c, 1),
            ambient_press_hpa=round(ambient_press_hpa, 1),
            altitude_m=round(altitude_m, 1),
            airspeed_kts=round(airspeed_kts, 1),
            bus_voltage_v=28.1 + (np.random.normal(0, 0.05) if self.noise_enabled else 0.0),
            vibration_g=vibration_g,
            vibration_harmonics={
                "1x": round(harmonic_1x, 2),
                "2x": round(harmonic_2x, 2),
                "3x": round(harmonic_3x, 2),
            },
        )
