from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class PipelineInput:
    """Input structure for pipeline processing"""

    query: str
    user_id: str
    conversation_history: Optional[List[Dict[str, str]]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class PipelineOutput:
    """Output structure from pipeline processing"""

    answer: str
    sources: str
    metadata: Dict[str, Any]


class BasePipeline(ABC):
    """Abstract base class for RAG pipelines"""

    @abstractmethod
    async def process(self, input_data: PipelineInput) -> PipelineOutput:
        """Process input through the pipeline"""
        pass

    @abstractmethod
    async def initialize(self):
        """Initialize pipeline components"""
        pass

    @abstractmethod
    async def cleanup(self):
        """Clean up pipeline resources"""
        pass


class PipelineRegistry:
    """Registry for managing pipeline instances"""

    _instances: Dict[str, BasePipeline] = {}

    @classmethod
    def get_pipeline(cls, pipeline_id: str) -> Optional[BasePipeline]:
        """Get existing pipeline instance"""
        return cls._instances.get(pipeline_id)

    @classmethod
    def register_pipeline(cls, pipeline_id: str, pipeline: BasePipeline):
        """Register a new pipeline instance"""
        cls._instances[pipeline_id] = pipeline

    @classmethod
    def remove_pipeline(cls, pipeline_id: str):
        """Remove a pipeline instance"""
        if pipeline_id in cls._instances:
            pipeline = cls._instances[pipeline_id]
            pipeline.cleanup()
            del cls._instances[pipeline_id]
