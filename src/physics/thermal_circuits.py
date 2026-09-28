"""Lumped-parameter thermal circuit models for CHT (Cyl 1-4), Oil, and Coolant."""

from typing import List, Dict, Any


class ThermalCircuitsModel:
    """Simulates transient temperatures for cylinder heads, oil sump, and coolant."""

    def __init__(
        self,
        c_cyl_head: float = 4200.0,    # J/K per cylinder head
        c_oil_sump: float = 8500.0,    # J/K for oil system
        c_coolant: float = 12000.0,    # J/K for coolant loop
    ):
        self.c_cyl_head = c_cyl_head
        self.c_oil_sump = c_oil_sump
        self.c_coolant = c_coolant

        # State variables (temperatures in deg C)
        self.cht = [85.0, 85.0, 85.0, 85.0]
        self.oil_temp = 80.0
        self.coolant_temp = 78.0

    def get_state(self) -> Dict[str, Any]:
        """Returns the current thermal state without advancing time."""
        return {
            "cht_c": [round(t, 2) for t in self.cht],
            "oil_temp_c": round(self.oil_temp, 2),
            "oil_press_bar": round(self._oil_pressure(), 2),
            "coolant_temp_c": round(self.coolant_temp, 2),
        }

    def reset(self):
        """Resets thermal nodes to their cold-start state."""
        self.cht = [85.0, 85.0, 85.0, 85.0]
        self.oil_temp = 80.0
        self.coolant_temp = 78.0

    def _oil_pressure(self) -> float:
        oil_viscosity_rel = max(0.4, 1.0 - (self.oil_temp - 80.0) * 0.007)
        pump_delivery_factor = 0.0
        return max(0.9, min(6.5, (1.8 + pump_delivery_factor * 3.4) * oil_viscosity_rel))

    def step(
        self,
        dt_s: float,
        combustion_power_kw: float,
        cylinder_fractions: List[float],
        engine_rpm: float,
        ambient_temp_c: float,
        airspeed_kts: float,
        oil_cooler_airflow_scale: float = 1.0,
    ) -> Dict[str, Any]:
        """Integrates lumped thermal ODEs over time step dt_s."""
        dt = min(1.0, max(0.001, dt_s))
        v_air_mps = airspeed_kts * 0.514444

        # Convective cooling coefficient scales with ram airspeed and engine fan
        h_air = 25.0 + 1.8 * v_air_mps + 0.008 * engine_rpm

        # 1. Cylinder Heads Thermal ODE (4 independent nodes)
        for i in range(4):
            q_comb = (combustion_power_kw * 1000.0 * 0.28) * cylinder_fractions[i]
            q_coolant = 24.0 * (self.cht[i] - self.coolant_temp)
            q_air = h_air * 0.045 * (self.cht[i] - ambient_temp_c)

            d_cht_dt = (q_comb - q_coolant - q_air) / self.c_cyl_head
            self.cht[i] += d_cht_dt * dt
            # Physical bounds
            self.cht[i] = max(ambient_temp_c, min(250.0, self.cht[i]))

        # 2. Coolant Circuit Thermal ODE
        q_head_total = sum(24.0 * (self.cht[i] - self.coolant_temp) for i in range(4))
        # Radiator heat rejection (thermostatic opening above 75 deg C)
        thermostat_opening = max(0.05, min(1.0, (self.coolant_temp - 70.0) / 18.0))
        q_radiator = 45.0 * thermostat_opening * (1.0 + 0.04 * v_air_mps) * (self.coolant_temp - ambient_temp_c)

        d_coolant_dt = (q_head_total - q_radiator) / self.c_coolant
        self.coolant_temp += d_coolant_dt * dt
        self.coolant_temp = max(ambient_temp_c, min(140.0, self.coolant_temp))

        # 3. Engine Oil System Thermal ODE
        # Friction heat generation + piston undercrown oil cooling
        q_fric_oil = (combustion_power_kw * 1000.0 * 0.07) + (engine_rpm / 5800.0) ** 2 * 2200.0
        # Oil cooler heat exchanger
        oil_thermostat = max(0.1, min(1.0, (self.oil_temp - 75.0) / 20.0))
        q_oil_cooler = 38.0 * oil_thermostat * oil_cooler_airflow_scale * (1.0 + 0.03 * v_air_mps) * (self.oil_temp - ambient_temp_c)

        d_oil_dt = (q_fric_oil - q_oil_cooler) / self.c_oil_sump
        self.oil_temp += d_oil_dt * dt
        self.oil_temp = max(ambient_temp_c, min(160.0, self.oil_temp))

        # 4. Oil Hydraulic Pressure Calculation
        # Dynamic viscosity decreases exponentially with temperature
        oil_viscosity_rel = max(0.4, 1.0 - (self.oil_temp - 80.0) * 0.007)
        pump_delivery_factor = engine_rpm / 5500.0
        oil_pressure_bar = max(0.9, min(6.5, (1.8 + pump_delivery_factor * 3.4) * oil_viscosity_rel))

        return {
            "cht_c": [round(t, 2) for t in self.cht],
            "oil_temp_c": round(self.oil_temp, 2),
            "oil_press_bar": round(oil_pressure_bar, 2),
            "coolant_temp_c": round(self.coolant_temp, 2),
        }
