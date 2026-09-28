"""REST API endpoints for digital twin telemetry, simulation, health, and replay."""

from typing import Dict, Any, Optional, List
import math
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from src.core.types import UnifiedTwinPacket, HealthSeverity
from src.core.config import get_config_manager
from src.simulation.mission_simulator import MissionSimulator
from src.postflight.damage_accumulator import FlightDamageAccumulator
from src.postflight.mission_replayer import MissionReplayer

router = APIRouter(prefix="/api")

# In-memory singletons accessed by routes
_simulator_instance: Optional[MissionSimulator] = None
_replayer_instance: Optional[MissionReplayer] = None


def get_simulator() -> MissionSimulator:
    global _simulator_instance
    if _simulator_instance is None:
        cfg = get_config_manager()
        _simulator_instance = MissionSimulator(flight_profiles=cfg.flight_profiles)
    return _simulator_instance


def get_replayer() -> MissionReplayer:
    global _replayer_instance
    if _replayer_instance is None:
        _replayer_instance = MissionReplayer()
    return _replayer_instance


class SimulationControlRequest(BaseModel):
    is_paused: Optional[bool] = None
    time_scale: Optional[float] = Field(None, ge=0.1, le=20.0)
    manual_override: Optional[bool] = None
    throttle_pct: Optional[float] = Field(None, ge=0.0, le=100.0)
    altitude_m: Optional[float] = Field(None, ge=0.0, le=12000.0)
    airspeed_kts: Optional[float] = Field(None, ge=0.0, le=200.0)
    oat_c: Optional[float] = Field(None, ge=-50.0, le=55.0)


class FaultInjectionRequest(BaseModel):
    fault_id: str
    name: str
    severity_factor: float = Field(default=1.0, ge=0.1, le=1.0)
    duration_s: Optional[float] = None


class MissionSelectRequest(BaseModel):
    mission_id: str


@router.get("/status")
def get_system_status():
    """Returns general digital twin system status and configuration summary."""
    cfg = get_config_manager()
    return {
        "status": "ONLINE",
        "engine_model": cfg.get_engine_meta().get("name", "Rotax 915 iS UAV"),
        "version": "1.0.0",
        "operating_limits": cfg.get_operating_limits(),
    }


@router.get("/telemetry/current")
def get_current_telemetry(sim: MissionSimulator = Depends(get_simulator)) -> UnifiedTwinPacket:
    """Returns the latest synchronized digital twin state packet."""
    if sim.latest_packet is None:
        return sim.step(dt_real_s=0.1)
    return sim.latest_packet


@router.post("/simulation/control")
def control_simulation(
    req: SimulationControlRequest,
    sim: MissionSimulator = Depends(get_simulator),
):
    """Updates simulation run parameters, manual throttle/altitude controls, and pause state."""
    if req.is_paused is not None:
        sim.is_paused = req.is_paused
    if req.time_scale is not None:
        sim.time_scale = req.time_scale
    if req.manual_override is not None:
        sim.manual_override = req.manual_override
    if req.throttle_pct is not None:
        sim.manual_throttle_pct = req.throttle_pct
        sim.manual_override = True
    if req.altitude_m is not None:
        sim.manual_altitude_m = req.altitude_m
        sim.manual_override = True
    if req.airspeed_kts is not None:
        sim.manual_airspeed_kts = req.airspeed_kts
    if req.oat_c is not None:
        sim.manual_oat_c = req.oat_c

    return {
        "success": True,
        "is_paused": sim.is_paused,
        "time_scale": sim.time_scale,
        "manual_override": sim.manual_override,
        "throttle_pct": sim.manual_throttle_pct,
        "altitude_m": sim.manual_altitude_m,
    }


@router.post("/simulation/mission")
def select_mission(
    req: MissionSelectRequest,
    sim: MissionSimulator = Depends(get_simulator),
):
    """Switches active mission profile."""
    sim.set_mission(req.mission_id)
    return {"success": True, "active_mission": req.mission_id}


@router.post("/simulation/inject-fault")
def inject_fault(
    req: FaultInjectionRequest,
    sim: MissionSimulator = Depends(get_simulator),
):
    """Dynamically injects a failure mode into the engine simulation."""
    fault_state = sim.fault_injector.inject_fault(
        fault_id=req.fault_id,
        name=req.name,
        severity_factor=req.severity_factor,
        start_time_s=sim.mission_elapsed_s,
        duration_s=req.duration_s,
    )
    return {"success": True, "injected_fault": fault_state.model_dump()}


