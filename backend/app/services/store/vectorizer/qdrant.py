from datetime import datetime
import logging
from typing import Dict, Any, Optional, List
import hashlib
import uuid
import numpy as np

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    PointStruct,
    SearchRequest,
    Distance,
    VectorParams,
    Filter,
)
from qdrant_client.models import PointIdsList

from app.core.vector import TextVectorizer
from app.models.schema.vector import VectorMetadata, VectorDocument

logger = logging.getLogger(__name__)


class VectorStore:
    def __init__(self, qdrant_client: QdrantClient):
        self.client = qdrant_client
        self.vectorizer = TextVectorizer()
        self.default_vector_size = 768  # Default size for all-mpnet-base-v2 model
        self.id_mapping = {}  # Store mapping between original IDs and Qdrant IDs

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
                logger.info(f"Created new collection: {collection_name}")
        except Exception as e:
            logger.error(f"Failed to ensure collection: {str(e)}")
            raise

    async def store_document(
        self, collection_name: str, doc_id: str, content: str, metadata: Dict[str, Any]
    ) -> bool:
        """Store document with its embedding and metadata"""
        try:
            # Create embeddings
            embeddings = await self.vectorizer.create_embeddings(content)

            # Ensure embeddings are in the correct format
            if hasattr(embeddings, "tolist"):
                vector = embeddings.tolist()
            elif (
                isinstance(embeddings, list)
                and len(embeddings) > 0
                and isinstance(embeddings[0], (list, np.ndarray))
            ):
                vector = embeddings[0]  # Take first vector if it's a list of vectors
            else:
                vector = embeddings

            # Create a valid Qdrant point ID
            point_id = self._create_point_id(str(doc_id))

            # Include original ID in metadata
            metadata["original_id"] = str(doc_id)

            # Create point with proper structure
            point = PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "metadata": metadata,
                    "content_preview": content[:200],
                    "indexed_at": int(datetime.utcnow().timestamp() * 1000),
                    "original_id": str(doc_id),  # Store original ID in payload
                },
            )

            # Ensure collection exists with proper vector size
            self.ensure_collection(collection_name, len(vector))

            # Store the point
            self.client.upsert(collection_name=collection_name, points=[point])

            logger.info(
                f"Successfully stored document. Original ID: {doc_id}, Qdrant ID: {point_id}"
            )

            return point_id

        except Exception as e:
            logger.error(f"Failed to store document in vector database: {str(e)}")
            logger.error(f"Original ID: {doc_id}")
            raise

    async def search_similar(
        self,
        collection_name: str,
        query: str,
        limit: int = 5,
        metadata_filter: Optional[Dict[str, Any]] = None,
    ) -> List[VectorDocument]:
        """Search for similar documents"""
        try:
            # Create query vector
            query_vector = await self.vectorizer.create_embeddings(query)

            # Ensure query vector is in the right format
            if hasattr(query_vector, "tolist"):
                query_vector = query_vector.tolist()
            elif (
                isinstance(query_vector, list)
                and len(query_vector) > 0
                and isinstance(query_vector[0], (list, np.ndarray))
            ):
                query_vector = query_vector[0]

            metadata_filter_data = Filter(
                must=[
                    {"key": k, "match": {"value": v}}
                    for k, v in metadata_filter.items()
                ]
            )

            results = self.client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                # query_filter=metadata_filter_data,  # Optional filter
                # top=limit,  # Retrieve top 5 results
                limit=limit,
                with_payload=True,
            )

            return [
                VectorDocument(
                    id=result.payload.get(
                        "original_id", result.id
                    ),  # Use original ID if available
                    vector=result.vector,
                    metadata=result.payload["metadata"],
                    content_preview=result.payload["content_preview"],
                    indexed_at=result.payload["indexed_at"],
                    score=result.score,
                )
                for result in results
            ]

        except Exception as e:
            logger.error(f"Failed to search vector database: {str(e)}")
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
            logger.error(f"Failed to delete document: {str(e)}")
            logger.error(f"Original ID: {doc_id}")
            raise

    def _get_collection_info(self, collection_name: str):
        """Get information about a collection."""
        try:
            return self.client.get_collection(collection_name)
        except Exception as e:
            logger.error(f"Failed to get collection info: {str(e)}")
            raise
