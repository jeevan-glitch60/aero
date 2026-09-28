"""International Standard Atmosphere (ISA) model for MALE UAV flight conditions."""

import math
from typing import Tuple, Dict


class AtmosphereISA:
    """Computes standard atmospheric properties as a function of altitude."""

    # Physical constants
    G0 = 9.80665          # Standard acceleration of gravity (m/s^2)
    R_AIR = 287.05287     # Specific gas constant for dry air (J/(kg*K))
    GAMMA = 1.4           # Ratio of specific heats for air
    T0 = 288.15           # Sea-level standard temperature (K) = 15 deg C
    P0 = 101325.0         # Sea-level standard pressure (Pa) = 1013.25 hPa
    RHO0 = 1.225          # Sea-level standard density (kg/m^3)
    LAPSE_RATE = 0.0065   # Temperature lapse rate in troposphere (K/m)
    H_TROPOPAUSE = 11000. # Height of tropopause (m)

    @classmethod
    def get_state(cls, altitude_m: float, delta_t_isa_k: float = 0.0) -> Dict[str, float]:
        """Calculates temperature, pressure, density, and sound speed at a given altitude."""
        h = max(0.0, float(altitude_m))

        if h <= cls.H_TROPOPAUSE:
            # Troposphere
            t_std = cls.T0 - cls.LAPSE_RATE * h
            p = cls.P0 * (t_std / cls.T0) ** (cls.G0 / (cls.R_AIR * cls.LAPSE_RATE))
        else:
            # Lower Stratosphere (Isothermal)
            t_tropo = cls.T0 - cls.LAPSE_RATE * cls.H_TROPOPAUSE
            p_tropo = cls.P0 * (t_tropo / cls.T0) ** (cls.G0 / (cls.R_AIR * cls.LAPSE_RATE))
            dh = h - cls.H_TROPOPAUSE
            p = p_tropo * math.exp(-cls.G0 * dh / (cls.R_AIR * t_tropo))
            t_std = t_tropo

        # Apply non-standard ISA temperature deviation
        t_actual = t_std + delta_t_isa_k
        rho = p / (cls.R_AIR * t_actual)
        sound_speed = math.sqrt(cls.GAMMA * cls.R_AIR * t_actual)

        return {
            "altitude_m": h,
            "altitude_ft": h * 3.28084,
            "temperature_k": t_actual,
            "temperature_c": t_actual - 273.15,
            "pressure_pa": p,
            "pressure_hpa": p / 100.0,
            "pressure_inhg": p / 3386.389,
            "density_kg_m3": rho,
            "density_ratio_sigma": rho / cls.RHO0,
            "sound_speed_mps": sound_speed,
        }
