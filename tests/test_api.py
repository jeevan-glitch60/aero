"""Integration tests for FastAPI endpoints and WebSocket streaming."""

import pytest
from starlette.testclient import TestClient
from src.api.server import create_app

app = create_app()
client = TestClient(app)


def test_api_status_endpoint():
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ONLINE"
    assert "Rotax" in data["engine_model"]


def test_api_telemetry_current_endpoint():
    res = client.get("/api/telemetry/current")
    assert res.status_code == 200
    data = res.json()
    assert "sensor" in data
    assert "twin" in data
    assert "residuals" in data
    assert "health" in data
    assert "rul" in data
    assert "simulation" in data


def test_api_simulation_control():
    res = client.post("/api/simulation/control", json={
        "throttle_pct": 75.0,
        "altitude_m": 4000.0,
        "is_paused": False
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["throttle_pct"] == 75.0


def test_api_fault_injection_and_clear():
    res = client.post("/api/simulation/inject-fault", json={
        "fault_id": "FA-03",
        "name": "Cyl #2 Injector Clog",
        "severity_factor": 0.9
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["injected_fault"]["fault_id"] == "FA-03"

    # Clear faults
    res_clear = client.post("/api/simulation/clear-faults")
    assert res_clear.status_code == 200
    assert res_clear.json()["active_faults_count"] == 0


def test_api_maps_query():
    res = client.get("/api/maps/query?rpm=5000&map_hpa=1400&power_hp=100")
    assert res.status_code == 200
    data = res.json()
    assert data["volumetric_efficiency_pct"] > 80.0
    assert data["bsfc_g_per_kwh"] > 200.0


def test_api_postflight_demo_data():
    res = client.get("/api/postflight/demo-data")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total_records"] > 0
    assert "damage_report" in data


def test_api_alerts_and_actions():
    res = client.get("/api/alerts")
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "alerts" in data
    assert len(data["alerts"]) > 0
    first_alert = data["alerts"][0]
    assert "evidence" in first_alert
    assert "predicted_cause" in first_alert

    # Acknowledge
    res_ack = client.post("/api/alerts/action", json={"alert_id": first_alert["id"], "action": "acknowledge"})
    assert res_ack.status_code == 200
    assert res_ack.json()["alert"]["status"] == "ACKNOWLEDGED"


def test_api_scenarios_simulate():
    res = client.post("/api/scenarios/simulate", json={
        "altitude_delta_ft": 2000.0,
        "ambient_temp_delta_c": 10.0,
        "mission_profile": "hot_high",
        "injector_clogging": "mild",
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "baseline" in data
    assert "scenario" in data
    assert "summary" in data
    assert len(data["summary"]["recommendations"]) > 0


def test_api_missions_endpoints():
    res = client.get("/api/missions")
    assert res.status_code == 200
    data = res.json()
    assert "missions" in data
    assert len(data["missions"]) > 0

    first_mission_id = data["missions"][0]["id"]
    res_det = client.get(f"/api/missions/{first_mission_id}")
    assert res_det.status_code == 200
    det_data = res_det.json()
    assert det_data["mission"]["id"] == first_mission_id
    assert "timeline" in det_data


def test_api_settings_thresholds():
    res = client.get("/api/settings/thresholds")
    assert res.status_code == 200
    data = res.json()
    assert "thresholds" in data
    assert "cht" in data["thresholds"]

    # Update threshold
    res_update = client.post("/api/settings/thresholds", json={
        "thresholds": {"cht": {"warning": 126.0, "critical": 136.0}}
    })
    assert res_update.status_code == 200
    assert res_update.json()["thresholds"]["cht"]["warning"] == 126.0


def test_api_fleet_management():
    # 1. Query initial fleet
    res = client.get("/api/fleet")
    assert res.status_code == 200
    data = res.json()
    assert "fleet" in data
    assert "active_uav_id" in data
    assert data["total_count"] >= 4
    initial_count = data["total_count"]

    # 2. Add a new UAV
    new_uav_payload = {
        "id": "UAV-99",
        "name": "UAV #99 [Titan]",
        "callsign": "Titan-99",
        "tail_number": "AF-9099",
        "airframe": "AeroTwin MALE Mk III",
        "engine_model": "Rotax 916 iS (160 hp)",
        "flight_hours": 12.5,
        "status": "Active",
        "location": "Forward Operating Base Charlie",
        "notes": "Commissioned for test verification"
    }
    res_create = client.post("/api/fleet", json=new_uav_payload)
    assert res_create.status_code == 200
    create_data = res_create.json()
    assert create_data["success"] is True
    assert create_data["uav"]["id"] == "UAV-99"
    assert create_data["active_uav_id"] == "UAV-99"

    # 3. Prevent duplicate UAV ID
    res_dup = client.post("/api/fleet", json=new_uav_payload)
    assert res_dup.status_code == 400

    # 4. Switch active UAV back to UAV-03
    res_select = client.post("/api/fleet/select", json={"uav_id": "UAV-03"})
    assert res_select.status_code == 200
    assert res_select.json()["active_uav_id"] == "UAV-03"

    # 5. Delete test UAV
    res_del = client.delete("/api/fleet/UAV-99")
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # 6. Verify count returned to initial
    res_final = client.get("/api/fleet")
    assert res_final.status_code == 200
    assert res_final.json()["total_count"] == initial_count

