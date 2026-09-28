"""Interactive Mission Replayer with timeline scrubbing and playback control."""

from typing import List, Dict, Any, Optional
from src.postflight.log_parser import FlightLogParser


class MissionReplayer:
    """Manages playback of historical flight logs with timeline scrubbing and speed control."""

    def __init__(self):
        self.records: List[Dict[str, Any]] = []
        self.current_index: int = 0
        self.is_playing: bool = False
        self.playback_speed: float = 1.0
        self.log_filename: str = "default_demo"

    def load_records(self, records: List[Dict[str, Any]], log_name: str = "loaded_mission"):
        """Loads flight records into memory."""
        self.records = records
        self.current_index = 0
        self.is_playing = False
        self.log_filename = log_name

    def load_from_file(self, file_path: str) -> bool:
        """Loads and parses a JSON Lines log file."""
        records = FlightLogParser.parse_jsonl(file_path)
        if records:
            self.load_records(records, log_name=file_path)
            return True
        return False

    def seek_to_index(self, index: int) -> Optional[Dict[str, Any]]:
        """Seeks to a specific frame index."""
        if not self.records:
            return None
        self.current_index = max(0, min(len(self.records) - 1, index))
        return self.records[self.current_index]

    def seek_to_percentage(self, pct: float) -> Optional[Dict[str, Any]]:
        """Seeks to percentage (0.0 to 100.0) of flight timeline."""
        if not self.records:
            return None
        idx = int((max(0.0, min(100.0, pct)) / 100.0) * (len(self.records) - 1))
        return self.seek_to_index(idx)

    def next_frame(self, step_size: int = 1) -> Optional[Dict[str, Any]]:
        """Advances replay playback by step_size frames."""
        if not self.records:
            return None
        self.current_index = min(len(self.records) - 1, self.current_index + step_size)
        return self.records[self.current_index]

    def get_current_frame(self) -> Optional[Dict[str, Any]]:
        if not self.records or self.current_index >= len(self.records):
            return None
        return self.records[self.current_index]

    def get_status(self) -> Dict[str, Any]:
        total = len(self.records)
        progress = (self.current_index / max(1, total - 1)) * 100.0 if total > 1 else 0.0
        return {
            "log_name": self.log_filename,
            "total_frames": total,
            "current_frame": self.current_index,
            "progress_pct": round(progress, 1),
            "is_playing": self.is_playing,
            "playback_speed": self.playback_speed,
        }
