"""Constant-Speed Propeller and Aerodynamic Load Model for MALE UAV."""

import math
from typing import Dict, Any


class PropellerModel:
    """Simulates propeller aerodynamic load torque, thrust, and governor dynamics."""

    def __init__(
        self,
        diameter_m: float = 1.75,     # 3-blade composite prop diameter
        num_blades: int = 3,
        gearbox_ratio: float = 2.54167,
    ):
        self.diameter_m = diameter_m
        self.num_blades = num_blades
        self.gearbox_ratio = gearbox_ratio
        self.blade_pitch_deg = 18.0   # Initial governor blade pitch

    def compute(
        self,
        engine_rpm: float,
        airspeed_kts: float,
        air_density_kg_m3: float,
        target_rpm: float = 5500.0,
    ) -> Dict[str, float]:
        """Calculates propeller rotational speed, advance ratio, absorbed torque and thrust."""
        prop_rpm = engine_rpm / self.gearbox_ratio
        n_rps = max(5.0, prop_rpm / 60.0)
        v_mps = max(0.1, airspeed_kts * 0.514444)

        # Advance ratio J
        j = v_mps / (n_rps * self.diameter_m)

        # Constant speed governor adjusts blade pitch to hold target RPM
        rpm_error = engine_rpm - target_rpm
        self.blade_pitch_deg += max(-1.0, min(1.0, rpm_error * 0.002))
        self.blade_pitch_deg = max(12.0, min(35.0, self.blade_pitch_deg))

        # Power and Thrust Coefficients based on blade element momentum approximations
        # CP(J, beta) ~ a0 + a1 * beta - a2 * J
        cp = max(0.015, 0.045 + (self.blade_pitch_deg - 15.0) * 0.006 - 0.035 * j)
        ct = max(0.010, 0.080 + (self.blade_pitch_deg - 15.0) * 0.008 - 0.075 * j)

        d5 = self.diameter_m ** 5
        d4 = self.diameter_m ** 4
        rho = air_density_kg_m3

        # Absorbed Power & Torque at Propeller shaft
        absorbed_power_watts = cp * rho * (n_rps ** 3) * d5
        prop_torque_nm = absorbed_power_watts / (2.0 * math.pi * n_rps)
        
        # Engine Crankshaft reflected torque
        engine_reflected_torque_nm = prop_torque_nm / self.gearbox_ratio
        thrust_newtons = ct * rho * (n_rps ** 2) * d4

        return {
            "prop_rpm": prop_rpm,
            "advance_ratio_j": j,
            "blade_pitch_deg": self.blade_pitch_deg,
            "power_absorbed_hp": absorbed_power_watts / 745.7,
            "engine_load_torque_nm": engine_reflected_torque_nm,
            "thrust_n": thrust_newtons,
            "thrust_lbf": thrust_newtons * 0.224809,
        }
