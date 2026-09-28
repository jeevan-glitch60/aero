"""Fault Isolation Matrix (FIM) and Root Cause Diagnostic Engine."""

from typing import List, Dict, Any, Optional
import numpy as np
from src.core.types import (
    SensorFrame,
    TwinThermodynamicState,
    InnovationResiduals,
    FaultDiagnostic,
    HealthSeverity,
)


class FaultIsolator:
    """Matches multidimensional residual signatures against known aero engine failure modes."""

    def __init__(self, fault_definitions: Optional[Dict[str, Any]] = None):
        self.fault_defs = fault_definitions or {}

    def isolate_faults(
        self,
        sensor: SensorFrame,
        twin: TwinThermodynamicState,
        residuals: InnovationResiduals,
        balance_info: Dict[str, Any],
    ) -> List[FaultDiagnostic]:
        """Evaluates likelihood scores for all failure modes and returns diagnosed root causes."""
        scores: Dict[str, float] = {}

        # 1. FA-01: Wastegate Actuator Stuck Open
        # Symptoms: Low MAP relative to commanded/altitude, low turbo speed, low brake power
        map_deficit = twin.map_predicted_hpa - sensor.map_hpa
        if sensor.altitude_m > 1500.0 and map_deficit > 80.0:
            score_fa01 = min(1.0, (map_deficit / 200.0) * (sensor.throttle_pct / 60.0))
        else:
            score_fa01 = 0.05
        scores["FA-01"] = score_fa01

        # 2. FA-02: Intercooler (CAC) Fouling
        # Symptoms: MAT significantly higher than predicted twin MAT, CHTs elevated
        mat_excess = sensor.mat_c - twin.mat_predicted_c
        if mat_excess > 8.0:
            score_fa02 = min(1.0, (mat_excess / 22.0) * 0.95)
        else:
            score_fa02 = 0.02
        scores["FA-02"] = score_fa02

        # 3. FA-03: Cylinder #2 Fuel Injector Partial Clogging
        # Symptoms: Cyl 2 EGT spiked, Cyl 2 CHT high, EGT spread high
        cyl2_egt_dev = balance_info["egt_deviations_c"][1]
        egt_spread = balance_info["egt_spread_c"]
        if cyl2_egt_dev > 35.0 and egt_spread > 45.0:
            score_fa03 = min(1.0, (cyl2_egt_dev / 75.0) * 0.98)
        else:
            score_fa03 = 0.01
        scores["FA-03"] = score_fa03

        # 4. FA-04: Cylinder #3 Piston Ring Wear / Blow-by
        # Symptoms: Oil temp elevated, oil pressure drop, power down, oil temp residual
        oil_t_res = residuals.residual_oil_temp_c
        power_ratio = twin.brake_power_hp / max(1.0, sensor.throttle_pct)
        if oil_t_res > 8.0 and sensor.oil_press_bar < 2.5:
            score_fa04 = min(1.0, (oil_t_res / 18.0) * 0.85)
        else:
            score_fa04 = 0.03
        scores["FA-04"] = score_fa04

        # 5. FA-05: Oil Cooler Airflow Restriction
        # Symptoms: Severe oil temperature rise without power loss
        if oil_t_res > 18.0 and sensor.oil_temp_c > 115.0:
            score_fa05 = min(1.0, (oil_t_res / 30.0) * 0.95)
        else:
            score_fa05 = 0.02
        scores["FA-05"] = score_fa05

        # 6. FA-06: MAP Sensor Bias Drift
        # Symptoms: High MAP residual but MAT, EGT, and ambient match nominal
        if abs(residuals.residual_map_hpa) > 80.0 and abs(residuals.residual_mat_c) < 4.0:
            score_fa06 = min(1.0, abs(residuals.residual_map_hpa) / 150.0)
        else:
            score_fa06 = 0.01
        scores["FA-06"] = score_fa06

        # Build list of active diagnosed faults above detection threshold (>= 40%)
        diagnostics: List[FaultDiagnostic] = []

        recommendations = {
            "FA-01": "Inspect wastegate servo actuator linkage and ECU boost control solenoid. If in flight, reduce altitude to critical ceiling.",
            "FA-02": "Perform borescope inspection of CAC core for sand/dust fouling. Clean charge cooler ducts.",
            "FA-03": "Inspect Cyl #2 fuel injector nozzle for clogging or varnish. Swap with Cyl #1 to isolate electrical vs hydraulic.",
            "FA-04": "Perform differential compression check on Cylinder 3. Inspect crankcase blow-by breather for oil misting.",
            "FA-05": "Check oil cooler cowl flap opening and radiator matrix for debris/insect obstruction. Land and cool down if oil temp >130°C.",
            "FA-06": "Recalibrate or replace primary MAP transducer. Verify reference pneumatic hose for pinching or condensation.",
        }

        fault_metadata = {
            "FA-01": ("Wastegate Actuator Stuck Open", "Aspiration / Boost", HealthSeverity.CRITICAL),
            "FA-02": ("Intercooler (CAC) Core Fouling", "Intake / Thermal", HealthSeverity.WARNING),
            "FA-03": ("Cylinder #2 Fuel Injector Clogging", "Fuel Injection", HealthSeverity.CRITICAL),
            "FA-04": ("Cylinder #3 Piston Ring Blow-by", "Mechanical Combustion", HealthSeverity.WARNING),
            "FA-05": ("Oil Cooler Airflow Restriction", "Lubrication / Thermal", HealthSeverity.CRITICAL),
            "FA-06": ("MAP Sensor Bias Drift", "Avionics / Sensor", HealthSeverity.WARNING),
        }

        fault_evidence = {
            "FA-01": [
                "MAP is 120 hPa below virtual twin prediction at cruise throttle",
                "Turbocharger pressure ratio depressed by 28%",
                "Engine brake power output reduced by 18 hp at current altitude",
            ],
            "FA-02": [
                "Manifold Air Temperature (MAT) elevated 14.2°C above nominal baseline",
                "Charge Air Cooler (CAC) effectiveness dropped from 78% to 41%",
                "Multi-cylinder CHTs elevated 10–12°C under constant airflow",
            ],
            "FA-03": [
                "Cylinder #2 EGT rising 4.2°C/min while engine RPM remains stable",
                "Cylinder #2 EGT 82°C above 4-cylinder average (lean condition)",
                "Vibration harmonic at 2× RPM increased by 45% due to combustion torque ripple",
            ],
            "FA-04": [
                "Engine oil temperature residual 14.5°C above expected thermal circuit state",
                "Oil pressure reduced to 2.1 bar despite nominal 5,000 RPM operation",
                "Blow-by gas thermal transfer elevating lower crankcase temperature",
            ],
            "FA-05": [
                "Oil temperature exceedance (>118°C) without proportional brake power increase",
                "Oil cooler radiator heat dissipation rate decreased by 46%",
                "Critical lubrication viscosity safety margin reduced by 30%",
            ],
            "FA-06": [
                "Primary MAP transducer reading diverged +140 hPa from intake physics model",
                "Engine power, EGT, and throttle position match barometric expectation",
                "Mahalanobis residual distance D_M exceeded 4.8-sigma threshold",
            ],
        }

        fault_metrics = {
            "FA-01": ["MAP (hPa)", "Turbo PR", "Brake Power (HP)"],
            "FA-02": ["MAT (°C)", "Intercooler Eff (%)", "Max CHT (°C)"],
            "FA-03": ["Cyl #2 EGT (°C)", "EGT Spread (°C)", "Vibration 2x (g)"],
            "FA-04": ["Oil Temp (°C)", "Oil Pressure (bar)", "Vibration (g)"],
            "FA-05": ["Oil Temp (°C)", "Oil Pressure (bar)", "Coolant Temp (°C)"],
            "FA-06": ["MAP (hPa)", "Residual MAP (hPa)", "Mahalanobis D_M"],
        }

        fault_alternatives = {
            "FA-01": "Barometric sensor calibration offset or wastegate pneumatic signal tube micro-leakage",
            "FA-02": "Extreme ambient temperature inversion, forward nacelle ram-air stagnation, or oil mist accumulation",
            "FA-03": "Cylinder #2 EGT thermocouple bias drift, wiring harness micro-vibration resistance, or localized intake runner gasket leak",
            "FA-04": "Oil pressure transducer degradation, oil cooler thermostatic bypass valve float, or crankcase breather restriction",
            "FA-05": "Oil cooler bypass valve sticking open, oil viscosity breakdown, or thermocouple drift",
            "FA-06": "Manifold pressure pneumatic hose moisture condensation or CAN ADC reference voltage offset",
        }

        for f_id, score in scores.items():
            if score >= 0.40:
                name, cat, sev = fault_metadata[f_id]
                diagnostics.append(
                    FaultDiagnostic(
                        fault_id=f_id,
                        name=name,
                        category=cat,
                        severity=sev,
                        confidence_pct=round(score * 100.0, 1),
                        description=f"Detected abnormal signature matching {name} with {score*100.0:.0f}% confidence.",
                        affected_components=["turbocharger", "intake"] if f_id in ["FA-01", "FA-02"] else ["fuel", "engine_block"],
                        recommended_action=recommendations.get(f_id, "Inspect related subsystem."),
                        evidence_bullets=fault_evidence.get(f_id, []),
                        affected_metrics=fault_metrics.get(f_id, []),
                        alternative_explanation=fault_alternatives.get(f_id, "Sensor calibration bias or harness contact resistance"),
                        model_version="MVEM-v3.4-AERO",
                        source_mode="synthetic",
                        data_quality_pct=98.0,
                        system_limitation="Not a confirmed diagnosis; illustrative model output only. Digital Twin is read-only advisory.",
                    )
                )

        # Sort by confidence descending
        diagnostics.sort(key=lambda d: d.confidence_pct, reverse=True)
        return diagnostics
