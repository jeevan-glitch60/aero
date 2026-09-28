"""Unit tests for Mission Simulation, Ingestion CAN parsing, and Flight Replay."""

import pytest
from src.simulation.mission_simulator import MissionSimulator
from src.ingestion.can_interface import CANBusEncoder, CANBusDecoder
from src.postflight.flight_recorder import FlightDataRecorder
from src.postflight.damage_accumulator import FlightDamageAccumulator
from src.postflight.mission_replayer import MissionReplayer


def test_can_encoder_decoder_roundtrip():
    sim = MissionSimulator()
    packet = sim.step(dt_real_s=0.1)
    sensor = packet.sensor

    # Encode to CAN frames
    frames = CANBusEncoder.encode_sensor_frame(sensor)
    assert len(frames) >= 6

    # Decode back from CAN frames
    decoder = CANBusDecoder()
    decoded_sensor = None
    for f in frames:
        decoded_sensor = decoder.process_frame(f)

    assert decoded_sensor is not None
    assert pytest.approx(decoded_sensor.engine_rpm, abs=2.0) == sensor.engine_rpm
    assert pytest.approx(decoded_sensor.map_hpa, abs=2.0) == sensor.map_hpa
    assert pytest.approx(decoded_sensor.oil_temp_c, abs=0.5) == sensor.oil_temp_c


def test_mission_simulator_fault_injection():
    sim = MissionSimulator()
    
    # Inject wastegate stuck open
    sim.fault_injector.inject_fault("FA-01", "Wastegate Stuck Open", severity_factor=0.9, start_time_s=0.0)
    
    # Step simulation
    packet = sim.step(dt_real_s=1.0)
    assert len(packet.simulation.active_faults) == 1
    assert packet.simulation.active_faults[0].fault_id == "FA-01"


def test_flight_damage_accumulator_and_replayer():
    sim = MissionSimulator()
    records = []
    
    for _ in range(50):
        pkt = sim.step(dt_real_s=1.0)
        records.append({
            "timestamp": pkt.sensor.timestamp,
            "sensor": pkt.sensor.model_dump(),
            "twin": pkt.twin.model_dump(),
            "residuals": pkt.residuals.model_dump(),
            "health": pkt.health.model_dump(),
            "rul": pkt.rul.model_dump(),
        })

    damage = FlightDamageAccumulator.analyze_mission(records)
    assert damage["flight_duration_hours"] > 0.0
    assert "severity_ratio" in damage

    replayer = MissionReplayer()
    replayer.load_records(records, "TestFlight")
    assert replayer.get_status()["total_frames"] == 50

    frame_mid = replayer.seek_to_percentage(50.0)
    assert frame_mid is not None
    assert replayer.get_status()["progress_pct"] == pytest.approx(50.0, abs=2.0)
