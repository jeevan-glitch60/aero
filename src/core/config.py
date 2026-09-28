"""Configuration loader and schema validator for Engine, Flight, and Fault specs."""

import os
from pathlib import Path
from typing import Dict, Any, Optional
import yaml


class ConfigManager:
    """Manages loading and querying YAML configuration files."""

    def __init__(self, config_dir: Optional[str] = None):
        if config_dir is None:
            # Default to repo root / config
            base_path = Path(__file__).resolve().parent.parent.parent
            self.config_dir = base_path / "config"
        else:
            self.config_dir = Path(config_dir)

        self._engine_specs: Dict[str, Any] = {}
        self._flight_profiles: Dict[str, Any] = {}
        self._fault_definitions: Dict[str, Any] = {}

        self.reload_all()

    def reload_all(self):
        """Loads all YAML files from the configuration directory."""
        engine_file = self.config_dir / "engine_specs_rotax915.yaml"
        if engine_file.exists():
            with open(engine_file, "r", encoding="utf-8") as f:
                self._engine_specs = yaml.safe_load(f) or {}

        profiles_file = self.config_dir / "flight_profiles.yaml"
        if profiles_file.exists():
            with open(profiles_file, "r", encoding="utf-8") as f:
                self._flight_profiles = yaml.safe_load(f) or {}

        faults_file = self.config_dir / "fault_definitions.yaml"
        if faults_file.exists():
            with open(faults_file, "r", encoding="utf-8") as f:
                self._fault_definitions = yaml.safe_load(f) or {}

    @property
    def engine_specs(self) -> Dict[str, Any]:
        return self._engine_specs

    @property
    def flight_profiles(self) -> Dict[str, Any]:
        return self._flight_profiles.get("profiles", {})

    @property
    def fault_definitions(self) -> Dict[str, Any]:
        return self._fault_definitions.get("faults", {})

    def get_thresholds(self) -> Dict[str, Any]:
        return self._engine_specs.get("thresholds", {})

    def get_operating_limits(self) -> Dict[str, Any]:
        return self._engine_specs.get("operating_limits", {})

    def get_engine_meta(self) -> Dict[str, Any]:
        return self._engine_specs.get("engine_meta", {})


# Global singleton instance
_default_config_manager: Optional[ConfigManager] = None


def get_config_manager() -> ConfigManager:
    global _default_config_manager
    if _default_config_manager is None:
        _default_config_manager = ConfigManager()
    return _default_config_manager
