from app.core.logging_config import get_logger
from haystack_integrations.document_stores.qdrant import QdrantDocumentStore
from typing import Dict, Any, Optional, List
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance


logger = get_logger(__name__)


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
                logger.info(
                    "Initialized collection: {self.collection_name}",
                )

            except Exception as e:
                logger.error(
                    "Collection initialization failed: {str(e)}",
                )
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
            logger.error(
                "Failed to write documents {documents}: {str(e)}",
            )
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
            logger.error(
                "Query failed for filters {filters}: {str(e)}",
            )
            raise

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
            logger.error(
                "Failed to delete documents for user {user_id}: {str(e)}",
            )
            raise

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
                points_selector=models.FilterSelector(filter=filters),
            )
            return True

        except Exception as e:
            logger.error(
                f"Failed to delete documents for user {user_id} and connector {connector_id}: {str(e)}"
            )
            return False

    async def get_document_by_doc_id(self, doc_id: str) -> Dict[str, Any]:
        """Get document by document ID from metadata file_id"""
        try:
            # Using Qdrant client directly
            results, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="meta.file_id", match=models.MatchValue(value=doc_id)
                        )
                    ]
                ),
                limit=1,
            )
            print("results=====================")
            print(results)

            if results and len(results) > 0:
                # Convert Qdrant point to dictionary
                return results[0]
            return None
        except Exception as e:
            logger.error(f"Failed to get document {doc_id}: {str(e)}")
            raise

    async def update_document_access(
        self, doc_id: str, add_user_ids: List[str], remove_user_ids: List[str]
    ):
        """Update document access by adding new user IDs"""
        try:
            doc = await self.get_document_by_doc_id(doc_id)
            if doc:
                # Get existing user_ids from metadata
                updated_meta = doc.payload["meta"].copy()
                existing_user_ids = updated_meta.get("user_ids", [])

                print("==========user ids================")
                print(add_user_ids, remove_user_ids)
                # Add new user_ids without duplicates
                updated_user_ids = list(
                    (set(existing_user_ids) | set(add_user_ids)) - set(remove_user_ids)
                )
                print("==========updated_user_ids================")
                print(updated_user_ids)

                # Create updated metadata keeping all other meta fields
                updated_meta["user_ids"] = updated_user_ids

                # Update the metadata in Qdrant
                self.client.set_payload(
                    collection_name=self.collection_name,
                    payload={"meta": updated_meta},
                    points=[doc.id],  # Use the Record's id directly
                    wait=True,
                )
                return True
            return False
        except Exception as e:
            logger.error(f"Metadata update failed: {str(e)}")
            raise

    async def remove_document_access(self, doc_id: str, user_id: str) -> bool:
        """Remove user access from a document"""
        try:
            doc = await self.get_document_by_doc_id(doc_id)
            if doc:
                # Get existing user_ids from metadata
                existing_user_ids = doc.meta.get("user_ids", [])

                # Remove user_id if it exists
                if user_id in existing_user_ids:
                    updated_user_ids = [
                        uid for uid in existing_user_ids if uid != user_id
                    ]

                    # Update the metadata
                    await self.update_document_meta(
                        document_id=doc.id, meta={"user_ids": updated_user_ids}
                    )
                    return True
            return False
        except Exception as e:
            logger.error(f"Failed to remove document access: {str(e)}")
            raise

    async def update_document_metadata(self, doc_id: str, metadata: Dict[str, Any]):
        """Update document metadata without rewriting entire document"""
        try:
            doc = await self.get_document_by_doc_id(doc_id)
            if doc:
                doc.meta.update(metadata)
                await self.write_documents([doc], duplicate_documents="overwrite")
                return True
            return False
        except Exception as e:
            logger.error(
                "Metadata update failed: {str(e)}",
            )
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
            logger.error(
                "Failed to get collection stats: {str(e)}",
            )
            return {"status": "error", "error": str(e)}
