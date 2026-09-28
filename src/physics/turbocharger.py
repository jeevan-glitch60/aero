"""Turbocharger, Electronic Wastegate, and Intercooler (CAC) Dynamic Model."""

import math
from typing import Dict, Any


class TurbochargerModel:
    """Simulates turbo compressor, turbine, electronic wastegate, and intercooler."""

    GAMMA_AIR = 1.4
    CP_AIR = 1005.0  # J/(kg*K)

    def __init__(
        self,
        max_pressure_ratio: float = 2.85,
        compressor_eff_nominal: float = 0.76,
        intercooler_eff_nominal: float = 0.78,
        critical_altitude_m: float = 4572.0,
    ):
        self.max_pressure_ratio = max_pressure_ratio
        self.compressor_eff_nominal = compressor_eff_nominal
        self.intercooler_eff_nominal = intercooler_eff_nominal
        self.critical_altitude_m = critical_altitude_m
        self.current_turbo_rpm = 35000.0

    def compute(
        self,
        throttle_pct: float,
        ambient_press_hpa: float,
        ambient_temp_c: float,
        air_mass_flow_g_s: float,
        wastegate_pct_override: float = None,
        intercooler_eff_scale: float = 1.0,
    ) -> Dict[str, float]:
        """Calculates boost pressure, compressor discharge temperature, and intercooler outlet temperature."""
        p_amb_pa = ambient_press_hpa * 100.0
        t_amb_k = ambient_temp_c + 273.15

        # 1. Target Manifold Pressure (FADEC closed-loop boost demand)
        # Sea level target: ~1000 hPa at idle to ~1650 hPa at takeoff (100% throttle)
        target_map_hpa = 800.0 + (throttle_pct / 100.0) * (1650.0 - 800.0)

        # 2. Wastegate Actuator Position
        if wastegate_pct_override is not None:
            wastegate_pct = wastegate_pct_override
        else:
            # Closed-loop electronic boost control: closes wastegate as altitude increases or throttle increases
            pr_required = target_map_hpa / max(250.0, ambient_press_hpa)
            if pr_required <= 1.0:
                wastegate_pct = 100.0  # Fully bypassed
            else:
                wastegate_pct = max(0.0, min(100.0, 100.0 - (pr_required - 1.0) / (self.max_pressure_ratio - 1.0) * 100.0))

        # 3. Delivered Pressure Ratio
        boost_fraction = 1.0 - (wastegate_pct / 100.0)
        target_turbo_rpm = 30000.0 + boost_fraction * 115000.0
        # If starting from cold or large step, fast converge
        self.current_turbo_rpm += (target_turbo_rpm - self.current_turbo_rpm) * 0.85

        pressure_ratio = 1.0 + (self.max_pressure_ratio - 1.0) * boost_fraction * (self.current_turbo_rpm / 145000.0)
        pressure_ratio = min(self.max_pressure_ratio, max(1.0, pressure_ratio))

        delivered_map_pa = p_amb_pa * pressure_ratio
        delivered_map_hpa = delivered_map_pa / 100.0

        # 4. Compressor Discharge Temperature (Isentropic with efficiency)
        eta_c = self.compressor_eff_nominal
        exponent = (self.GAMMA_AIR - 1.0) / self.GAMMA_AIR
        t_comp_out_k = t_amb_k * (1.0 + (1.0 / eta_c) * (pressure_ratio ** exponent - 1.0))
        t_comp_out_c = t_comp_out_k - 273.15

        # 5. Intercooler (CAC) Heat Exchange
        eff_cac = self.intercooler_eff_nominal * intercooler_eff_scale
        t_cac_out_k = t_comp_out_k - eff_cac * (t_comp_out_k - t_amb_k)
        t_cac_out_c = t_cac_out_k - 273.15

        return {
            "manifold_pressure_hpa": delivered_map_hpa,
            "target_map_hpa": target_map_hpa,
            "pressure_ratio": pressure_ratio,
            "wastegate_pct": wastegate_pct,
            "turbo_speed_rpm": self.current_turbo_rpm,
            "compressor_out_temp_c": t_comp_out_c,
            "mat_c": t_cac_out_c,
            "intercooler_effectiveness": eff_cac,
        }
