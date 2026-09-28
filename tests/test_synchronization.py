"""Unit tests for EKF State Synchronization and Adaptive Parameter Tracking."""

import pytest
import numpy as np
from src.core.types import SensorFrame, TwinThermodynamicState
from src.synchronization.kalman_filter import EngineExtendedKalmanFilter
from src.synchronization.parameter_tracker import AdaptiveParameterTracker


def test_ekf_update_and_residual_calculation():
    ekf = EngineExtendedKalmanFilter()
    
    sensor = SensorFrame(
        timestamp=1.0,
        engine_rpm=5000.0,
        prop_rpm=1967.0,
        throttle_pct=70.0,
        wastegate_pct=25.0,
        map_hpa=1450.0,
        mat_c=32.0,
        egt_c=[780.0, 785.0, 782.0, 788.0],
        cht_c=[98.0, 99.0, 97.0, 101.0],
        oil_temp_c=92.0,
        oil_press_bar=3.8,
        fuel_press_bar=3.2,
        fuel_flow_lph=22.5,
        coolant_temp_c=86.0,
        ambient_temp_c=15.0,
        ambient_press_hpa=1013.25,
        altitude_m=1000.0,
        airspeed_kts=85.0,
    )

    twin = TwinThermodynamicState(
        timestamp=1.0,
        map_predicted_hpa=1440.0,
        mat_predicted_c=30.0,
        egt_predicted_c=[780.0, 780.0, 780.0, 780.0],
        cht_predicted_c=[98.0, 98.0, 98.0, 98.0],
        oil_temp_predicted_c=90.0,
        oil_press_predicted_bar=3.7,
        coolant_temp_predicted_c=85.0,
        indicated_power_hp=120.0,
        brake_power_hp=105.0,
        friction_power_hp=15.0,
        brake_torque_nm=150.0,
        bsfc_g_per_kwh=270.0,
        thermal_efficiency_pct=34.0,
        volumetric_efficiency_pct=88.0,
        air_mass_flow_g_per_s=45.0,
        fuel_mass_flow_g_per_s=4.6,
        turbo_pressure_ratio=1.45,
        turbo_speed_rpm=80000.0,
        intercooler_effectiveness=0.78,
        target_lambda=0.92,
    )

    x_hat, residuals = ekf.update(sensor, twin)

    assert len(x_hat) == 8
    assert residuals.mahalanobis_distance >= 0.0
    assert residuals.anomaly_score_pct >= 0.0
    assert not residuals.is_anomaly  # Nominal frame should not be anomalous


def test_adaptive_parameter_tracker():
    tracker = AdaptiveParameterTracker()
    from src.core.types import InnovationResiduals

    res = InnovationResiduals(
        timestamp=1.0,
        residual_map_hpa=-120.0,
        residual_mat_c=15.0,
        residual_egt_c=[0.0, 60.0, 0.0, 0.0],
        residual_cht_c=[0.0, 10.0, 0.0, 0.0],
        residual_oil_temp_c=12.0,
        residual_oil_press_bar=-0.4,
        residual_fuel_flow_lph=-1.5,
        mahalanobis_distance=4.2,
        anomaly_score_pct=65.0,
        is_anomaly=True,
    )

    for _ in range(20):
        tracker.update(res)

    params = tracker.get_tracked_parameters()
    assert params["intercooler_fouling_index"] > 0.0
    assert params["cylinder_injector_trims"][1] > 0.0
    assert params["oil_cooler_restriction_index"] > 0.0
