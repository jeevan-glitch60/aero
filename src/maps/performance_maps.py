"""Aero Piston Engine Performance Maps (Volumetric Efficiency, BSFC, Compressor, Timing)."""

from typing import Dict, Any
from src.maps.interpolator import BilinearTable2D, LookupTable1D


class PerformanceMapsEngine:
    """Encapsulates calibrated engine performance maps and characteristic surfaces."""

    def __init__(self):
        # 1. Volumetric Efficiency Map eta_v(RPM, MAP [hPa])
        rpm_grid_ve = [1400.0, 2500.0, 3500.0, 4500.0, 5000.0, 5500.0, 5800.0]
        map_grid_ve = [600.0, 800.0, 1000.0, 1200.0, 1400.0, 1650.0]
        # Realistic Rotax 915 iS volumetric efficiency matrix (0.75 - 0.94)
        ve_matrix = [
            [0.72, 0.76, 0.79, 0.81, 0.82, 0.83],  # 1400 RPM
            [0.76, 0.80, 0.84, 0.86, 0.87, 0.88],  # 2500 RPM
            [0.80, 0.84, 0.88, 0.90, 0.91, 0.92],  # 3500 RPM
            [0.83, 0.87, 0.91, 0.93, 0.94, 0.95],  # 4500 RPM
            [0.82, 0.86, 0.90, 0.92, 0.93, 0.94],  # 5000 RPM (Peak torque zone)
            [0.80, 0.84, 0.88, 0.90, 0.91, 0.92],  # 5500 RPM (Max continuous)
            [0.78, 0.82, 0.85, 0.88, 0.89, 0.90],  # 5800 RPM (Max takeoff)
        ]
        self.volumetric_eff_map = BilinearTable2D(rpm_grid_ve, map_grid_ve, ve_matrix)

        # 2. Brake Specific Fuel Consumption BSFC(RPM, Power [hp]) in g/kWh
        rpm_grid_bsfc = [2000.0, 3500.0, 4500.0, 5000.0, 5500.0, 5800.0]
        power_grid_bsfc = [20.0, 45.0, 75.0, 100.0, 125.0, 141.0]
        bsfc_matrix = [
            [340.0, 305.0, 285.0, 280.0, 285.0, 290.0],
            [320.0, 290.0, 272.0, 268.0, 272.0, 280.0],
            [310.0, 280.0, 262.0, 258.0, 265.0, 275.0],
            [305.0, 275.0, 258.0, 255.0, 262.0, 272.0],  # 255 g/kWh best economy loiter
            [315.0, 282.0, 268.0, 265.0, 272.0, 282.0],
            [330.0, 295.0, 280.0, 278.0, 288.0, 298.0],
        ]
        self.bsfc_map = BilinearTable2D(rpm_grid_bsfc, power_grid_bsfc, bsfc_matrix)

        # 3. Turbocharger Compressor Efficiency Map eta_c(Corrected Flow g/s, Pressure Ratio)
        flow_grid_comp = [15.0, 35.0, 60.0, 85.0, 110.0, 135.0]
        pr_grid_comp = [1.1, 1.4, 1.8, 2.2, 2.6, 2.9]
        comp_eff_matrix = [
            [0.68, 0.70, 0.67, 0.60, 0.52, 0.45],
            [0.72, 0.75, 0.73, 0.69, 0.63, 0.56],
            [0.70, 0.76, 0.77, 0.75, 0.70, 0.64],  # Island of peak efficiency 77%
            [0.66, 0.74, 0.76, 0.76, 0.72, 0.66],
            [0.60, 0.70, 0.73, 0.74, 0.71, 0.65],
            [0.52, 0.64, 0.68, 0.70, 0.68, 0.62],
        ]
        self.compressor_eff_map = BilinearTable2D(flow_grid_comp, pr_grid_comp, comp_eff_matrix)

        # 4. Ignition Timing Advance Map (deg BTDC)
        rpm_grid_ign = [1400.0, 2500.0, 3800.0, 4800.0, 5500.0, 5800.0]
        map_grid_ign = [600.0, 900.0, 1200.0, 1500.0, 1700.0]
        ign_matrix = [
            [12.0, 14.0, 16.0, 18.0, 18.0],
            [16.0, 20.0, 23.0, 24.0, 24.0],
            [22.0, 26.0, 28.0, 29.0, 28.0],
            [25.0, 28.0, 31.0, 30.0, 28.0],
            [26.0, 29.0, 32.0, 30.0, 28.0],
            [26.0, 28.0, 30.0, 28.0, 26.0],
        ]
        self.ignition_timing_map = BilinearTable2D(rpm_grid_ign, map_grid_ign, ign_matrix)

    def get_volumetric_efficiency(self, engine_rpm: float, map_hpa: float) -> float:
        return self.volumetric_eff_map.lookup(engine_rpm, map_hpa)

    def get_bsfc(self, engine_rpm: float, power_hp: float) -> float:
        return self.bsfc_map.lookup(engine_rpm, power_hp)

    def get_compressor_efficiency(self, air_flow_g_s: float, pressure_ratio: float) -> float:
        return self.compressor_eff_map.lookup(air_flow_g_s, pressure_ratio)

    def get_ignition_advance(self, engine_rpm: float, map_hpa: float) -> float:
        return self.ignition_timing_map.lookup(engine_rpm, map_hpa)