@router.post("/simulation/clear-faults")
def clear_faults(sim: MissionSimulator = Depends(get_simulator)):
    """Clears all active fault injections."""
    sim.fault_injector.clear_all()
    return {"success": True, "active_faults_count": 0}


class SingleFaultClearRequest(BaseModel):
    fault_id: str


@router.post("/simulation/clear-fault")
def clear_single_fault(
    req: SingleFaultClearRequest,
    sim: MissionSimulator = Depends(get_simulator),
):
    """Removes a specific active fault injection."""
    sim.fault_injector.clear_fault(req.fault_id)
    return {
        "success": True,
        "cleared_fault_id": req.fault_id,
        "active_faults_count": len(sim.fault_injector.get_active_faults()),
    }


@router.post("/simulation/reset")
def reset_simulation(sim: MissionSimulator = Depends(get_simulator)):
    """Resets the simulation elapsed time, phase, and clears all faults."""
    sim.set_mission(sim.current_mission_id)
    sim.fault_injector.clear_all()
    return {"success": True, "message": "Simulation reset to phase 0"}


@router.post("/simulation/step")
def step_simulation(sim: MissionSimulator = Depends(get_simulator)):
    """Single-steps the simulation by 0.1s even if paused."""
    was_paused = sim.is_paused
    sim.is_paused = False
    pkt = sim.step(dt_real_s=0.1)
    sim.is_paused = was_paused
    return {"success": True, "elapsed_time_s": sim.mission_elapsed_s}


@router.get("/maps/query")
def query_performance_maps(
    rpm: float = 5000.0,
    map_hpa: float = 1400.0,
    power_hp: float = 100.0,
    sim: MissionSimulator = Depends(get_simulator),
):
    """Queries calibrated engine maps."""
    vol_eff = sim.maps.get_volumetric_efficiency(rpm, map_hpa)
    bsfc = sim.maps.get_bsfc(rpm, power_hp)
    ign = sim.maps.get_ignition_advance(rpm, map_hpa)
    comp_eff = sim.maps.get_compressor_efficiency(45.0, map_hpa / 1013.25)

    return {
        "engine_rpm": rpm,
        "map_hpa": map_hpa,
        "volumetric_efficiency_pct": round(vol_eff * 100.0, 1),
        "bsfc_g_per_kwh": round(bsfc, 1),
        "ignition_advance_deg_btdc": round(ign, 1),
        "compressor_efficiency_pct": round(comp_eff * 100.0, 1),
    }


@router.get("/postflight/demo-data")
def generate_demo_flight_records(sim: MissionSimulator = Depends(get_simulator)):
    """Generates a 300-point historical mission dataset for instant replay testing."""
    records = []
    # Temporary simulator instance to synthesize 300 timestamps
    demo_sim = MissionSimulator(flight_profiles=get_config_manager().flight_profiles)
    demo_sim.set_mission("standard_isr_18h")
    
    # Inject an intentional fault mid-flight for replay demonstration (e.g. CAC fouling at step 150)
    for i in range(250):
        if i == 140:
            demo_sim.fault_injector.inject_fault("FA-02", "Intercooler Fouling", severity_factor=0.85, start_time_s=i*2.0)
        pkt = demo_sim.step(dt_real_s=2.0)
        records.append({
            "timestamp": pkt.sensor.timestamp,
            "sensor": pkt.sensor.model_dump(),
            "twin": pkt.twin.model_dump(),
            "residuals": pkt.residuals.model_dump(),
            "health": pkt.health.model_dump(),
            "rul": pkt.rul.model_dump(),
        })

    replayer = get_replayer()
    replayer.load_records(records, log_name="Standard_ISR_Replay_Demo")
    damage = FlightDamageAccumulator.analyze_mission(records)

    return {
        "success": True,
        "total_records": len(records),
        "log_name": "Standard_ISR_Replay_Demo",
        "damage_report": damage,
    }


@router.get("/postflight/replay/frame")
def get_replay_frame(
    index: Optional[int] = None,
    pct: Optional[float] = None,
    step: Optional[int] = None,
    replayer: MissionReplayer = Depends(get_replayer),
):
    """Retrieves or steps replay frame."""
    if not replayer.records:
        # Auto-initialize demo data
        generate_demo_flight_records()

    if index is not None:
        frame = replayer.seek_to_index(index)
    elif pct is not None:
        frame = replayer.seek_to_percentage(pct)
    elif step is not None:
        frame = replayer.next_frame(step_size=step)
    else:
        frame = replayer.get_current_frame()

    return {
        "frame": frame,
        "status": replayer.get_status(),
    }


