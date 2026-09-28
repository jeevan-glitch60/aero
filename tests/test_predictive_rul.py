"""Unit tests for Predictive Analytics, Wear Models, and RUL Estimation."""

import pytest
from src.predictive.wear_models import SubsystemWearModels
from src.predictive.rul_estimator import RemainingUsefulLifeEstimator
from src.predictive.ml_pipeline import DegradationMLPipeline


def test_wear_accumulation_under_harsh_conditions():
    wear = SubsystemWearModels()
    init_liner = wear.piston_ring_damage
    init_valve = wear.exhaust_valve_damage

    # Accumulate 3600 seconds (1 hour) of high heat/power
    for _ in range(360):
        wear.accumulate_step(
            dt_s=10.0,
            engine_rpm=5800.0,
            map_hpa=1650.0,
            max_egt_c=890.0,
            max_cht_c=135.0,
            oil_temp_c=125.0,
            turbo_rpm=135000.0,
        )

    assert wear.piston_ring_damage > init_liner
    assert wear.exhaust_valve_damage > init_valve
    assert wear.equivalent_operating_hours > 96.0


def test_rul_estimation_confidence_bounds():
    wear = SubsystemWearModels()
    wear.piston_ring_damage = 0.20
    wear.exhaust_valve_damage = 0.15
    estimator = RemainingUsefulLifeEstimator(wear)

    rul = estimator.estimate(current_flight_severity=1.2)
    assert rul.estimated_rul_hours > 0.0
    assert rul.rul_p10_hours < rul.estimated_rul_hours
    assert rul.rul_p90_hours > rul.estimated_rul_hours
    assert rul.maintenance_urgency in ["NOMINAL_FLIGHT_READY", "PLAN_INSPECTION_NEXT_50H_CHECK", "URGENT_OVERHAUL_REQUIRED"]


def test_ml_degradation_pipeline():
    ml = DegradationMLPipeline()
    features = [1.0, 1.0, 0.95, 0.90, 0.85, 0.5, 1.2]
    import numpy as np
    feat_arr = np.array(features, dtype=np.float64)
    rate = ml.predict_degradation_rate(feat_arr)
    assert rate > 0.5
    assert rate < 3.0
