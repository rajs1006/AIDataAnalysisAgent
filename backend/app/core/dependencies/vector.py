# app/core/dependencies.py

from typing import AsyncGenerator
from fastapi import Depends
from qdrant_client import QdrantClient
from app.core.config import settings
from app.core.store.vectorizer import VectorStore
from app.agents.haystack.config import HybridPipelineConfig
from app.agents.haystack.pipeline import HaystackRAGPipeline


async def get_qdrant_client() -> AsyncGenerator[QdrantClient, None]:
    """Get Qdrant client instance."""
    client = QdrantClient(url=settings.QDRANT_URL)
    try:
        yield client
    finally:
        client.close()


async def get_rag_pipeline() -> HaystackRAGPipeline:
    return HaystackRAGPipeline(
        config=HybridPipelineConfig(),
    )


async def get_vector_store(
    pipeline: HaystackRAGPipeline = Depends(get_rag_pipeline),
) -> VectorStore:
    """Get VectorStore instance."""
    return VectorStore(pipeline=pipeline, **HybridPipelineConfig().document_store)


# async def get_vector_store() -> VectorStore:
#     """Get VectorStore instance."""
#     return VectorStore()
