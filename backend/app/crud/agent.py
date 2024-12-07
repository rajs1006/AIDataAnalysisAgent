# app/crud/agent.py

from typing import List
import logging
from qdrant_client.http.models import Filter

from app.models.database.connectors.folder import FolderConnector
from app.models.schema.agent import SearchContext
from app.services.store.vectorizer.qdrant import VectorStore

logger = logging.getLogger(__name__)


class AgentCRUD:
    # def __init__(self, vector_store: VectorStore):
    #     self.vector_store = vector_store

    async def get_user_connectors(self, user_id: str) -> List[FolderConnector]:
        """Get all connectors for a user"""
        return await FolderConnector.find(
            {
                "user_id": user_id,
                "enabled": True,
            }
        ).to_list()

    async def search_connector_context(
        self, connector_id: str, query: str, user_id: str, limit: int = 5
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
