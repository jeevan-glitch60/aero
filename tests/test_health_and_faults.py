"""Unit tests for Threshold Exceedances, Cylinder Balance, and Fault Isolation."""

import pytest
from src.core.types import SensorFrame, TwinThermodynamicState, InnovationResiduals, HealthSeverity
from src.health.threshold_monitor import ThresholdMonitor
from src.health.cylinder_balance import CylinderBalanceAnalyzer
from src.health.fault_isolator import FaultIsolator
from src.health.anomaly_detector import ResidualAnomalyDetector


def test_threshold_monitor_exceedance():
    mon = ThresholdMonitor()
    
    # Overheating frame
    hot_sensor = SensorFrame(
        timestamp=1.0,
        engine_rpm=5900.0,      # Overspeed alarm
        prop_rpm=2321.0,
        throttle_pct=100.0,
        wastegate_pct=10.0,
        map_hpa=1780.0,         # Overboost alarm
        mat_c=45.0,
        egt_c=[930.0, 935.0, 928.0, 932.0],  # EGT alarm
        cht_c=[142.0, 141.0, 139.0, 143.0],  # CHT alarm
        oil_temp_c=145.0,       # Oil overheat alarm
        oil_press_bar=1.2,      # Low oil press alarm
        fuel_press_bar=3.2,
        fuel_flow_lph=40.0,
        coolant_temp_c=118.0,
        ambient_temp_c=35.0,
        ambient_press_hpa=1013.25,
        altitude_m=500.0,
        airspeed_kts=90.0,
    )

    alarms, cautions, severity = mon.evaluate(hot_sensor)
    assert len(alarms) >= 4
    assert severity == HealthSeverity.CRITICAL


def test_cylinder_balance_analyzer():
    analyzer = CylinderBalanceAnalyzer()
    
    # Severe lean imbalance on Cylinder 2
    egt = [740.0, 830.0, 745.0, 742.0]
    cht = [95.0, 122.0, 96.0, 94.0]
    
    res = analyzer.analyze(egt, cht)
    assert res["is_imbalanced"] is True
    assert res["worst_cylinder_index"] == 2
    assert "CYL_2_LEAN_HOT" in res["imbalance_type"]
    assert res["egt_spread_c"] >= 85.0


def test_fault_isolation_matrix_injector_clog():
    isolator = FaultIsolator()
    balance_analyzer = CylinderBalanceAnalyzer()

    sensor = SensorFrame(
        timestamp=1.0,
        engine_rpm=5000.0,
        prop_rpm=1967.0,
        throttle_pct=70.0,
        wastegate_pct=30.0,
        map_hpa=1400.0,
        mat_c=30.0,
        egt_c=[750.0, 835.0, 752.0, 748.0],
        cht_c=[95.0, 120.0, 96.0, 95.0],
        oil_temp_c=90.0,
        oil_press_bar=3.5,
        fuel_press_bar=3.2,
        fuel_flow_lph=20.0,
        coolant_temp_c=85.0,
        ambient_temp_c=15.0,
        ambient_press_hpa=1013.25,
        altitude_m=2000.0,
        airspeed_kts=80.0,
    )

    twin = TwinThermodynamicState(
        timestamp=1.0,
        map_predicted_hpa=1400.0,
        mat_predicted_c=30.0,
        egt_predicted_c=[750.0, 750.0, 750.0, 750.0],
        cht_predicted_c=[95.0, 95.0, 95.0, 95.0],
        oil_temp_predicted_c=90.0,
        oil_press_predicted_bar=3.5,
        coolant_temp_predicted_c=85.0,
        indicated_power_hp=110.0,
        brake_power_hp=95.0,
        friction_power_hp=15.0,
        brake_torque_nm=135.0,
        bsfc_g_per_kwh=275.0,
        thermal_efficiency_pct=33.0,
        volumetric_efficiency_pct=88.0,
        air_mass_flow_g_per_s=42.0,
        fuel_mass_flow_g_per_s=4.2,
        turbo_pressure_ratio=1.4,
        turbo_speed_rpm=78000.0,
        intercooler_effectiveness=0.78,
        target_lambda=0.92,
    )

    residuals = InnovationResiduals(
        timestamp=1.0,
        residual_map_hpa=0.0,
        residual_mat_c=0.0,
        residual_egt_c=[0.0, 85.0, 2.0, -2.0],
        residual_cht_c=[0.0, 25.0, 1.0, 0.0],
        residual_oil_temp_c=0.0,
        residual_oil_press_bar=0.0,
        residual_fuel_flow_lph=0.0,
        mahalanobis_distance=4.5,
        anomaly_score_pct=65.0,
        is_anomaly=True,
    )

    bal = balance_analyzer.analyze(sensor.egt_c, sensor.cht_c)
    diagnostics = isolator.isolate_faults(sensor, twin, residuals, bal)

    assert len(diagnostics) > 0
    top_fault = diagnostics[0]
    assert top_fault.fault_id == "FA-03"  # Cylinder 2 injector clog
    assert top_fault.confidence_pct > 70.0
