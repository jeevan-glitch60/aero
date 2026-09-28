"""Physics-based degradation and wear accumulation models for Aero Piston Engines."""

import math
from typing import Dict, Any


class SubsystemWearModels:
    """Calculates continuous damage accumulation across major mechanical subsystems."""

    # Material constants
    R_GAS = 8.314             # J/(mol*K)
    E_ACT_VALVE = 78000.0     # Activation energy for Nimonic exhaust valve oxidation/fatigue (J/mol)
    TBO_HOURS_NOMINAL = 1200.0  # Standard Rotax Time Between Overhauls (hours)
    OIL_CHANGE_HOURS = 100.0  # Oil life interval (hours)

    def __init__(self):
        # Accumulated damage fractions (0.0 = mint new, 1.0 = end of life limit)
        self.piston_ring_damage = 0.08      # 8% baseline used
        self.exhaust_valve_damage = 0.05    # 5% baseline used
        self.turbo_bearing_damage = 0.04    # 4% baseline used
        self.oil_degradation = 0.15         # 15% into current 100h oil cycle
        self.equivalent_operating_hours = 96.0  # Baseline flight hours on engine

    def accumulate_step(
        self,
        dt_s: float,
        engine_rpm: float,
        map_hpa: float,
        max_egt_c: float,
        max_cht_c: float,
        oil_temp_c: float,
        turbo_rpm: float,
    ) -> Dict[str, float]:
        """Integrates physics damage rates over time step dt_s."""
        dt_h = dt_s / 3600.0
        n_ratio = max(0.2, engine_rpm / 5500.0)
        p_ratio = max(0.3, map_hpa / 1550.0)

        # 1. Piston Ring & Cylinder Liner Wear (Archard wear law)
        # Normal force ~ peak cylinder pressure (P_man), sliding speed ~ RPM
        # Severe penalty when CHT > 125C (lubricant film thinning)
        film_thinning_factor = math.exp(max(0.0, (max_cht_c - 120.0) * 0.04))
        liner_wear_rate_per_hour = (1.0 / self.TBO_HOURS_NOMINAL) * (n_ratio ** 1.8) * (p_ratio ** 1.5) * film_thinning_factor
        self.piston_ring_damage += liner_wear_rate_per_hour * dt_h

        # 2. Exhaust Valve Thermal Fatigue (Arrhenius thermal kinetics)
        t_egt_k = max_egt_c + 273.15
        arrhenius_factor = math.exp(-self.E_ACT_VALVE / (self.R_GAS * t_egt_k)) / math.exp(-self.E_ACT_VALVE / (self.R_GAS * (800.0 + 273.15)))
        valve_fatigue_rate_per_hour = (1.0 / self.TBO_HOURS_NOMINAL) * (n_ratio ** 1.2) * arrhenius_factor
        self.exhaust_valve_damage += valve_fatigue_rate_per_hour * dt_h

        # 3. Turbocharger Bearing Fatigue
        turbo_speed_ratio = max(0.2, turbo_rpm / 140000.0)
        turbo_wear_rate_per_hour = (1.0 / (self.TBO_HOURS_NOMINAL * 1.5)) * (turbo_speed_ratio ** 2.2) * (1.0 + max(0.0, (oil_temp_c - 110.0) * 0.03))
        self.turbo_bearing_damage += turbo_wear_rate_per_hour * dt_h

        # 4. Engine Oil Degradation (Thermal Oxidation + Additive Depletion)
        oil_thermal_stress = math.exp(max(0.0, (oil_temp_c - 90.0) * 0.035))
        oil_aging_rate_per_hour = (1.0 / self.OIL_CHANGE_HOURS) * (n_ratio ** 1.1) * oil_thermal_stress
        self.oil_degradation += oil_aging_rate_per_hour * dt_h

        # 5. Severity-weighted Equivalent Operating Hours (EOH)
        severity_factor = 0.4 * (n_ratio ** 1.5) + 0.6 * (p_ratio ** 1.3)
        self.equivalent_operating_hours += dt_h * severity_factor

        # Clamp max
        self.piston_ring_damage = min(1.0, max(0.0, self.piston_ring_damage))
        self.exhaust_valve_damage = min(1.0, max(0.0, self.exhaust_valve_damage))
        self.turbo_bearing_damage = min(1.0, max(0.0, self.turbo_bearing_damage))
        self.oil_degradation = min(1.0, max(0.0, self.oil_degradation))

        return {
            "piston_rings_wear_pct": round(self.piston_ring_damage * 100.0, 2),
            "exhaust_valves_fatigue_pct": round(self.exhaust_valve_damage * 100.0, 2),
            "turbo_bearings_wear_pct": round(self.turbo_bearing_damage * 100.0, 2),
            "oil_aging_index_pct": round(self.oil_degradation * 100.0, 2),
            "equivalent_operating_hours": round(self.equivalent_operating_hours, 2),
        }
