"""Physics-Residual and Statistical Anomaly Detection Engine (Mahalanobis + CUSUM)."""

import numpy as np
from typing import Dict, Any, List
from src.core.types import InnovationResiduals


class ResidualAnomalyDetector:
    """Detects incipient degradation and anomalous trends from innovation sequences."""

    def __init__(self, cusum_threshold: float = 12.0, cusum_drift: float = 0.5):
        self.cusum_threshold = cusum_threshold
        self.cusum_drift = cusum_drift
        
        # Positive and negative CUSUM accumulators
        self.cusum_pos = 0.0
        self.cusum_neg = 0.0
        self.anomaly_history: List[float] = []

    def evaluate(self, residuals: InnovationResiduals) -> Dict[str, Any]:
        """Processes latest residuals and updates anomaly score and CUSUM status."""
        d_m = residuals.mahalanobis_distance

        # CUSUM update on Mahalanobis distance (nominal baseline is ~1.5 - 2.5)
        baseline = 2.0
        z = d_m - baseline
        self.cusum_pos = max(0.0, self.cusum_pos + z - self.cusum_drift)
        self.cusum_neg = max(0.0, self.cusum_neg - z - self.cusum_drift)

        cusum_alarm = self.cusum_pos > self.cusum_threshold

        # Composite Anomaly Score (0 to 100%)
        # Normal operation: < 20%
        # Mild anomaly: 20% - 50%
        # Severe anomaly: > 50%
        composite_score = min(100.0, (d_m / 3.5) ** 2 * 25.0 + (self.cusum_pos / self.cusum_threshold) * 35.0)

        self.anomaly_history.append(composite_score)
        if len(self.anomaly_history) > 100:
            self.anomaly_history.pop(0)

        smoothed_score = float(np.mean(self.anomaly_history[-10:]))

        return {
            "mahalanobis_distance": round(d_m, 2),
            "anomaly_score_pct": round(smoothed_score, 1),
            "is_anomaly": smoothed_score > 35.0 or cusum_alarm,
            "cusum_pos": round(self.cusum_pos, 2),
            "cusum_alarm": cusum_alarm,
        }
