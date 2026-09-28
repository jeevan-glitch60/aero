"""High-performance 1D and 2D bilinear lookup table interpolator."""

import numpy as np
from typing import List, Union


class LookupTable1D:
    """1D piecewise linear lookup table with boundary clamping."""

    def __init__(self, x_values: List[float], y_values: List[float]):
        assert len(x_values) == len(y_values), "x_values and y_values must have identical length"
        self.x = np.array(x_values, dtype=np.float64)
        self.y = np.array(y_values, dtype=np.float64)

    def lookup(self, x_val: float) -> float:
        return float(np.interp(x_val, self.x, self.y))


class BilinearTable2D:
    """2D lookup table with bilinear interpolation and boundary clamping."""

    def __init__(
        self,
        x_grid: List[float],    # e.g. RPM grid (M elements)
        y_grid: List[float],    # e.g. MAP grid (N elements)
        z_matrix: List[List[float]],  # Matrix of shape (M, N)
    ):
        self.x = np.array(x_grid, dtype=np.float64)
        self.y = np.array(y_grid, dtype=np.float64)
        self.z = np.array(z_matrix, dtype=np.float64)
        assert self.z.shape == (len(self.x), len(self.y)), f"z_matrix shape {self.z.shape} must match ({len(self.x)}, {len(self.y)})"

    def lookup(self, x_val: float, y_val: float) -> float:
        """Evaluates bilinear interpolation at (x_val, y_val)."""
        # Clamp within grid bounds
        x = np.clip(x_val, self.x[0], self.x[-1])
        y = np.clip(y_val, self.y[0], self.y[-1])

        # Find bounding index along X
        i = np.searchsorted(self.x, x) - 1
        i = max(0, min(len(self.x) - 2, i))
        x1, x2 = self.x[i], self.x[i + 1]

        # Find bounding index along Y
        j = np.searchsorted(self.y, y) - 1
        j = max(0, min(len(self.y) - 2, j))
        y1, y2 = self.y[j], self.y[j + 1]

        # Normalized coordinates
        tx = (x - x1) / (x2 - x1) if x2 > x1 else 0.0
        ty = (y - y1) / (y2 - y1) if y2 > y1 else 0.0

        # Bilinear weighting
        q11 = self.z[i, j]
        q12 = self.z[i, j + 1]
        q21 = self.z[i + 1, j]
        q22 = self.z[i + 1, j + 1]

        z_val = (1.0 - tx) * (1.0 - ty) * q11 + (1.0 - tx) * ty * q12 + tx * (1.0 - ty) * q21 + tx * ty * q22
        return float(z_val)
