from typing import Dict, Any, Optional, List
from haystack import Document
from qdrant_client import models
from app.core.logging_config import get_logger
from app.core.store.vectorizer.haystacks.haystack_qdrant import HaystackVectorStore
from app.agents.haystack.pipeline import HaystackRAGPipeline
from app.agents.haystack.base import PipelineInput, PipelineOutput

logger = get_logger(__name__)


class MultiModalVectorStore(HaystackVectorStore):
    """Enhanced vector store with multimodal support and direct document processing."""

    def __init__(self, pipeline: HaystackRAGPipeline, **kwargs):
        super().__init__(**kwargs)

        # Initialize components
        self.pipeline = pipeline

    async def initialize_collection(self):
        await super().initialize_collection()
        await self.pipeline.initialize(self)

    async def add_documents(
        self,
        documents: List[Document],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Add documents to the vector store."""
        try:
            return await self.pipeline.add_documents(documents, metadata)
        except Exception as e:
            logger.exception(f"Failed to add documents: {str(e)}")
            raise

    async def process(self, input_data: PipelineInput) -> PipelineOutput:
        try:
            # Format filters properly for Qdrant
            filters = await self._prepare_user_filters(input_data.user_id)
            return await self.pipeline.process(input_data, filters=filters)
        except Exception as e:
            logger.exception(f"Multimodal query failed: {str(e)}")
            raise

    async def _prepare_user_filters(
        self, user_id: str, filters: Optional[Dict[str, Any]] = None
    ) -> models.Filter:
        """Prepare user filters for query."""
        user_filters = models.Filter(
            must=[
                models.FieldCondition(
                    key="meta.user_ids",
                    match=models.MatchAny(any=[user_id]),
                )
            ]
        )

        if filters:
            for key, value in filters.items():
                if key != "user_ids":
                    condition = (
                        models.MatchAny(any=value)
                        if isinstance(value, list)
                        else models.MatchValue(value=value)
                    )
                    user_filters.must.append(
                        models.FieldCondition(key=f"meta.{key}", match=condition)
                    )

        return user_filters

    async def cleanup(self):
        """Cleanup resources."""
        if self.pipeline:
            await self.pipeline.cleanup()
        await super().cleanup()