# ============================================================================
# ALERTS & DIAGNOSTICS APIS
# ============================================================================

_alerts_store: List[Dict[str, Any]] = [
    {
        "id": "ALT-2025-081",
        "timestamp": "14:28:12",
        "timestamp_epoch": 1726058892,
        "type": "Overheating Trend",
        "category": "Thermal",
        "severity": "CRITICAL",
        "message": "Cylinder #2 CHT rate-of-rise (+4.2°C/min) with high EGT spread",
        "status": "ACTIVE",
        "evidence": [
            "EGT rising 3.2°C/min while engine RPM is steady at 5,100",
            "CHT 8.4°C above baseline envelope for cruise loiter phase",
            "Vibration harmonic at 2× RPM increased by 45% (torque ripple)",
        ],
        "predicted_cause": "Likely fuel injector partial clogging in cylinder 2 (confidence 74%)",
        "recommended_action": "Limit maximum power to 85% for remainder of mission. Schedule injector borescope inspection after landing.",
        "affected_metrics": ["CHT", "EGT", "Vibration 2x"],
    },
    {
        "id": "ALT-2025-079",
        "timestamp": "13:52:40",
        "timestamp_epoch": 1726056760,
        "type": "Injector Abnormality",
        "category": "Fuel Injection",
        "severity": "WARNING",
        "message": "Intermittent lean mixture detected on cylinder #2 during climb phase",
        "status": "ACKNOWLEDGED",
        "evidence": [
            "Lambda sensor indicated 1.12 vs 0.94 target",
            "Exhaust gas temperature spread delta exceeded 45°C",
            "Subtle misfire signature detected on crankshaft speed sensor",
        ],
        "predicted_cause": "Fuel delivery imbalance / varnish buildup in injector nozzle",
        "recommended_action": "Monitor cylinder head temperatures. Avoid sustained wide-open throttle climbs.",
        "affected_metrics": ["EGT Spread", "Lambda", "Fuel Flow"],
    },
    {
        "id": "ALT-2025-074",
        "timestamp": "11:15:04",
        "timestamp_epoch": 1726047304,
        "type": "Sensor Drift",
        "category": "Avionics",
        "severity": "INFO",
        "message": "Barometric pressure vs MAP discrepancy detected at engine idle",
        "status": "RESOLVED",
        "evidence": [
            "MAP reading diverged +24 hPa from reference ambient barometer before start",
            "Residual self-corrected once turbocharger wastegate initialized",
        ],
        "predicted_cause": "Cold manifold sensor thermal stabilization delay",
        "recommended_action": "No immediate pilot action required. Re-check pre-flight calibration at next service.",
        "affected_metrics": ["MAP", "Baro Ref"],
    },
]


class AlertActionRequest(BaseModel):
    alert_id: str
    action: str  # "acknowledge", "resolve", "mute"


@router.get("/alerts")
def get_alerts(sim: MissionSimulator = Depends(get_simulator)):
    """Returns all active, acknowledged, and historical alerts with explainability evidence."""
    # Also integrate any live diagnosed faults from current packet
    if sim.latest_packet and sim.latest_packet.health.isolated_faults:
        for fault in sim.latest_packet.health.isolated_faults:
            existing = next((a for a in _alerts_store if a.get("fault_id") == fault.fault_id), None)
            if not existing:
                _alerts_store.insert(0, {
                    "id": f"ALT-LIVE-{fault.fault_id}",
                    "fault_id": fault.fault_id,
                    "timestamp": "LIVE",
                    "timestamp_epoch": int(sim.mission_elapsed_s),
                    "type": fault.name,
                    "category": fault.category,
                    "severity": fault.severity.value,
                    "message": fault.description,
                    "status": "ACTIVE",
                    "evidence": fault.evidence_bullets,
                    "predicted_cause": f"Diagnosed {fault.name} with {fault.confidence_pct}% confidence.",
                    "recommended_action": fault.recommended_action,
                    "affected_metrics": fault.affected_metrics,
                })

    active_count = sum(1 for a in _alerts_store if a["status"] == "ACTIVE")
    critical_count = sum(1 for a in _alerts_store if a["severity"] == "CRITICAL")
    warning_count = sum(1 for a in _alerts_store if a["severity"] == "WARNING")
    info_count = sum(1 for a in _alerts_store if a["severity"] == "INFO")

    return {
        "summary": {
            "total": len(_alerts_store),
            "active": active_count,
            "critical": critical_count,
            "warning": warning_count,
            "info": info_count,
        },
        "alerts": _alerts_store,
    }


