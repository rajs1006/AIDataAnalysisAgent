from haystack_integrations.document_stores.qdrant import QdrantDocumentStore
from typing import Dict, Any, Optional, List
import logging
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance

logger = logging.getLogger(__name__)


class VectorStore(QdrantDocumentStore):
    """
    Enhanced Qdrant store with multi-tenant support and collection management.
    Implements user isolation through metadata filtering within a single collection.
    """

    def __init__(
        self,
        **kwargs,
    ):
        super().__init__(
            **kwargs,
        )

        self.collection_name = kwargs.get("collection_name", "rag_collection")
        self.embedding_dim = kwargs.get("embedding_dim", 384)
        self.similarity = kwargs.get("similarity", "cosine")
        self._initialized_collections = set()

    async def initialize_collection(self):
        """
        Initialize unified collection with proper settings if not exists.
        Uses metadata filtering for user isolation.
        """
        if self.collection_name not in self._initialized_collections:
            try:
                collections = self.client.get_collections()
                if self.collection_name not in [
                    c.name for c in collections.collections
                ]:
                    await self.create_collection(
                        collection_name=self.collection_name,
                        embedding_dim=self.embedding_dim,
                        distance=(
                            Distance.COSINE
                            if self.similarity.lower() == "cosine"
                            else Distance.DOT
                        ),
                    )

                    # # Create essential payload indexes for efficient filtering and querying
                    # indexes = [
                    #     ("metadata.user_id", "keyword"),  # For user isolation
                    #     (
                    #         "metadata.connector_id",
                    #         "keyword",
                    #     ),  # For connector-based filtering
                    #     ("metadata.file_type", "keyword"),  # For file type filtering
                    #     ("metadata.indexed_at", "datetime"),  # For time-based queries
                    # ]

                    # for field_name, field_type in indexes:
                    #     try:
                    #         await self.client.create_payload_index(
                    #             collection_name=self.collection_name,
                    #             field_name=field_name,
                    #             field_schema=field_type,
                    #         )
                    #     except Exception as idx_error:
                    #         # Log index creation error but continue with other indexes
                    #         logger.warning(
                    #             f"Failed to create index for {field_name}: {str(idx_error)}"
                    #         )

                self._initialized_collections.add(self.collection_name)
                logger.info(f"Initialized collection: {self.collection_name}")

            except Exception as e:
                logger.error(f"Collection initialization failed: {str(e)}")
                raise

    async def write_documents(self, documents: List[Any], **kwargs) -> None:
        """
        Write documents with user isolation through metadata.

        Args:
            documents: List of documents to write
            user_id: ID of the user owning these documents
        """
        try:
            # Ensure collection exists
            await self.initialize_collection()

            return super().write_documents(documents, **kwargs)

        except Exception as e:
            logger.error(f"Failed to write documents {documents}: {str(e)}")
            raise

    async def query_documents(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 5,
        **kwargs,
    ) -> List[Any]:
        """
        Query documents with user isolation.

        Args:
            query: Search query
            user_id: ID of the user performing the search
            filters: Additional filters to apply
            top_k: Number of results to return
        """
        try:

            return await super().query_documents(
                query=query, filters=filters, top_k=top_k, **kwargs
            )

        except Exception as e:
            logger.error(f"Query failed for filters {filters}: {str(e)}")
            raise

    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get statistics for a specific user's documents"""
        try:
            user_docs = await self.client.count(
                collection_name=self.collection_name,
                filter={
                    "must": [{"key": "metadata.user_id", "match": {"value": user_id}}]
                },
            )

            return {
                "document_count": user_docs.count,
                "collection_name": self.collection_name,
                "user_id": user_id,
            }

        except Exception as e:
            logger.error(f"Failed to get stats for user {user_id}: {str(e)}")
            return {"status": "error", "error": str(e)}

    async def delete_user_documents(self, user_id: str) -> bool:
        """Delete all documents for a specific user"""
        try:
            await self.client.delete(
                collection_name=self.collection_name,
                points_selector=None,  # Delete by filter
                filter={"must": [{"key": "meta.user_id", "match": {"value": user_id}}]},
            )
            return True

        except Exception as e:
            logger.error(f"Failed to delete documents for user {user_id}: {str(e)}")
            return False

    async def delete_connector_documents(self, user_id: str, connector_id: str) -> bool:
        """Delete all documents for a specific user"""
        try:
            filters = models.Filter(
                must=[
                    models.FieldCondition(
                        key="meta.user_id",
                        match=models.MatchValue(value=user_id),
                    ),
                    models.FieldCondition(
                        key="meta.connector_id",
                        match=models.MatchValue(value=connector_id),
                    ),
                ]
            )

            self.client.delete(
                collection_name=self.collection_name,
                points_selector=models.FilterSelector(
                    filter=filters
                ), 
            )
            return True

        except Exception as e:
            logger.error(
                f"Failed to delete documents for user {user_id} and connector {connector_id}: {str(e)}"
            )
            return False

    async def update_document_metadata(self, doc_id: str, metadata: Dict[str, Any]):
        """Update document metadata without rewriting entire document"""
        try:
            doc = await self.get_document_by_id(doc_id)
            if doc:
                doc.meta.update(metadata)
                await self.write_documents([doc], duplicate_documents="overwrite")
                return True
            return False
        except Exception as e:
            logger.error(f"Metadata update failed: {str(e)}")
            raise

    async def get_collection_stats(
        self, collection_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get collection statistics"""
        try:
            stats = await self.get_collection_info(collection_name)
            return {
                "document_count": stats.points_count,
                "vector_dimension": stats.config.params.vectors.size,
                "collection_name": collection_name or self.collection_name,
                "status": (
                    "initialized" if self._collection_initialized else "uninitialized"
                ),
            }
        except Exception as e:
            logger.error(f"Failed to get collection stats: {str(e)}")
            return {"status": "error", "error": str(e)}
