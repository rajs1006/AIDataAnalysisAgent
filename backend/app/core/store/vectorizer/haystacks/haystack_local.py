from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from haystack.document_stores import InMemoryDocumentStore
from haystack.schema import Document
from haystack.nodes import EmbeddingRetriever
from haystack.nodes import PreProcessor

from app.core.store.vectorizer.base import BaseDocumentStore, MetadataValidator

logger = logging.getLogger(__name__)


class VectorStore(BaseDocumentStore):
    """Haystack document store implementation"""

    def __init__(
        self, embedding_model: str = "sentence-transformers/multi-qa-mpnet-base-dot-v1"
    ):
        """Initialize document store with embedding model"""
        self.document_store = InMemoryDocumentStore(
            embedding_dim=768, similarity="dot_product", return_embedding=True
        )

        self.retriever = EmbeddingRetriever(
            document_store=self.document_store, embedding_model=embedding_model
        )

        self.preprocessor = PreProcessor(
            clean_empty_lines=True,
            clean_whitespace=True,
            clean_header_footer=True,
            split_by="word",
            split_length=500,
            split_overlap=50,
        )

    async def store_document(
        self,
        collection_name: str,
        doc_id: str,
        content: str,
        metadata: Dict[str, Any],
    ) -> str:
        """Store document with preprocessing"""
        try:
            # Validate metadata
            metadata = MetadataValidator.validate_metadata(metadata)
            metadata["collection"] = collection_name

            # Preprocess document
            docs = self.preprocessor.process(
                documents=[
                    {
                        "content": content,
                        "meta": {
                            **metadata,
                            "doc_id": doc_id,
                            "chunk_id": None,  # Will be set during preprocessing
                        },
                    }
                ]
            )

            # Add to document store
            self.document_store.write_documents(docs)

            # Update embeddings
            self.document_store.update_embeddings(self.retriever)

            return doc_id

        except Exception as e:
            logger.error(f"Failed to store document: {str(e)}")
            raise

    async def search_similar(
        self,
        collection_name: str,
        query: str,
        limit: int = 5,
        metadata_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Search similar documents using embeddings"""
        try:
            # Prepare filter
            filters = {"collection": collection_name}
            if metadata_filter:
                filters.update(metadata_filter)

            # Retrieve documents
            documents = self.retriever.retrieve(
                query=query, top_k=limit, filters=filters
            )

            # Format results
            results = []
            for doc in documents:
                results.append(
                    {
                        "content": doc.content,
                        "metadata": doc.meta,
                        "score": doc.score,
                        "id": doc.meta.get("doc_id"),
                    }
                )

            return results

        except Exception as e:
            logger.error(f"Search failed: {str(e)}")
            raise

    async def delete_document(self, collection_name: str, doc_id: str) -> bool:
        """Delete document and its chunks"""
        try:
            # Delete all chunks with matching doc_id
            self.document_store.delete_documents(
                filters={"collection": collection_name, "doc_id": doc_id}
            )
            return True
        except Exception as e:
            logger.error(f"Deletion failed: {str(e)}")
            return False

    async def get_document(
        self, collection_name: str, doc_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get document by ID"""
        try:
            docs = self.document_store.get_documents(
                filters={"collection": collection_name, "doc_id": doc_id}
            )
            if docs:
                # Combine all chunks into one document
                content = " ".join([doc.content for doc in docs])
                metadata = docs[0].meta.copy()
                metadata.pop("chunk_id", None)

                return {"content": content, "metadata": metadata, "id": doc_id}
            return None
        except Exception as e:
            logger.error(f"Document retrieval failed: {str(e)}")
            return None

    async def update_document(
        self,
        collection_name: str,
        doc_id: str,
        content: str,
        metadata: Dict[str, Any],
    ) -> bool:
        """Update document by deleting and re-adding"""
        try:
            # Delete existing document
            await self.delete_document(collection_name, doc_id)

            # Store new version
            await self.store_document(collection_name, doc_id, content, metadata)
            return True
        except Exception as e:
            logger.error(f"Update failed: {str(e)}")
            return False

    def __del__(self):
        """Cleanup on deletion"""
        try:
            self.document_store.delete_documents()
        except:
            pass
