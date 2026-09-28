"""Unit tests for Physics & Thermodynamic simulation models."""

import pytest
import math
from src.physics.atmosphere import AtmosphereISA
from src.physics.turbocharger import TurbochargerModel
from src.physics.thermal_circuits import ThermalCircuitsModel
from src.physics.thermodynamic_model import ThermodynamicEngineModel
from src.physics.propeller import PropellerModel
from src.maps.performance_maps import PerformanceMapsEngine


def test_atmosphere_isa_sea_level():
    atmo = AtmosphereISA.get_state(0.0)
    assert pytest.approx(atmo["pressure_hpa"], rel=1e-3) == 1013.25
    assert pytest.approx(atmo["temperature_c"], rel=1e-3) == 15.0
    assert pytest.approx(atmo["density_kg_m3"], rel=1e-3) == 1.225


def test_atmosphere_isa_fl180():
    # 18,000 ft = 5486.4 m
    atmo = AtmosphereISA.get_state(5486.4)
    assert atmo["pressure_hpa"] < 520.0
    assert atmo["temperature_c"] < -15.0
    assert atmo["density_kg_m3"] < 0.75


def test_turbocharger_wastegate_boost():
    turbo = TurbochargerModel()
    # At 100% throttle sea level
    for _ in range(5):
        res_sl = turbo.compute(throttle_pct=100.0, ambient_press_hpa=1013.25, ambient_temp_c=15.0, air_mass_flow_g_s=50.0)
    assert res_sl["manifold_pressure_hpa"] > 1250.0
    assert res_sl["pressure_ratio"] > 1.25
    assert res_sl["mat_c"] > 15.0

    # At high altitude (5000m / 540 hPa ambient), wastegate closes to maintain boost
    for _ in range(5):
        res_alt = turbo.compute(throttle_pct=100.0, ambient_press_hpa=540.0, ambient_temp_c=-15.0, air_mass_flow_g_s=40.0)
    assert res_alt["pressure_ratio"] > 2.0
    assert res_alt["wastegate_pct"] < 30.0


def test_thermodynamic_engine_model():
    thermo = ThermodynamicEngineModel()
    maps = PerformanceMapsEngine()
    ve = maps.get_volumetric_efficiency(5500.0, 1550.0)
    
    state = thermo.compute(
        timestamp=10.0,
        engine_rpm=5500.0,
        map_hpa=1550.0,
        mat_c=35.0,
        ambient_temp_c=15.0,
        vol_eff=ve,
    )
    
    assert state.brake_power_hp > 120.0  # Max continuous power ~135 hp
    assert state.brake_power_hp < 145.0
    assert state.bsfc_g_per_kwh < 320.0
    assert len(state.cht_predicted_c) == 4
    assert len(state.egt_predicted_c) == 4


def test_thermal_circuits_integration():
    thermal = ThermalCircuitsModel()
    initial_cht = thermal.cht[0]
    
    # Step 10 seconds under high power
    for _ in range(100):
        res = thermal.step(
            dt_s=0.1,
            combustion_power_kw=100.0,
            cylinder_fractions=[0.25, 0.25, 0.25, 0.25],
            engine_rpm=5500.0,
            ambient_temp_c=20.0,
            airspeed_kts=80.0,
        )
    
    assert res["cht_c"][0] > initial_cht
    assert res["oil_temp_c"] > 70.0
    assert res["oil_press_bar"] > 2.0


def test_propeller_load_model():
    prop = PropellerModel()
    res = prop.compute(engine_rpm=5500.0, airspeed_kts=80.0, air_density_kg_m3=1.225)
    assert res["prop_rpm"] > 2000.0
    assert res["power_absorbed_hp"] > 40.0
    assert res["thrust_n"] > 400.0
