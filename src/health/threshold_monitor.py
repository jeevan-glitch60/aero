"""Threshold exceedance monitoring complying with CS-E / FAR-33 aero engine standards."""

from typing import List, Dict, Tuple, Any
from src.core.types import SensorFrame, HealthSeverity


class ThresholdMonitor:
    """Monitors raw and sanitized telemetry against aircraft operational limit envelopes."""

    def __init__(self, thresholds_config: Dict[str, Any] = None):
        self.limits = thresholds_config or {
            "rpm": {"caution_max": 5500.0, "alarm_max": 5850.0},
            "map_hpa": {"caution_max": 1650.0, "alarm_max": 1750.0},
            "cht_c": {"caution_max": 135.0, "alarm_max": 140.0},
            "egt_c": {"caution_max": 880.0, "alarm_max": 920.0},
            "oil_temp_c": {"caution_min": 50.0, "caution_max": 130.0, "alarm_max": 140.0},
            "oil_press_bar": {"alarm_min": 1.5, "caution_min": 2.0, "caution_max": 6.0, "alarm_max": 7.0},
            "fuel_press_bar": {"alarm_min": 2.5, "caution_min": 2.8, "caution_max": 3.6, "alarm_max": 3.8},
        }
        self.alarm_counters: Dict[str, int] = {}
        self.caution_counters: Dict[str, int] = {}
        self.debounce_threshold = 2  # frames required to latch alert

    def evaluate(self, sensor: SensorFrame) -> Tuple[List[str], List[str], HealthSeverity]:
        """Evaluates sensor limits and returns active alarms, cautions, and overall severity."""
        alarms: List[str] = []
        cautions: List[str] = []

        # 1. Engine RPM
        if sensor.engine_rpm > self.limits["rpm"]["alarm_max"]:
            alarms.append(f"OVERSPEED ALARM: Engine RPM {sensor.engine_rpm:.0f} > {self.limits['rpm']['alarm_max']:.0f}")
        elif sensor.engine_rpm > self.limits["rpm"]["caution_max"]:
            cautions.append(f"RPM CAUTION: Engine RPM {sensor.engine_rpm:.0f} > {self.limits['rpm']['caution_max']:.0f}")

        # 2. Manifold Pressure (MAP)
        if sensor.map_hpa > self.limits["map_hpa"]["alarm_max"]:
            alarms.append(f"OVERBOOST ALARM: MAP {sensor.map_hpa:.0f} hPa > {self.limits['map_hpa']['alarm_max']:.0f}")
        elif sensor.map_hpa > self.limits["map_hpa"]["caution_max"]:
            cautions.append(f"BOOST CAUTION: MAP {sensor.map_hpa:.0f} hPa > {self.limits['map_hpa']['caution_max']:.0f}")

        # 3. Cylinder Head Temperatures (CHT 1-4)
        for i, cht in enumerate(sensor.cht_c):
            if cht > self.limits["cht_c"]["alarm_max"]:
                alarms.append(f"CHT OVERHEAT ALARM: Cyl #{i+1} at {cht:.1f}°C > {self.limits['cht_c']['alarm_max']:.1f}°C")
            elif cht > self.limits["cht_c"]["caution_max"]:
                cautions.append(f"CHT HIGH CAUTION: Cyl #{i+1} at {cht:.1f}°C > {self.limits['cht_c']['caution_max']:.1f}°C")

        # 4. Exhaust Gas Temperatures (EGT 1-4)
        for i, egt in enumerate(sensor.egt_c):
            if egt > self.limits["egt_c"]["alarm_max"]:
                alarms.append(f"EGT HIGH ALARM: Cyl #{i+1} at {egt:.0f}°C > {self.limits['egt_c']['alarm_max']:.0f}°C")
            elif egt > self.limits["egt_c"]["caution_max"]:
                cautions.append(f"EGT HIGH CAUTION: Cyl #{i+1} at {egt:.0f}°C > {self.limits['egt_c']['caution_max']:.0f}°C")

        # 5. Oil Temperature & Pressure
        if sensor.oil_temp_c > self.limits["oil_temp_c"]["alarm_max"]:
            alarms.append(f"OIL OVERHEAT ALARM: Oil Temp {sensor.oil_temp_c:.1f}°C > {self.limits['oil_temp_c']['alarm_max']:.1f}°C")
        elif sensor.oil_temp_c > self.limits["oil_temp_c"]["caution_max"]:
            cautions.append(f"OIL TEMP CAUTION: Oil Temp {sensor.oil_temp_c:.1f}°C > {self.limits['oil_temp_c']['caution_max']:.1f}°C")
        elif sensor.oil_temp_c < self.limits["oil_temp_c"]["caution_min"] and sensor.engine_rpm > 2500.0:
            cautions.append(f"OIL COLD SOAK: Oil Temp {sensor.oil_temp_c:.1f}°C < {self.limits['oil_temp_c']['caution_min']:.1f}°C")

        if sensor.oil_press_bar < self.limits["oil_press_bar"]["alarm_min"]:
            alarms.append(f"LOW OIL PRESSURE ALARM: {sensor.oil_press_bar:.2f} bar < {self.limits['oil_press_bar']['alarm_min']:.2f} bar")
        elif sensor.oil_press_bar < self.limits["oil_press_bar"]["caution_min"] and sensor.engine_rpm > 3000.0:
            cautions.append(f"LOW OIL PRESSURE CAUTION: {sensor.oil_press_bar:.2f} bar")

        # 6. Overall Severity Classification
        if len(alarms) > 0:
            severity = HealthSeverity.CRITICAL
        elif len(cautions) > 0:
            severity = HealthSeverity.CAUTION
        else:
            severity = HealthSeverity.NORMAL

        return alarms, cautions, severity
