"""Extensible registry for custom physics models, health rules, and sensors."""

from typing import Dict, Type, Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)


class TwinRegistry:
    """Central registry allowing dynamic registration and extension of Digital Twin components."""

    _sensor_decoders: Dict[str, Callable] = {}
    _physics_models: Dict[str, Any] = {}
    _health_evaluators: Dict[str, Any] = {}
    _fault_detectors: Dict[str, Any] = {}

    @classmethod
    def register_sensor_decoder(cls, protocol_name: str, decoder_fn: Callable):
        cls._sensor_decoders[protocol_name.lower()] = decoder_fn
        logger.info(f"Registered sensor protocol decoder: {protocol_name}")

    @classmethod
    def get_sensor_decoder(cls, protocol_name: str) -> Optional[Callable]:
        return cls._sensor_decoders.get(protocol_name.lower())

    @classmethod
    def register_physics_model(cls, model_name: str, model_instance: Any):
        cls._physics_models[model_name.lower()] = model_instance
        logger.info(f"Registered custom physics sub-model: {model_name}")

    @classmethod
    def get_physics_model(cls, model_name: str) -> Optional[Any]:
        return cls._physics_models.get(model_name.lower())

    @classmethod
    def register_fault_detector(cls, fault_id: str, detector_fn: Callable):
        cls._fault_detectors[fault_id] = detector_fn
        logger.info(f"Registered custom fault detector: {fault_id}")

    @classmethod
    def get_all_fault_detectors(cls) -> Dict[str, Callable]:
        return cls._fault_detectors
