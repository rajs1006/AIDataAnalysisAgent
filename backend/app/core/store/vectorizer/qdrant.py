from app.core.logging_config import get_logger
from datetime import datetime
from typing import Dict, Any, Optional, List
import uuid

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    PointStruct,
    Distance,
    VectorParams,
    Filter,
)
from qdrant_client.models import PointIdsList

from app.core.vector.text import TextVectorizer
from app.models.schema.vector import VectorDocument



logger = get_logger(__name__)
class QdrantCl:
    def __init__(self, qdrant_client: QdrantClient):
        self.client = qdrant_client
        self.vectorizer = TextVectorizer()
        self.default_vector_size = 768
        self.id_mapping = {}
        self.performance_metrics = {}

    def _create_point_id(self, original_id: str) -> str:
        """Create a valid Qdrant point ID from the original ID."""
        # Create a deterministic UUID based on the original ID
        namespace_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, "qdrant.tech")
        point_uuid = str(uuid.uuid5(namespace_uuid, str(original_id)))

        # Store the mapping
        self.id_mapping[point_uuid] = original_id

        return point_uuid

    def ensure_collection(
        self, collection_name: str, vector_size: Optional[int] = None
    ):
        """Ensure collection exists with proper configuration"""
        try:
            collections = self.client.get_collections()
            if collection_name not in [c.name for c in collections.collections]:
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(
                        size=vector_size or self.default_vector_size,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info("Created new collection: {collection_name}", )
        except Exception as e:
            logger.error("Failed to ensure collection: {str(e)}", )
            raise

    async def store_document(
        self,
        collection_name: str,
        doc_id: str,
        content: str,
        metadata: Dict[str, Any],
        use_chunking: bool = True,
    ) -> List[str]:
        try:
            texts_embeddings_metadata = await self.vectorizer.create_embeddings(
                content, use_chunking=use_chunking, metadata=metadata
            )

            points = []
            point_ids = []
            for i, (chunk, vector, metadata) in enumerate(texts_embeddings_metadata):
                if hasattr(vector, "tolist"):
                    vector = vector.tolist()

                chunk_id = f"{doc_id}_chunk_{i}"
                point_id = self._create_point_id(chunk_id)

                chunk_metadata = {
                    **metadata,
                    "original_id": str(doc_id),
                    "vector_chunk_index": i,
                    "vector_chunk_id": chunk_id,
                }

                point = PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "metadata": chunk_metadata,
                        "content": chunk,
                        "content_preview": content[i * 512 : (i + 1) * 512],
                        "indexed_at": int(datetime.utcnow().timestamp() * 1000),
                    },
                )

                points.append(point)
                point_ids.append(point_id)

            self.ensure_collection(collection_name)
            self.client.upsert(collection_name=collection_name, points=points)
            logger.info("Vector upserted")

            return point_ids

        except Exception as e:
            logger.error("Failed to store document in vector database: {str(e)}", )
            raise

        except Exception as e:
            logger.error("Failed to store document in vector database: {str(e)}", )
            raise

    async def search_similar(
        self,
        collection_name: str,
        query: str,
        limit: int = 5,
        metadata_filter: Optional[Dict[str, Any]] = None,
        include_content: bool = True,
    ) -> List[VectorDocument]:
        try:
            query_vector_metadata = await self.vectorizer.create_embeddings(query)

            # if hasattr(query_vector_metadata, "tolist"):
            #     query_vector_metadata = query_vector_metadata.tolist()
            # elif isinstance(query_vector_metadata, list) and len(query_vector_metadata) > 0:
            #     query_vector_metadata = query_vector_metadata[0]

            # metadata_filter_data = Filter(
            #     must=[
            #         {"key": k, "match": {"value": v}}
            #         for k, v in (metadata_filter or {}).items()
            #     ]
            # )
            for _, (t, vector, _) in enumerate(query_vector_metadata):
                logger.debug("answering user query : {query}", )

                results = self.client.search(
                    collection_name=collection_name,
                    query_vector=vector,
                    # query_filter=metadata_filter,
                    limit=5,
                    with_payload=True,
                )

                return [
                    VectorDocument(
                        id=result.payload.get("original_id", result.id),
                        vector=result.vector if include_content else None,
                        metadata=result.payload["metadata"],
                        content=(
                            result.payload.get("content") if include_content else None
                        ),
                        content_preview=result.payload["content_preview"],
                        indexed_at=result.payload["indexed_at"],
                        score=result.score,
                    )
                    for result in results
                ]

        except Exception as e:
            logger.error("Failed to search vector database: {str(e)}", )
            raise

    def delete_document(self, collection_name: str, doc_id: str) -> bool:
        """Delete a document from the vector store."""
        try:
            point_id = self._create_point_id(str(doc_id))  # Get the same Qdrant ID
            self.client.delete(
                collection_name=collection_name,
                points_selector=PointIdsList(points=[point_id]),
            )
            return True
        except Exception as e:
            logger.error("Failed to delete document: {str(e)}", )
            logger.error("Original ID: {doc_id}", )
            raise

    def _get_collection_info(self, collection_name: str):
        """Get information about a collection."""
        try:
            return self.client.get_collection(collection_name)
        except Exception as e:
            logger.error("Failed to get collection info: {str(e)}", )
            raise
