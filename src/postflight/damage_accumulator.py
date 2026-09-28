"""Cumulative damage, exceedance event logger, and equivalent hours calculator."""

from typing import List, Dict, Any


class FlightDamageAccumulator:
    """Computes mission damage severity, thermal cycles, and exceedance events."""

    @staticmethod
    def analyze_mission(records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyzes full flight records for maintenance accounting."""
        if not records:
            return {"status": "NO_DATA"}

        exceedances: List[Dict[str, Any]] = []
        high_power_seconds = 0.0
        thermal_cycles = 0

        prev_cht = records[0]["sensor"]["cht_c"][0]

        for r in records:
            s = r["sensor"]
            t = r["timestamp"]

            # Exceedance checks
            if s["engine_rpm"] > 5850.0:
                exceedances.append({"timestamp": t, "type": "OVERSPEED", "value": s["engine_rpm"], "limit": 5850.0})
            if max(s["cht_c"]) > 140.0:
                exceedances.append({"timestamp": t, "type": "CHT_OVERHEAT", "value": max(s["cht_c"]), "limit": 140.0})
            if max(s["egt_c"]) > 920.0:
                exceedances.append({"timestamp": t, "type": "EGT_OVERHEAT", "value": max(s["egt_c"]), "limit": 920.0})
            if s["oil_temp_c"] > 140.0:
                exceedances.append({"timestamp": t, "type": "OIL_OVERHEAT", "value": s["oil_temp_c"], "limit": 140.0})

            if s["throttle_pct"] > 85.0:
                high_power_seconds += 0.1

            # Thermal cycle detection
            curr_cht = s["cht_c"][0]
            if curr_cht > 115.0 and prev_cht <= 115.0:
                thermal_cycles += 1
            prev_cht = curr_cht

        total_flight_h = (records[-1]["timestamp"] - records[0]["timestamp"]) / 3600.0
        # Severity weighted equivalent operating hours
        severity_ratio = 1.0 + (high_power_seconds / 3600.0) * 0.5 + len(exceedances) * 0.1
        equivalent_operating_hours = total_flight_h * severity_ratio

        return {
            "flight_duration_hours": round(total_flight_h, 3),
            "equivalent_operating_hours": round(equivalent_operating_hours, 3),
            "severity_ratio": round(severity_ratio, 2),
            "exceedance_count": len(exceedances),
            "exceedance_events": exceedances[:20],  # top 20
            "thermal_cycles": thermal_cycles,
            "high_power_duration_minutes": round(high_power_seconds / 60.0, 1),
        }