@router.post("/alerts/action")
def update_alert_action(req: AlertActionRequest):
    """Acknowledges, resolves, or mutes a specific alert."""
    for a in _alerts_store:
        if a["id"] == req.alert_id:
            if req.action == "acknowledge":
                a["status"] = "ACKNOWLEDGED"
            elif req.action == "resolve":
                a["status"] = "RESOLVED"
            elif req.action == "mute":
                a["status"] = "MUTED"
            return {"success": True, "alert": a}
    raise HTTPException(status_code=404, detail="Alert not found")


# ============================================================================
# SCENARIOS WHAT-IF SIMULATION APIS
# ============================================================================

class ScenarioSimRequest(BaseModel):
    altitude_delta_ft: float = 0.0
    ambient_temp_delta_c: float = 0.0
    mission_profile: str = "endurance"
    oil_pump_degradation_pct: float = 0.0
    injector_clogging: str = "none"
    sensor_drift_cht: float = 0.0
    sensor_drift_egt: float = 0.0


@router.post("/scenarios/simulate")
def simulate_scenario(req: ScenarioSimRequest):
    """Executes physics-informed what-if comparative simulation over mission envelope."""
    points = 60
    times = [i * 3.0 for i in range(points)]  # minutes
    
    # Base profiles
    baseline_cht = []
    baseline_egt = []
    baseline_oil_t = []
    baseline_vib = []
    baseline_rul = []

    scenario_cht = []
    scenario_egt = []
    scenario_oil_t = []
    scenario_vib = []
    scenario_rul = []

    # Profile factor
    p_factor = 1.0
    if req.mission_profile == "high_power":
        p_factor = 1.22
    elif req.mission_profile == "hot_high":
        p_factor = 1.15
    elif req.mission_profile == "rapid_throttle":
        p_factor = 1.18

    # Fault impacts
    inj_clog_egt = 0.0
    if req.injector_clogging == "mild":
        inj_clog_egt = 35.0
    elif req.injector_clogging == "moderate":
        inj_clog_egt = 65.0
    elif req.injector_clogging == "severe":
        inj_clog_egt = 110.0

    oil_pump_stress = req.oil_pump_degradation_pct * 0.45

    for t in times:
        # Flight progress cycle (Climb -> Loiter -> Descent)
        cycle = 0.8 + 0.25 * math.sin(t / 15.0)
        
        # Baseline (Standard ISA day, zero fault)
        b_cht = 104.0 + 12.0 * cycle
        b_egt = 780.0 + 40.0 * cycle
        b_oil = 86.0 + 8.0 * cycle
        b_vib = 1.1 + 0.2 * cycle
        b_rul = max(80.0, 124.0 - (t / 60.0) * 0.8)

        # Scenario (Modified conditions + deltas)
        temp_effect = req.ambient_temp_delta_c * 0.65
        alt_effect = (req.altitude_delta_ft / 1000.0) * 1.8
        
        s_cht = b_cht * p_factor + temp_effect + alt_effect * 0.5 + req.sensor_drift_cht + (inj_clog_egt * 0.25)
        s_egt = b_egt * p_factor + temp_effect * 0.8 + inj_clog_egt + req.sensor_drift_egt
        s_oil = b_oil * p_factor + temp_effect * 0.85 + oil_pump_stress
        s_vib = b_vib * p_factor + (0.6 if req.injector_clogging != "none" else 0.0) + (oil_pump_stress * 0.03)
        
        # Scenario RUL decays faster under thermal and mechanical overload
        excess_stress = max(0.0, (s_cht - 120.0) * 0.03) + max(0.0, (s_oil - 100.0) * 0.04) + (inj_clog_egt * 0.005)
        s_rul = max(40.0, 124.0 - (t / 60.0) * (0.8 + excess_stress * 1.5))

        baseline_cht.append(round(b_cht, 1))
        baseline_egt.append(round(b_egt, 1))
        baseline_oil_t.append(round(b_oil, 1))
        baseline_vib.append(round(b_vib, 2))
        baseline_rul.append(round(b_rul, 1))

        scenario_cht.append(round(s_cht, 1))
        scenario_egt.append(round(s_egt, 1))
        scenario_oil_t.append(round(s_oil, 1))
        scenario_vib.append(round(s_vib, 2))
        scenario_rul.append(round(s_rul, 1))

    # Impact summaries
    base_final_rul = baseline_rul[-1]
    scen_final_rul = scenario_rul[-1]
    delta_rul = scen_final_rul - base_final_rul
    delta_pct = (delta_rul / base_final_rul) * 100.0

    peak_cht_delta = max(scenario_cht) - max(baseline_cht)
    peak_egt_delta = max(scenario_egt) - max(baseline_egt)

    thermal_stress_pct = round((peak_cht_delta / 120.0) * 100.0, 1)
    mech_stress_pct = round(((max(scenario_vib) - max(baseline_vib)) / 1.5) * 100.0, 1)
    lub_stress_pct = round(((max(scenario_oil_t) - max(baseline_oil_t)) / 95.0) * 100.0, 1)

    recommendations = []
    if peak_cht_delta > 10.0:
        recommendations.append("Limit max continuous power lever angle to 85% to constrain cylinder head thermal climb.")
    if scen_final_rul < 100.0:
        recommendations.append("Advance scheduled 100-hour line inspection by 15 flight hours.")
    if req.altitude_delta_ft > 5000:
        recommendations.append("Monitor turbocharger compressor discharge pressure ratio to prevent surge margin erosion.")
    if req.injector_clogging != "none":
        recommendations.append("Schedule ultrasonic cleaning and flow calibration for fuel injection rack.")
    if not recommendations:
        recommendations.append("Mission envelope operates within nominal STANAG/CS-E safety margins.")

    return {
        "success": True,
        "time_points_min": times,
        "baseline": {
            "cht": baseline_cht,
            "egt": baseline_egt,
            "oil_temp": baseline_oil_t,
            "vibration": baseline_vib,
            "rul": baseline_rul,
        },
        "scenario": {
            "cht": scenario_cht,
            "egt": scenario_egt,
            "oil_temp": scenario_oil_t,
            "vibration": scenario_vib,
            "rul": scenario_rul,
        },
        "summary": {
            "baseline_rul_hours": base_final_rul,
            "scenario_rul_hours": scen_final_rul,
            "delta_rul_hours": round(delta_rul, 1),
            "delta_rul_pct": round(delta_pct, 1),
            "peak_cht_delta_c": round(peak_cht_delta, 1),
            "peak_egt_delta_c": round(peak_egt_delta, 1),
            "thermal_stress_pct": thermal_stress_pct,
            "mechanical_stress_pct": mech_stress_pct,
            "lubrication_stress_pct": lub_stress_pct,
            "recommendations": recommendations,
        }
    }


