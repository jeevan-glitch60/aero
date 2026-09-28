"""Dynamic Fault Injection Harness for evaluating Digital Twin detection and isolation."""

from typing import Dict, List, Optional, Any
from src.core.types import InjectedFaultState


class FaultInjector:
    """Manages active and scheduled fault injections into the digital twin simulation."""

    def __init__(self):
        self.active_faults: Dict[str, InjectedFaultState] = {}

    def inject_fault(
        self,
        fault_id: str,
        name: str,
        severity_factor: float = 1.0,
        start_time_s: float = 0.0,
        duration_s: Optional[float] = None,
    ) -> InjectedFaultState:
        """Injects or updates a specific failure mode."""
        fault_state = InjectedFaultState(
            fault_id=fault_id,
            name=name,
            severity_factor=max(0.1, min(1.0, severity_factor)),
            start_time_s=start_time_s,
            duration_s=duration_s,
            is_active=True,
        )
        self.active_faults[fault_id] = fault_state
        return fault_state

    def clear_fault(self, fault_id: str):
        """Removes an active fault."""
        if fault_id in self.active_faults:
            del self.active_faults[fault_id]

    def clear_all(self):
        """Clears all active fault injections."""
        self.active_faults.clear()

    def get_active_faults(self, current_time_s: float = 0.0) -> List[InjectedFaultState]:
        """Returns faults that have started and are not expired."""
        active = []
        expired = []
        for f_id, fault in self.active_faults.items():
            if fault.start_time_s > current_time_s:
                continue
            if fault.duration_s is not None and (current_time_s - fault.start_time_s) > fault.duration_s:
                expired.append(f_id)
            elif fault.is_active:
                active.append(fault)

        for f_id in expired:
            del self.active_faults[f_id]

        return active
