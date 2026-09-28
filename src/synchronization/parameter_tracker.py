"""Adaptive parameter tracking for online identification of engine degradation."""

from typing import Dict, List, Any
import numpy as np
from src.core.types import InnovationResiduals


class AdaptiveParameterTracker:
    """Tracks slowly-varying engine degradation parameters from innovation sequences."""

    def __init__(self, forgetting_factor: float = 0.985):
        self.forgetting_factor = forgetting_factor
        
        # Tracked degradation states
        self.vol_eff_bias = 0.0          # Air induction restriction / filter clogging
        self.intercooler_bias = 0.0      # Heat exchanger fouling
        self.injector_trims = [0.0, 0.0, 0.0, 0.0]  # Cylinder 1-4 injector delivery bias
        self.oil_cooler_bias = 0.0       # Oil cooler restriction

    def update(self, residuals: InnovationResiduals):
        """Updates internal parameter estimates using recursive exponential smoothing."""
        alpha = 1.0 - self.forgetting_factor

        # 1. MAP bias indicates filter clogging or wastegate drift
        self.vol_eff_bias = (1.0 - alpha) * self.vol_eff_bias + alpha * (residuals.residual_map_hpa / 1000.0)

        # 2. MAT elevation indicates CAC fouling
        if residuals.residual_mat_c > 0:
            self.intercooler_bias = (1.0 - alpha) * self.intercooler_bias + alpha * (residuals.residual_mat_c / 40.0)
        else:
            self.intercooler_bias = (1.0 - alpha) * self.intercooler_bias

        # 3. Cylinder EGT deviations indicate individual injector trims
        for i in range(4):
            egt_res = residuals.residual_egt_c[i]
            self.injector_trims[i] = (1.0 - alpha) * self.injector_trims[i] + alpha * (egt_res / 100.0)

        # 4. Oil temperature residual indicates oil cooler fouling or ring blowby
        if residuals.residual_oil_temp_c > 0:
            self.oil_cooler_bias = (1.0 - alpha) * self.oil_cooler_bias + alpha * (residuals.residual_oil_temp_c / 30.0)
        else:
            self.oil_cooler_bias = (1.0 - alpha) * self.oil_cooler_bias

    def get_tracked_parameters(self) -> Dict[str, Any]:
        return {
            "volumetric_efficiency_bias": round(float(self.vol_eff_bias), 4),
            "intercooler_fouling_index": round(float(max(0.0, self.intercooler_bias)), 4),
            "cylinder_injector_trims": [round(float(t), 4) for t in self.injector_trims],
            "oil_cooler_restriction_index": round(float(max(0.0, self.oil_cooler_bias)), 4),
        }