# ============================================================================
# MISSIONS & HISTORICAL ANALYTICS APIS
# ============================================================================

_missions_catalog: List[Dict[str, Any]] = [
    {
        "id": "M-2025-07-14",
        "name": "ISR-North Border Surveillance",
        "date": "2025-07-14",
        "duration_h": 18.0,
        "uav_id": "UAV-03",
        "type": "ISR",
        "max_alt_ft": 18500,
        "avg_rpm": 5020,
        "max_cht_c": 118.4,
        "max_egt_c": 845.0,
        "health_score": 91,
        "faults_count": 1,
        "damage_pct": 2.4,
    },
    {
        "id": "M-2025-08-02",
        "name": "High-Altitude Reconnaissance FL250",
        "date": "2025-08-02",
        "duration_h": 14.5,
        "uav_id": "UAV-03",
        "type": "High-Alt",
        "max_alt_ft": 25200,
        "avg_rpm": 5450,
        "max_cht_c": 124.8,
        "max_egt_c": 892.0,
        "health_score": 84,
        "faults_count": 2,
        "damage_pct": 4.1,
    },
    {
        "id": "M-2025-08-20",
        "name": "Hot & High Desert Proving Trial",
        "date": "2025-08-20",
        "duration_h": 8.2,
        "uav_id": "UAV-02",
        "type": "Test",
        "max_alt_ft": 12000,
        "avg_rpm": 5200,
        "max_cht_c": 132.5,
        "max_egt_c": 870.0,
        "health_score": 79,
        "faults_count": 3,
        "damage_pct": 5.8,
    },
    {
        "id": "M-2025-09-01",
        "name": "Maritime Patrol & Search (South Basin)",
        "date": "2025-09-01",
        "duration_h": 16.0,
        "uav_id": "UAV-03",
        "type": "Maritime",
        "max_alt_ft": 9500,
        "avg_rpm": 4850,
        "max_cht_c": 112.0,
        "max_egt_c": 820.0,
        "health_score": 95,
        "faults_count": 0,
        "damage_pct": 1.2,
    },
]


@router.get("/missions")
def get_missions_list():
    """Returns historical mission records with summary statistics."""
    return {"missions": _missions_catalog}


