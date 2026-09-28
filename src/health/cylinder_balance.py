"""Cylinder-to-cylinder balance, spread analysis, and misfire detection."""

from typing import List, Dict, Tuple, Any
import numpy as np


class CylinderBalanceAnalyzer:
    """Monitors uniformity across all 4 cylinders to detect localized failures."""

    def __init__(
        self,
        max_egt_spread_caution_c: float = 50.0,
        max_egt_spread_alarm_c: float = 85.0,
        max_cht_spread_caution_c: float = 18.0,
        max_cht_spread_alarm_c: float = 28.0,
    ):
        self.max_egt_spread_caution = max_egt_spread_caution_c
        self.max_egt_spread_alarm = max_egt_spread_alarm_c
        self.max_cht_spread_caution = max_cht_spread_caution_c
        self.max_cht_spread_alarm = max_cht_spread_alarm_c

    def analyze(self, egt_c: List[float], cht_c: List[float]) -> Dict[str, Any]:
        """Calculates cylinder spreads, deviation from mean, and identifies outlier cylinder."""
        egt_arr = np.array(egt_c, dtype=np.float64)
        cht_arr = np.array(cht_c, dtype=np.float64)

        egt_spread = float(np.max(egt_arr) - np.min(egt_arr))
        cht_spread = float(np.max(cht_arr) - np.min(cht_arr))

        egt_mean = float(np.mean(egt_arr))
        cht_mean = float(np.mean(cht_arr))

        egt_devs = [float(t - egt_mean) for t in egt_arr]
        cht_devs = [float(t - cht_mean) for t in cht_arr]

        # Identify most abnormal cylinder
        worst_egt_idx = int(np.argmax(np.abs(egt_devs)))
        is_imbalanced = (egt_spread > self.max_egt_spread_caution) or (cht_spread > self.max_cht_spread_caution)

        imbalance_type = "NOMINAL"
        if is_imbalanced:
            if egt_devs[worst_egt_idx] > self.max_egt_spread_caution:
                imbalance_type = f"CYL_{worst_egt_idx+1}_LEAN_HOT"
            elif egt_devs[worst_egt_idx] < -self.max_egt_spread_caution:
                imbalance_type = f"CYL_{worst_egt_idx+1}_RICH_OR_MISFIRE"

        return {
            "egt_spread_c": round(egt_spread, 1),
            "cht_spread_c": round(cht_spread, 1),
            "egt_deviations_c": [round(d, 1) for d in egt_devs],
            "cht_deviations_c": [round(d, 1) for d in cht_devs],
            "is_imbalanced": is_imbalanced,
            "worst_cylinder_index": worst_egt_idx + 1,
            "imbalance_type": imbalance_type,
        }
