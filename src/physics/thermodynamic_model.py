"""0D/1D Mean Value Thermodynamic Engine Model (MVEM)."""

import math
from typing import Dict, Any, List
from src.core.types import TwinThermodynamicState


class ThermodynamicEngineModel:
    """Mean Value Engine Model (MVEM) for 4-stroke turbocharged aero piston engine."""

    R_AIR = 287.05        # J/(kg*K)
    LHV_FUEL = 43.5e6     # J/kg (AVGAS 100LL)
    AFR_STOICH = 14.7     # Stoichiometric air-fuel ratio

    def __init__(
        self,
        displacement_cc: float = 1352.0,
        bore_mm: float = 84.0,
        stroke_mm: float = 61.0,
        compression_ratio: float = 8.2,
        num_cylinders: int = 4,
    ):
        self.displacement_m3 = displacement_cc * 1e-6
        self.bore_m = bore_mm * 1e-3
        self.stroke_m = stroke_mm * 1e-3
        self.compression_ratio = compression_ratio
        self.num_cylinders = num_cylinders

    def compute(
        self,
        timestamp: float,
        engine_rpm: float,
        map_hpa: float,
        mat_c: float,
        ambient_temp_c: float,
        vol_eff: float = 0.88,
        turbo_pr: float = 1.6,
        turbo_rpm: float = 85000.0,
        intercooler_eff: float = 0.78,
        cylinder_trim_factors: List[float] = None,
    ) -> TwinThermodynamicState:
        """Evaluates thermodynamic energy balance, power, torque, and temperatures."""
        cylinder_trim = cylinder_trim_factors or [1.0, 1.0, 1.0, 1.0]
        t_mat_k = mat_c + 273.15
        p_man_pa = map_hpa * 100.0
        n_rps = max(10.0, engine_rpm / 60.0)

        # 1. Trapped Air Mass Flow Rate (g/s)
        # m_dot_air = eta_v * (V_d * N / 120) * (P_man / (R * T_man))
        density_man = p_man_pa / (self.R_AIR * t_mat_k)
        volumetric_displacement_rate = self.displacement_m3 * (n_rps / 2.0)
        air_mass_flow_kg_s = vol_eff * volumetric_displacement_rate * density_man
        air_mass_flow_g_s = air_mass_flow_kg_s * 1000.0

        # 2. Target Lambda & Fuel Mass Flow Rate
        # Aero engine runs slightly rich of peak (lambda ~ 0.88 to 0.92) for cooling & knock margin
        target_lambda = 0.90 if map_hpa > 1200.0 else 0.98
        afr_actual = self.AFR_STOICH * target_lambda
        fuel_mass_flow_kg_s = air_mass_flow_kg_s / afr_actual
        fuel_mass_flow_g_s = fuel_mass_flow_kg_s * 1000.0

        # 3. Indicated Work & Chemical Power
        q_chemical_watts = fuel_mass_flow_kg_s * self.LHV_FUEL
        # Otto cycle indicated thermal efficiency
        gamma = 1.32  # effective adiabatic index during combustion
        eta_otto_ideal = 1.0 - (1.0 / (self.compression_ratio ** (gamma - 1.0)))
        eta_indicated = eta_otto_ideal * 0.68  # real combustion & timing efficiency (~33-36%)
        indicated_power_watts = q_chemical_watts * eta_indicated

        # 4. Friction Mean Effective Pressure (Chen-Flynn model)
        # Sp = 2 * Stroke * (N / 60) [mean piston speed in m/s]
        mean_piston_speed = 2.0 * self.stroke_m * n_rps
        p_max_bar = (p_man_pa / 1e5) * (self.compression_ratio ** 1.3)
        fmep_bar = 0.4 + 0.005 * p_max_bar + 0.08 * mean_piston_speed + 0.001 * (mean_piston_speed ** 2)
        fmep_pa = fmep_bar * 1e5

        friction_power_watts = fmep_pa * self.displacement_m3 * (n_rps / 2.0)

        # 5. Brake Power and Torque
        brake_power_watts = max(0.0, indicated_power_watts - friction_power_watts)
        brake_power_hp = brake_power_watts / 745.7
        indicated_power_hp = indicated_power_watts / 745.7
        friction_power_hp = friction_power_watts / 745.7

        omega_rad_s = 2.0 * math.pi * n_rps
        brake_torque_nm = brake_power_watts / omega_rad_s if omega_rad_s > 0 else 0.0

        # 6. BSFC & Thermal Efficiency
        bsfc_g_per_kwh = (fuel_mass_flow_kg_s * 3600.0 * 1000.0) / (brake_power_watts / 1000.0) if brake_power_watts > 1000.0 else 999.0
        thermal_eff_pct = (brake_power_watts / q_chemical_watts * 100.0) if q_chemical_watts > 0 else 0.0

        # 7. Exhaust Gas Temperatures (EGT per cylinder)
        # Base expansion EGT: ~700C at cruise to ~850C at high power
        base_egt_c = 620.0 + (brake_power_hp / 141.0) * 220.0 + (mat_c - 25.0) * 0.35
        egt_predicted = [
            round(base_egt_c * cylinder_trim[0], 1),
            round(base_egt_c * cylinder_trim[1], 1),
            round(base_egt_c * cylinder_trim[2], 1),
            round(base_egt_c * cylinder_trim[3], 1),
        ]

        # 8. Cylinder Head Temperatures (CHT per cylinder)
        base_cht_c = 75.0 + (brake_power_hp / 141.0) * 42.0 + (ambient_temp_c - 15.0) * 0.3
        cht_predicted = [
            round(base_cht_c * (0.98 + 0.02 * cylinder_trim[0]), 1),
            round(base_cht_c * (0.99 + 0.02 * cylinder_trim[1]), 1),
            round(base_cht_c * (0.98 + 0.02 * cylinder_trim[2]), 1),
            round(base_cht_c * (1.01 + 0.02 * cylinder_trim[3]), 1),
        ]

        # 9. Oil and Coolant Temperatures
        oil_temp_predicted = 80.0 + (brake_power_hp / 141.0) * 25.0 + (ambient_temp_c - 15.0) * 0.35
        coolant_temp_predicted = 76.0 + (brake_power_hp / 141.0) * 20.0 + (ambient_temp_c - 15.0) * 0.25
        oil_press_predicted = max(1.5, min(5.5, 2.0 + (engine_rpm / 5500.0) * 3.0))

        return TwinThermodynamicState(
            timestamp=round(timestamp, 3),
            map_predicted_hpa=round(map_hpa, 1),
            mat_predicted_c=round(mat_c, 1),
            egt_predicted_c=egt_predicted,
            cht_predicted_c=cht_predicted,
            oil_temp_predicted_c=round(oil_temp_predicted, 1),
            oil_press_predicted_bar=round(oil_press_predicted, 2),
            coolant_temp_predicted_c=round(coolant_temp_predicted, 1),
            indicated_power_hp=round(indicated_power_hp, 1),
            brake_power_hp=round(brake_power_hp, 1),
            friction_power_hp=round(friction_power_hp, 1),
            brake_torque_nm=round(brake_torque_nm, 1),
            bsfc_g_per_kwh=round(min(999.0, bsfc_g_per_kwh), 1),
            thermal_efficiency_pct=round(thermal_eff_pct, 1),
            volumetric_efficiency_pct=round(vol_eff * 100.0, 1),
            air_mass_flow_g_per_s=round(air_mass_flow_g_s, 2),
            fuel_mass_flow_g_per_s=round(fuel_mass_flow_g_s, 2),
            turbo_pressure_ratio=round(turbo_pr, 2),
            turbo_speed_rpm=round(turbo_rpm, 0),
            intercooler_effectiveness=round(intercooler_eff, 3),
            target_lambda=round(target_lambda, 2),
        )