@router.get("/missions/{mission_id}")
def get_mission_detail(mission_id: str):
    """Returns detailed telemetry, health trends, and damage records for a mission."""
    m = next((item for item in _missions_catalog if item["id"] == mission_id), None)
    if not m:
        raise HTTPException(status_code=404, detail="Mission not found")

    # Generate synthetic historical curves for this mission
    hours = [i * (m["duration_h"] / 20.0) for i in range(21)]
    health_trend = [round(100.0 - (100.0 - m["health_score"]) * (i / 20.0) ** 0.8, 1) for i in range(21)]
    rul_trend = [round(150.0 - (i / 20.0) * m["duration_h"] * 1.2, 1) for i in range(21)]

    return {
        "mission": m,
        "timeline": {
            "hours": hours,
            "health_score": health_trend,
            "rul_hours": rul_trend,
        },
        "alerts": [
            {"time": "04:12:00", "severity": "WARNING", "type": "EGT Imbalance", "message": "Exhaust gas spread delta +38°C during step climb"},
            {"time": "08:45:00", "severity": "INFO", "type": "Wastegate Trim", "message": "Barometric compensation adjusted boost reference"},
        ] if m["faults_count"] > 0 else []
    }


# ============================================================================
# SETTINGS & THRESHOLDS APIS
# ============================================================================

_thresholds_store: Dict[str, Any] = {
    "cht": {"name": "Cylinder Head Temp", "warning": 125.0, "critical": 135.0, "unit": "°C"},
    "egt": {"name": "Exhaust Gas Temp", "warning": 880.0, "critical": 920.0, "unit": "°C"},
    "oil_press": {"name": "Oil Pressure", "warning": 2.0, "critical": 1.5, "unit": "bar", "is_min": True},
    "oil_temp": {"name": "Oil Temperature", "warning": 120.0, "critical": 130.0, "unit": "°C"},
    "vibration": {"name": "Engine Vibration", "warning": 2.0, "critical": 2.8, "unit": "g"},
    "fuel_press": {"name": "Fuel Pressure", "warning": 2.8, "critical": 2.4, "unit": "bar", "is_min": True},
}


class ThresholdUpdateRequest(BaseModel):
    thresholds: Dict[str, Dict[str, float]]


@router.get("/settings/thresholds")
def get_thresholds():
    """Returns current operational alert and limit thresholds."""
    return {"thresholds": _thresholds_store}


@router.post("/settings/thresholds")
def update_thresholds(req: ThresholdUpdateRequest):
    """Updates operational alert thresholds."""
    for key, val in req.thresholds.items():
        if key in _thresholds_store:
            if "warning" in val:
                _thresholds_store[key]["warning"] = val["warning"]
            if "critical" in val:
                _thresholds_store[key]["critical"] = val["critical"]
    return {"success": True, "thresholds": _thresholds_store}


# ============================================================================
# FLEET MANAGEMENT & AIRFRAME REGISTRY APIS
# ============================================================================

_FLEET_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "fleet_registry.json"

_DEFAULT_FLEET: List[Dict[str, Any]] = [
    {
        "id": "UAV-01",
        "name": "UAV #01 [Recon]",
        "callsign": "Valkyrie-1",
        "tail_number": "AF-9021",
        "airframe": "AeroTwin MALE Mk II",
        "engine_model": "Rotax 915 iS (141 hp)",
        "flight_hours": 342.5,
        "status": "Standby",
        "health_score": 88,
        "location": "Hangar 2 - Base Alpha",
        "is_default": True,
        "notes": "Post-mission inspection completed. Ready for sortie."
    },
    {
        "id": "UAV-02",
        "name": "UAV #02 [Patrol]",
        "callsign": "Valkyrie-2",
        "tail_number": "AF-9022",
        "airframe": "AeroTwin MALE Mk I",
        "engine_model": "Rotax 915 iS (141 hp)",
        "flight_hours": 512.8,
        "status": "Maintenance",
        "health_score": 79,
        "location": "Depot Line 4",
        "is_default": True,
        "notes": "Scheduled 500h turbocharger and injector borescope check."
    },
    {
        "id": "UAV-03",
        "name": "UAV #03 [Active]",
        "callsign": "Valkyrie-3",
        "tail_number": "AF-9023",
        "airframe": "AeroTwin MALE Mk II",
        "engine_model": "Rotax 915 iS (141 hp)",
        "flight_hours": 182.4,
        "status": "Active",
        "health_score": 92,
        "location": "Combat Air Patrol FL180",
        "is_default": True,
        "notes": "Primary digital twin node streaming 10 Hz STANAG 4586 telemetry."
    },
    {
        "id": "UAV-04",
        "name": "UAV #04 [High-Alt]",
        "callsign": "Valkyrie-4",
        "tail_number": "AF-9024",
        "airframe": "AeroTwin MALE Mk III",
        "engine_model": "Rotax 916 iS (160 hp)",
        "flight_hours": 45.0,
        "status": "Standby",
        "health_score": 98,
        "location": "Ready Hangar 1",
        "is_default": True,
        "notes": "High ceiling configuration with intercooler optimization."
    }
]

