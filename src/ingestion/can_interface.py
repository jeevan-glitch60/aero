"""CAN Bus (CANaerospace / ARINC 825 / UAVCAN) Interface and Frame Parser."""

import struct
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from src.core.types import SensorFrame


@dataclass
class CANFrame:
    """Standard / Extended CAN frame representation."""
    arbitration_id: int
    data: bytes
    timestamp: float
    is_extended: bool = False
    dlc: int = 8


# Standard CAN Message IDs for Aero Engine Telemetry
CAN_ID_RPM_POWER = 0x200       # Engine RPM (uint16), Prop RPM (uint16), Throttle % (uint8), Wastegate % (uint8)
CAN_ID_MANIFOLD_AIR = 0x201    # MAP hPa (uint16), MAT degC (int16), Amb Press hPa (uint16)
CAN_ID_EGT_CYLINDERS = 0x202   # EGT1 (int16), EGT2 (int16), EGT3 (int16), EGT4 (int16)
CAN_ID_CHT_CYLINDERS = 0x203   # CHT1 (int16), CHT2 (int16), CHT3 (int16), CHT4 (int16)
CAN_ID_OIL_COOLANT = 0x204     # Oil Temp (int16), Oil Press cbar (uint16), Coolant Temp (int16), Fuel Press cbar (uint16)
CAN_ID_FUEL_ELECTRICAL = 0x205 # Fuel Flow cL/h (uint16), Bus Voltage cV (uint16), OAT int16 (0.1C)
CAN_ID_FLIGHT_STATE = 0x206    # Altitude m (int32), Airspeed c-kts (uint16)


def calculate_crc16(data: bytes) -> int:
    """Standard CCITT-FALSE CRC16 checksum calculation for avionics frames."""
    crc = 0xFFFF
    for byte in data:
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc


class CANBusEncoder:
    """Encodes high-level SensorFrame telemetry into physical CAN Bus frame packets."""

    @staticmethod
    def encode_sensor_frame(frame: SensorFrame) -> List[CANFrame]:
        frames = []
        t = frame.timestamp

        # 0x200: RPM & Throttle
        d0 = struct.pack(
            ">HHBBxx",
            int(frame.engine_rpm),
            int(frame.prop_rpm),
            int(min(100, max(0, frame.throttle_pct))),
            int(min(100, max(0, frame.wastegate_pct)))
        )
        frames.append(CANFrame(arbitration_id=CAN_ID_RPM_POWER, data=d0, timestamp=t))

        # 0x201: Manifold & Ambient Pressure
        d1 = struct.pack(
            ">HhHxx",
            int(frame.map_hpa),
            int(frame.mat_c * 10),
            int(frame.ambient_press_hpa)
        )
        frames.append(CANFrame(arbitration_id=CAN_ID_MANIFOLD_AIR, data=d1, timestamp=t))

        # 0x202: EGT Cylinders 1-4
        d2 = struct.pack(
            ">hhhh",
            int(frame.egt_c[0]),
            int(frame.egt_c[1]),
            int(frame.egt_c[2]),
            int(frame.egt_c[3])
        )
        frames.append(CANFrame(arbitration_id=CAN_ID_EGT_CYLINDERS, data=d2, timestamp=t))

        # 0x203: CHT Cylinders 1-4
        d3 = struct.pack(
            ">hhhh",
            int(frame.cht_c[0] * 10),
            int(frame.cht_c[1] * 10),
            int(frame.cht_c[2] * 10),
            int(frame.cht_c[3] * 10)
        )
        frames.append(CANFrame(arbitration_id=CAN_ID_CHT_CYLINDERS, data=d3, timestamp=t))

        # 0x204: Oil & Coolant & Fuel Pressure
        d4 = struct.pack(
            ">hHhH",
            int(frame.oil_temp_c * 10),
            int(frame.oil_press_bar * 100),
            int(frame.coolant_temp_c * 10),
            int(frame.fuel_press_bar * 100)
        )
        frames.append(CANFrame(arbitration_id=CAN_ID_OIL_COOLANT, data=d4, timestamp=t))

        # 0x205: Fuel Flow & Electrical
        d5 = struct.pack(
            ">HHhH",
            int(frame.fuel_flow_lph * 100),
            int(frame.bus_voltage_v * 100),
            int(frame.ambient_temp_c * 10),
            0
        )
        frames.append(CANFrame(arbitration_id=CAN_ID_FUEL_ELECTRICAL, data=d5, timestamp=t))

        # 0x206: Flight State
        d6 = struct.pack(
            ">iHxx",
            int(frame.altitude_m),
            int(frame.airspeed_kts * 100)
        )
        frames.append(CANFrame(arbitration_id=CAN_ID_FLIGHT_STATE, data=d6, timestamp=t))

        return frames


