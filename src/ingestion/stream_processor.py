"""Stream processor for telemetry validation, jitter correction, and outlier filtering."""

from collections import deque
from typing import Optional, List, Deque
import numpy as np
from src.core.types import SensorFrame


class StreamProcessor:
    """Sanitizes, filters, and buffers real-time engine telemetry streams."""

    def __init__(self, window_size: int = 50, rate_limit_rpm_per_s: float = 8000.0):
        self.window_size = window_size
        self.rate_limit_rpm_per_s = rate_limit_rpm_per_s
        self.buffer: Deque[SensorFrame] = deque(maxlen=window_size)
        self.last_valid_frame: Optional[SensorFrame] = None

    def process(self, frame: SensorFrame) -> SensorFrame:
        """Applies sanitization, rate-of-change clamping, and outlier rejection."""
        if self.last_valid_frame is None:
            self.last_valid_frame = frame
            self.buffer.append(frame)
            return frame

        dt = frame.timestamp - self.last_valid_frame.timestamp
        if dt <= 0:
            # Monotonicity correction
            frame = frame.model_copy(update={"timestamp": self.last_valid_frame.timestamp + 0.02})
            dt = 0.02

        # 1. Rate-of-change sanity checks
        max_rpm_delta = self.rate_limit_rpm_per_s * dt
        clamped_rpm = frame.engine_rpm
        if abs(frame.engine_rpm - self.last_valid_frame.engine_rpm) > max_rpm_delta:
            sign = 1.0 if frame.engine_rpm > self.last_valid_frame.engine_rpm else -1.0
            clamped_rpm = self.last_valid_frame.engine_rpm + sign * max_rpm_delta

        # 2. Hard physical bounds clamping
        cleaned_data = frame.model_dump()
        cleaned_data["engine_rpm"] = max(0.0, min(7000.0, clamped_rpm))
        cleaned_data["prop_rpm"] = max(0.0, min(3000.0, frame.prop_rpm))
        cleaned_data["map_hpa"] = max(200.0, min(2500.0, frame.map_hpa))
        cleaned_data["oil_temp_c"] = max(-30.0, min(160.0, frame.oil_temp_c))
        cleaned_data["oil_press_bar"] = max(0.0, min(10.0, frame.oil_press_bar))
        cleaned_data["fuel_flow_lph"] = max(0.0, min(80.0, frame.fuel_flow_lph))
        cleaned_data["altitude_m"] = max(-100.0, min(12000.0, frame.altitude_m))

        cleaned_egt = [max(0.0, min(1100.0, t)) for t in frame.egt_c]
        cleaned_cht = [max(-30.0, min(250.0, t)) for t in frame.cht_c]
        cleaned_data["egt_c"] = cleaned_egt
        cleaned_data["cht_c"] = cleaned_cht

        sanitized_frame = SensorFrame(**cleaned_data)
        self.last_valid_frame = sanitized_frame
        self.buffer.append(sanitized_frame)

        return sanitized_frame

    def get_window(self) -> List[SensorFrame]:
        return list(self.buffer)

    def get_latest(self) -> Optional[SensorFrame]:
        return self.last_valid_frame
