"""Strongly-typed data models and contracts for the Aero Piston Engine Digital Twin."""

from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class HealthSeverity(str, Enum):
    NORMAL = "NORMAL"
    CAUTION = "CAUTION"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class FlightPhaseEnum(str, Enum):
    GROUND_IDLE = "GROUND_IDLE"
    TAXI = "TAXI"
    TAKEOFF = "TAKEOFF"
    CLIMB = "CLIMB"
    CRUISE_LOITER = "CRUISE_LOITER"
    DESCENT = "DESCENT"
    APPROACH_LANDING = "APPROACH_LANDING"
    ENGINE_SHUTDOWN = "ENGINE_SHUTDOWN"


class SensorFrame(BaseModel):
    """Raw / Ingested sensor telemetry frame from UAV avionics / CAN bus."""
    timestamp: float = Field(..., description="Epoch timestamp or mission elapsed time in seconds")
    engine_rpm: float = Field(..., description="Crankshaft rotational speed in RPM")
    prop_rpm: float = Field(..., description="Propeller rotational speed in RPM")
    throttle_pct: float = Field(..., description="Throttle / Power lever angle (0-100%)")
    wastegate_pct: float = Field(..., description="Electronic wastegate position (0=closed full boost, 100=open bypass)")
    map_hpa: float = Field(..., description="Manifold Absolute Pressure in hPa")
    mat_c: float = Field(..., description="Manifold Air Temperature in deg C")
    egt_c: List[float] = Field(..., description="Exhaust Gas Temperature for Cylinders 1-4 [Cyl1, Cyl2, Cyl3, Cyl4] in deg C")
    cht_c: List[float] = Field(..., description="Cylinder Head Temperature for Cylinders 1-4 [Cyl1, Cyl2, Cyl3, Cyl4] in deg C")
    oil_temp_c: float = Field(..., description="Engine Oil Temperature in deg C")
    oil_press_bar: float = Field(..., description="Engine Oil Pressure in bar")
    fuel_press_bar: float = Field(..., description="Fuel Rail Pressure in bar")
    fuel_flow_lph: float = Field(..., description="Fuel Flow Rate in liters per hour")
    coolant_temp_c: float = Field(..., description="Engine Coolant Temperature in deg C")
    ambient_temp_c: float = Field(..., description="Outside Ambient Air Temperature (OAT) in deg C")
    ambient_press_hpa: float = Field(..., description="Ambient Barometric Pressure in hPa")
    altitude_m: float = Field(..., description="GPS / Barometric Altitude in meters")
    airspeed_kts: float = Field(..., description="Indicated Airspeed (IAS) in knots")
    bus_voltage_v: float = Field(default=28.0, description="Avionics / ECU bus voltage in Volts")
    vibration_g: float = Field(default=1.2, description="Crankcase / engine mount vibration in g")
    vibration_harmonics: Dict[str, float] = Field(default_factory=lambda: {"1x": 0.85, "2x": 0.35, "3x": 0.12}, description="Vibration frequency harmonic amplitudes in g")


class TwinThermodynamicState(BaseModel):
    """Virtual engine physics & thermodynamic model state."""
    timestamp: float
    map_predicted_hpa: float
    mat_predicted_c: float
    egt_predicted_c: List[float]
    cht_predicted_c: List[float]
    oil_temp_predicted_c: float
    oil_press_predicted_bar: float
    coolant_temp_predicted_c: float
    indicated_power_hp: float
    brake_power_hp: float
    friction_power_hp: float
    brake_torque_nm: float
    bsfc_g_per_kwh: float
    thermal_efficiency_pct: float
    volumetric_efficiency_pct: float
    air_mass_flow_g_per_s: float
    fuel_mass_flow_g_per_s: float
    turbo_pressure_ratio: float
    turbo_speed_rpm: float
    intercooler_effectiveness: float
    target_lambda: float


class InnovationResiduals(BaseModel):
    """Residuals between live sensor measurements and virtual physics twin."""
    timestamp: float
    residual_map_hpa: float
    residual_mat_c: float
    residual_egt_c: List[float]
    residual_cht_c: List[float]
    residual_oil_temp_c: float
    residual_oil_press_bar: float
    residual_fuel_flow_lph: float
    mahalanobis_distance: float
    anomaly_score_pct: float = Field(..., description="Aggregated anomaly confidence index 0-100%")
    is_anomaly: bool


class FaultDiagnostic(BaseModel):
    """Diagnosed fault candidate with isolated root cause and confidence score."""
    fault_id: str
    name: str
    category: str
    severity: HealthSeverity
    confidence_pct: float
    description: str
    affected_components: List[str]
    recommended_action: str
    evidence_bullets: List[str] = Field(default_factory=list, description="AI explainability evidence rationales")
    affected_metrics: List[str] = Field(default_factory=list, description="Key sensor metrics impacted")
    alternative_explanation: Optional[str] = Field(default=None, description="Alternative sensor or environment hypothesis")
    model_version: Optional[str] = Field(default="MVEM-v3.4-AERO", description="Assurance model version")
    source_mode: Optional[str] = Field(default="synthetic", description="Source mode: synthetic / replay / mock")
    data_quality_pct: Optional[float] = Field(default=98.0, description="Telemetry trust and quality score")
    system_limitation: Optional[str] = Field(default="Not a confirmed diagnosis; illustrative model output only.", description="Assurance boundary limits")


class HealthStatus(BaseModel):
    """Comprehensive engine health assessment."""
    overall_health: HealthSeverity
    health_score_pct: float = Field(..., description="Overall health index 100=Mint, 0=Failed")
    active_alarms: List[str]
    active_cautions: List[str]
    cylinder_egt_spread_c: float
    cylinder_cht_spread_c: float
    is_cylinder_imbalanced: bool
    isolated_faults: List[FaultDiagnostic]


class SubsystemRUL(BaseModel):
    """Subsystem wear indices and Remaining Useful Life estimation."""
    piston_rings_wear_pct: float
    exhaust_valves_fatigue_pct: float
    turbo_bearings_wear_pct: float
    oil_aging_index_pct: float
    overall_degradation_pct: float
    estimated_rul_hours: float
    rul_p10_hours: float
    rul_p90_hours: float
    equivalent_operating_hours: float
    maintenance_urgency: str


class InjectedFaultState(BaseModel):
    """Active fault injection state."""
    fault_id: str
    name: str
    severity_factor: float = Field(default=1.0, description="0.0 to 1.0 injection intensity")
    start_time_s: float
    duration_s: Optional[float] = None
    is_active: bool = True


class SimulationState(BaseModel):
    """Flight simulation and environment status."""
    mission_name: str
    phase_name: str
    phase_index: int
    elapsed_time_s: float
    is_running: bool
    is_paused: bool
    time_scale: float
    active_faults: List[InjectedFaultState]


class UnifiedTwinPacket(BaseModel):
    """Synchronized unified packet for high-speed WebSocket and API responses."""
    sensor: SensorFrame
    twin: TwinThermodynamicState
    residuals: InnovationResiduals
    health: HealthStatus
    rul: SubsystemRUL
    simulation: SimulationState
