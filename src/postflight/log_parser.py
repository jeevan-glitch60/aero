"""Flight log parser and summary extractor."""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional


class FlightLogParser:
    """Parses recorded flight mission logs and computes flight statistics."""

    @staticmethod
    def parse_jsonl(file_path: str) -> List[Dict[str, Any]]:
        """Reads JSON Lines flight telemetry log into a list of dictionaries."""
        records = []
        path = Path(file_path)
        if not path.exists():
            return records

        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        records.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
        return records

    @staticmethod
    def compute_summary(records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Computes flight summary metrics, extremes, and duration."""
        if not records:
            return {"error": "Empty flight record"}

        dur_s = records[-1]["timestamp"] - records[0]["timestamp"]
        rpms = [r["sensor"]["engine_rpm"] for r in records]
        maps = [r["sensor"]["map_hpa"] for r in records]
        chts = [max(r["sensor"]["cht_c"]) for r in records]
        egts = [max(r["sensor"]["egt_c"]) for r in records]
        oils = [r["sensor"]["oil_temp_c"] for r in records]
        alts = [r["sensor"]["altitude_m"] for r in records]

        return {
            "total_records": len(records),
            "flight_duration_minutes": round(dur_s / 60.0, 1),
            "max_rpm": round(max(rpms), 1),
            "max_map_hpa": round(max(maps), 1),
            "max_cht_c": round(max(chts), 1),
            "max_egt_c": round(max(egts), 1),
            "max_oil_temp_c": round(max(oils), 1),
            "max_altitude_m": round(max(alts), 1),
            "max_altitude_ft": round(max(alts) * 3.28084, 0),
        }
