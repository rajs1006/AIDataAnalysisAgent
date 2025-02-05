from app.core.logging_config import get_logger
# app/crud/agent.py

from typing import List
from qdrant_client.http.models import Filter
from beanie import PydanticObjectId
from app.models.database.connectors.folder import BaseConnector
from app.models.schema.agent import SearchContext
from app.core.store.vectorizer import VectorStore



logger = get_logger(__name__)
class AgentCRUD:
    # def __init__(self, vector_store: VectorStore):
    #     self.vector_store = vector_store

    @staticmethod
    async def get_connector(connector_id: str, user_id: str) -> BaseConnector:
        """Get all connectors for a user"""
        return await BaseConnector.find_one(
            {
                "_id": PydanticObjectId(connector_id),
                "user_id": str(user_id),
                "enabled": True,
            }
        )

    @staticmethod
    async def search_connector_context(
        connector_id: str, query: str, user_id: str, limit: int = 5
    ) -> List[SearchContext]:
        """Search for context within a specific connector"""
        # Use vector store's built-in search functionality
        results = await self.vector_store.search_similar(
            collection_name=str(connector_id),
            query=query,  # VectorStore will handle embedding creation
            limit=limit,
            metadata_filter=Filter(
                must=[{"key": "metadata.user_id", "match": {"value": user_id}}]
            ),
        )

        # Convert to SearchContext objects
        return [
            SearchContext(
                content_preview=result.content_preview,
                metadata=result.metadata,
                score=result.score if hasattr(result, "score") else None,
            )
            for result in results
        ]
