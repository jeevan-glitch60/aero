"""Flight data recorder saving high-rate telemetry and digital twin states to log files."""

import json
import time
from pathlib import Path
from typing import List, Optional
from src.core.types import UnifiedTwinPacket


class FlightDataRecorder:
    """Logs high-resolution flight telemetry and twin packets for post-flight analysis."""

    def __init__(self, log_dir: Optional[str] = None):
        if log_dir is None:
            base_path = Path(__file__).resolve().parent.parent.parent
            self.log_dir = base_path / "logs"
        else:
            self.log_dir = Path(log_dir)

        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.is_recording = False
        self.current_log_path: Optional[Path] = None
        self._record_buffer: List[dict] = []

    def start_recording(self, flight_name: str = "uav_flight_mission"):
        """Initializes a new recording session."""
        timestamp_str = str(int(time.time()))
        filename = f"{flight_name}_{timestamp_str}.jsonl"
        self.current_log_path = self.log_dir / filename
        self.is_recording = True
        self._record_buffer.clear()

    def record_packet(self, packet: UnifiedTwinPacket):
        """Buffers packet and writes to disk."""
        if not self.is_recording or self.current_log_path is None:
            return

        record = {
            "timestamp": packet.sensor.timestamp,
            "sensor": packet.sensor.model_dump(),
            "twin": packet.twin.model_dump(),
            "residuals": packet.residuals.model_dump(),
            "health": packet.health.model_dump(),
            "rul": packet.rul.model_dump(),
        }
        self._record_buffer.append(record)

        # Flush in batches
        if len(self._record_buffer) >= 20:
            self.flush()

    def flush(self):
        """Flushes recorded buffer to JSON Lines file."""
        if not self.current_log_path or not self._record_buffer:
            return

        with open(self.current_log_path, "a", encoding="utf-8") as f:
            for item in self._record_buffer:
                f.write(json.dumps(item) + "\n")
        self._record_buffer.clear()

    def stop_recording(self) -> Optional[str]:
        """Stops active recording and returns log path."""
        self.flush()
        self.is_recording = False
        path = str(self.current_log_path) if self.current_log_path else None
        self.current_log_path = None
        return path