class CANBusDecoder:
    """Accumulates and decodes incoming CAN frames into a unified SensorFrame."""

    def __init__(self):
        self._latest_state: Dict[str, Any] = {
            "timestamp": 0.0,
            "engine_rpm": 0.0,
            "prop_rpm": 0.0,
            "throttle_pct": 0.0,
            "wastegate_pct": 0.0,
            "map_hpa": 1013.25,
            "mat_c": 20.0,
            "egt_c": [750.0, 750.0, 750.0, 750.0],
            "cht_c": [95.0, 95.0, 95.0, 95.0],
            "oil_temp_c": 90.0,
            "oil_press_bar": 3.5,
            "fuel_press_bar": 3.2,
            "fuel_flow_lph": 15.0,
            "coolant_temp_c": 85.0,
            "ambient_temp_c": 15.0,
            "ambient_press_hpa": 1013.25,
            "altitude_m": 0.0,
            "airspeed_kts": 0.0,
            "bus_voltage_v": 28.0,
        }

    def process_frame(self, frame: CANFrame) -> Optional[SensorFrame]:
        """Ingests a single CAN frame and updates current state."""
        self._latest_state["timestamp"] = frame.timestamp
        arb_id = frame.arbitration_id
        data = frame.data

        try:
            if arb_id == CAN_ID_RPM_POWER and len(data) >= 6:
                rpm, prop, thr, wg = struct.unpack(">HHBB", data[:6])
                self._latest_state["engine_rpm"] = float(rpm)
                self._latest_state["prop_rpm"] = float(prop)
                self._latest_state["throttle_pct"] = float(thr)
                self._latest_state["wastegate_pct"] = float(wg)

            elif arb_id == CAN_ID_MANIFOLD_AIR and len(data) >= 6:
                map_val, mat, amb_p = struct.unpack(">HhH", data[:6])
                self._latest_state["map_hpa"] = float(map_val)
                self._latest_state["mat_c"] = float(mat) / 10.0
                self._latest_state["ambient_press_hpa"] = float(amb_p)

            elif arb_id == CAN_ID_EGT_CYLINDERS and len(data) >= 8:
                egt1, egt2, egt3, egt4 = struct.unpack(">hhhh", data[:8])
                self._latest_state["egt_c"] = [float(egt1), float(egt2), float(egt3), float(egt4)]

            elif arb_id == CAN_ID_CHT_CYLINDERS and len(data) >= 8:
                cht1, cht2, cht3, cht4 = struct.unpack(">hhhh", data[:8])
                self._latest_state["cht_c"] = [
                    float(cht1) / 10.0,
                    float(cht2) / 10.0,
                    float(cht3) / 10.0,
                    float(cht4) / 10.0,
                ]

            elif arb_id == CAN_ID_OIL_COOLANT and len(data) >= 8:
                ot, op, ct, fp = struct.unpack(">hHhH", data[:8])
                self._latest_state["oil_temp_c"] = float(ot) / 10.0
                self._latest_state["oil_press_bar"] = float(op) / 100.0
                self._latest_state["coolant_temp_c"] = float(ct) / 10.0
                self._latest_state["fuel_press_bar"] = float(fp) / 100.0

            elif arb_id == CAN_ID_FUEL_ELECTRICAL and len(data) >= 6:
                ff, volt, oat = struct.unpack(">HHh", data[:6])
                self._latest_state["fuel_flow_lph"] = float(ff) / 100.0
                self._latest_state["bus_voltage_v"] = float(volt) / 100.0
                self._latest_state["ambient_temp_c"] = float(oat) / 10.0

            elif arb_id == CAN_ID_FLIGHT_STATE and len(data) >= 6:
                alt, ias = struct.unpack(">iH", data[:6])
                self._latest_state["altitude_m"] = float(alt)
                self._latest_state["airspeed_kts"] = float(ias) / 100.0

        except Exception as err:
            return None

        return self.get_latest_sensor_frame()

    def get_latest_sensor_frame(self) -> SensorFrame:
        return SensorFrame(**self._latest_state)
