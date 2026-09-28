"""Remaining Useful Life (RUL) estimator using physics wear models and Weibull survival."""

import math
from typing import Dict, Any
from src.core.types import SubsystemRUL
from src.predictive.wear_models import SubsystemWearModels


class RemainingUsefulLifeEstimator:
    """Estimates Remaining Useful Life (RUL) with probabilistic confidence bounds."""

    # Weibull shape parameters for aviation piston subsystems
    WEIBULL_BETA_LINER = 2.8   # Wear-out regime (beta > 1)
    WEIBULL_BETA_VALVE = 3.2   # Thermal fatigue wear-out
    WEIBULL_BETA_TURBO = 2.4   # Bearing fatigue

    def __init__(self, wear_model: SubsystemWearModels = None):
        self.wear_model = wear_model or SubsystemWearModels()

    def estimate(self, current_flight_severity: float = 1.0) -> SubsystemRUL:
        """Estimates RUL and confidence intervals given accumulated damage states."""
        liner_dmg = self.wear_model.piston_ring_damage
        valve_dmg = self.wear_model.exhaust_valve_damage
        turbo_dmg = self.wear_model.turbo_bearing_damage
        oil_dmg = self.wear_model.oil_degradation
        eoh = self.wear_model.equivalent_operating_hours

        # 1. Component remaining life fractions
        rem_liner = max(0.01, 1.0 - liner_dmg)
        rem_valve = max(0.01, 1.0 - valve_dmg)
        rem_turbo = max(0.01, 1.0 - turbo_dmg)

        # 2. Time-To-Threshold (Hours) under current operational severity
        severity = max(0.5, current_flight_severity)
        tbo = self.wear_model.TBO_HOURS_NOMINAL

        hours_rem_liner = (rem_liner * tbo) / severity
        hours_rem_valve = (rem_valve * tbo) / severity
        hours_rem_turbo = (rem_turbo * tbo * 1.5) / severity

        # The engine RUL is constrained by the most critical bottleneck subsystem
        bottleneck_rul = min(hours_rem_liner, hours_rem_valve, hours_rem_turbo)

        # 3. Confidence Intervals (P10 pessimistic, P90 optimistic) based on Weibull dispersion
        dispersion = 0.15 + (1.0 - rem_liner) * 0.10  # uncertainty increases as component ages
        rul_p10 = bottleneck_rul * (1.0 - 1.28 * dispersion)
        rul_p90 = bottleneck_rul * (1.0 + 1.28 * dispersion)

        # 4. Overall Engine Degradation Index (0-100%)
        overall_deg = max(liner_dmg, valve_dmg, turbo_dmg) * 100.0

        # 5. Maintenance Action Urgency Level
        if bottleneck_rul < 50.0:
            urgency = "URGENT_OVERHAUL_REQUIRED"
        elif bottleneck_rul < 200.0 or oil_dmg > 0.85:
            urgency = "PLAN_INSPECTION_NEXT_50H_CHECK"
        else:
            urgency = "NOMINAL_FLIGHT_READY"

        return SubsystemRUL(
            piston_rings_wear_pct=round(liner_dmg * 100.0, 1),
            exhaust_valves_fatigue_pct=round(valve_dmg * 100.0, 1),
            turbo_bearings_wear_pct=round(turbo_dmg * 100.0, 1),
            oil_aging_index_pct=round(oil_dmg * 100.0, 1),
            overall_degradation_pct=round(overall_deg, 1),
            estimated_rul_hours=round(bottleneck_rul, 1),
            rul_p10_hours=round(max(0.0, rul_p10), 1),
            rul_p90_hours=round(rul_p90, 1),
            equivalent_operating_hours=round(eoh, 1),
            maintenance_urgency=urgency,
        )