_active_uav_id: str = "UAV-03"
_fleet_store: List[Dict[str, Any]] = []


def _load_fleet() -> List[Dict[str, Any]]:
    global _fleet_store, _active_uav_id
    if _fleet_store:
        return _fleet_store
    if _FLEET_CONFIG_PATH.exists():
        try:
            with open(_FLEET_CONFIG_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                _fleet_store = data.get("fleet", [dict(u) for u in _DEFAULT_FLEET])
                _active_uav_id = data.get("active_uav_id", "UAV-03")
                return _fleet_store
        except Exception:
            pass
    _fleet_store = [dict(u) for u in _DEFAULT_FLEET]
    _active_uav_id = "UAV-03"
    return _fleet_store


def _save_fleet():
    try:
        data = {
            "active_uav_id": _active_uav_id,
            "fleet": _fleet_store
        }
        with open(_FLEET_CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


class UAVCreateRequest(BaseModel):
    id: str = Field(..., min_length=2, max_length=30, description="Unique UAV Identifier / Callsign")
    name: Optional[str] = Field(None, max_length=60)
    callsign: Optional[str] = Field(None, max_length=40)
    tail_number: Optional[str] = Field(None, max_length=30)
    airframe: str = Field(default="AeroTwin MALE Mk II", max_length=60)
    engine_model: str = Field(default="Rotax 915 iS (141 hp)", max_length=60)
    flight_hours: float = Field(default=0.0, ge=0.0)
    status: str = Field(default="Standby")
    location: Optional[str] = Field(default="Main Operations Base", max_length=60)
    notes: Optional[str] = Field(default="", max_length=200)


class UAVSelectRequest(BaseModel):
    uav_id: str


@router.get("/fleet")
@router.get("/uavs")
def get_fleet():
    """Returns the complete registered UAV fleet and currently monitored digital twin node."""
    fleet = _load_fleet()
    active_count = sum(1 for u in fleet if u.get("status") == "Active")
    standby_count = sum(1 for u in fleet if u.get("status") == "Standby")
    maint_count = sum(1 for u in fleet if u.get("status") == "Maintenance")
    avg_health = round(sum(u.get("health_score", 90) for u in fleet) / len(fleet), 1) if fleet else 100.0

    return {
        "active_uav_id": _active_uav_id,
        "total_count": len(fleet),
        "summary": {
            "active": active_count,
            "standby": standby_count,
            "maintenance": maint_count,
            "avg_health": avg_health,
        },
        "fleet": fleet,
    }


@router.post("/fleet")
@router.post("/uavs")
def create_uav(req: UAVCreateRequest):
    """Commissions a new UAV airframe and digital twin node into the fleet."""
    global _active_uav_id
    fleet = _load_fleet()
    uav_id = req.id.strip().upper()

    # Check for duplicate
    if any(u["id"].upper() == uav_id for u in fleet):
        raise HTTPException(status_code=400, detail=f"Airframe with identifier '{uav_id}' is already registered.")

    name = req.name.strip() if req.name else f"{uav_id} [Commissioned]"
    callsign = req.callsign.strip() if req.callsign else uav_id
    tail = req.tail_number.strip() if req.tail_number else f"AF-{uav_id.replace('UAV-', '')}"
    status = req.status if req.status in ["Active", "Standby", "Maintenance"] else "Standby"

    new_uav = {
        "id": uav_id,
        "name": name,
        "callsign": callsign,
        "tail_number": tail,
        "airframe": req.airframe,
        "engine_model": req.engine_model,
        "flight_hours": round(req.flight_hours, 1),
        "status": status,
        "health_score": 96,
        "location": req.location or "Forward Operating Base Alpha",
        "is_default": False,
        "notes": req.notes or "Commissioned via AeroTwin GCS fleet manager.",
    }

    fleet.append(new_uav)

    # If status is active, make it the currently monitored UAV
    if status == "Active":
        for u in fleet:
            if u["id"] != uav_id and u.get("status") == "Active":
                u["status"] = "Standby"
        _active_uav_id = uav_id

    _save_fleet()

    return {
        "success": True,
        "message": f"UAV '{uav_id}' successfully commissioned into digital twin fleet.",
        "active_uav_id": _active_uav_id,
        "uav": new_uav,
    }


@router.post("/fleet/select")
def select_active_uav(req: UAVSelectRequest):
    """Switches the active digital twin telemetry monitoring context to the selected UAV."""
    global _active_uav_id
    fleet = _load_fleet()
    target_id = req.uav_id.strip().upper()

    match = next((u for u in fleet if u["id"].upper() == target_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"UAV '{target_id}' not found in registered fleet.")

    _active_uav_id = match["id"]
    # Update status in fleet list
    for u in fleet:
        if u["id"] == match["id"]:
            u["status"] = "Active"
        elif u["status"] == "Active":
            u["status"] = "Standby"

    _save_fleet()
    return {
        "success": True,
        "active_uav_id": _active_uav_id,
        "uav": match,
    }


@router.delete("/fleet/{uav_id}")
@router.delete("/uavs/{uav_id}")
def delete_uav(uav_id: str):
    """Decommissions and removes a UAV from the fleet."""
    global _active_uav_id
    fleet = _load_fleet()
    target_id = uav_id.strip().upper()

    match = next((u for u in fleet if u["id"].upper() == target_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"UAV '{target_id}' not found in registered fleet.")

    if len(fleet) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only remaining airframe in the fleet.")

    fleet.remove(match)

    # If active UAV was deleted, switch to the first remaining UAV
    if _active_uav_id.upper() == target_id:
        _active_uav_id = fleet[0]["id"]
        fleet[0]["status"] = "Active"

    _save_fleet()
    return {
        "success": True,
        "message": f"UAV '{target_id}' successfully decommissioned.",
        "active_uav_id": _active_uav_id,
        "remaining_count": len(fleet),
    }


# ============================================================================
# DEFENCE-GRADE INTEGRATION & ASSURANCE LAYER APIS
# ============================================================================

@router.get("/assurance/status")
def get_assurance_status():
    """Returns assurance layer posture, safety disclaimers, and data quality metrics."""
    return {
        "disclaimer": "DEMONSTRATOR MODE — SYNTHETIC DATA — READ-ONLY ADVISORY DIGITAL TWIN — NOT CONNECTED TO LIVE AIRCRAFT OR DEFENCE SYSTEMS.",
        "read_only": True,
        "security_posture": {
            "read_only_ingestion": True,
            "synthetic_data_mode": True,
            "mock_external_adapters": True,
            "audit_logging": True,
            "direct_control_commands": False,
            "real_aircraft_connectivity": False,
        },
        "supported_roles": [
            "Operator",
            "Propulsion Engineer",
            "Maintenance Engineer",
            "System Administrator",
            "Observer / Demo User",
        ],
        "assurance_standards": ["STANAG 4586", "MIL-STD-810H (Synthetic Envelope)", "DO-178C (Concept Roadmap)"],
    }


@router.get("/assurance/adapters")
def get_assurance_adapters():
    """Returns the list of supported demonstrator adapters and connection states."""
    return {
        "adapters": [
            {
                "adapterId": "adapter-synth-01",
                "adapterType": "SyntheticEngineSimulatorAdapter",
                "connectionStatus": "Synthetic Simulator Connected",
                "dataSource": "Internal AeroTwin MVEM Physics Loop (10 Hz)",
                "readOnly": True,
                "isMock": False,
            },
            {
                "adapterId": "adapter-gcs-mirror",
                "adapterType": "MockGCSMirrorAdapter",
                "connectionStatus": "Authorized GCS Mirror Active",
                "dataSource": "Decoded Read-Only Telemetry Mirror (Synthetic)",
                "readOnly": True,
                "isMock": True,
                "notes": "Mock adapter — no live external connection.",
            },
            {
                "adapterId": "adapter-can-mock",
                "adapterType": "MockSocketCANAdapter",
                "connectionStatus": "Mock CAN Bus Active",
                "dataSource": "Simulated CAN 2.0B / CAN-FD Frames (Synthetic)",
                "readOnly": True,
                "isMock": True,
                "notes": "Mock adapter — no live external connection.",
            },
            {
                "adapterId": "adapter-csv-replay",
                "adapterType": "CSVReplayAdapter",
                "connectionStatus": "Offline Replay Mode",
                "dataSource": "Historical Mission Telemetry Log Archive",
                "readOnly": True,
                "isMock": False,
            },
        ]
    }


