from app.core.logging_config import get_logger
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime
import uuid
from fastapi import HTTPException

from haystack import Document

from app.agents.haystack.pipeline import HaystackRAGPipeline
from app.agents.haystack.base import PipelineInput, PipelineOutput
from app.core.store.vectorizer import VectorStore


logger = get_logger(__name__)


class RagService:
    """Service layer for RAG implementation using Haystack components"""

    def __init__(
        self,
        vector_store: VectorStore,
    ):
        self.initialized = False

        # Components
        self.document_store = vector_store

    async def initialize(self):
        """Initialize service components and pipeline"""
        try:
            # Initialize vector store with proper settings
            await self.document_store.initialize_collection()

            self.initialized = True
            logger.info("RAG service initialized successfully")

        except Exception as e:
            logger.exception(
                f"Failed to initialize RAG service: {str(e)}",
            )
            raise

    async def ensure_initialized(self):
        """Ensure service is initialized before operations"""
        if not self.initialized:
            logger.warning("RAG service not initialized. Call initialize() first.")
            await self.initialize()

    async def add_documents(
        self,
        documents: List[Dict[str, Any]],
        user_id: str,
        connector_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Add documents through the pipeline with proper metadata"""
        try:
            await self.ensure_initialized()

            # Create Haystack documents with enhanced metadata
            vector_docs = []
            for doc in documents:
                doc_metadata = {
                    "user_ids": [user_id],
                    "connector_id": connector_id,
                    "indexed_at": datetime.utcnow().isoformat(),
                    "file_id": doc.get("file_id"),
                    "file_path": doc.get("file_path", "Unknown"),
                    "file_type": doc.get("file_type", "Unknown"),
                    "file_name": doc.get("file_name", "Unknown"),
                    **(metadata or {}),
                }

                vector_docs.append(
                    Document(
                        content=doc["content"],
                        meta=doc_metadata,
                        # id=doc.get("doc_id"),
                        # id=f"{connector_id}_{doc.get('doc_id', str(uuid.uuid4()))}",
                    )
                )

            # Process through pipeline
            result = await self.document_store.add_documents(
                documents=vector_docs,
                metadata={
                    "batch_id": str(uuid.uuid4()),
                    "total_docs": len(vector_docs),
                    "rag_processor": "haystack_pipeline",
                },
            )

            return {
                "status": "success",
                "processed_documents": len(vector_docs),
                "pipeline_result": result,
            }

        except Exception as e:
            logger.exception(
                f"Failed to add documents: {str(e)}",
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def update_document_access(
        self,
        doc_id: str,
        add_user_ids: List[str],
        remove_user_ids: List[str],
    ) -> Dict[str, Any]:
        """Update metadata for a specific document with proper user isolation and collaborator management.

        Args:
            doc_id (str): The ID of the document to update
            user_id (List[str]): The IDs of the user to add to the access

        Returns:
            Dict[str, Any]: Status of the update operation

        Raises:
            HTTPException: If update fails or document not found
        """
        try:

            await self.ensure_initialized()

            return await self.document_store.update_document_access(
                doc_id=doc_id,
                add_user_ids=add_user_ids,
                remove_user_ids=remove_user_ids,
            )

        except HTTPException as he:
            logger.error(f"Metadata update failed for doc {doc_id}: {str(he)}")
            raise
        except Exception as e:
            logger.exception(
                f"Unexpected error updating metadata for doc {doc_id}: {str(e)}"
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def delete_documents(
        self, user_id: str, connector_id: str, doc_id: str
    ) -> Dict[str, Any]:
        """Delete documents with proper user isolation"""
        try:
            await self.ensure_initialized()

            # Delete through document store
            await self.document_store.delete_connector_documents(
                user_id=str(user_id), connector_id=str(connector_id), doc_id=doc_id
            )

        except Exception as e:
            logger.exception(
                f"Delete operation failed: {str(e)}",
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def search_documents(
        self,
        query: str,
        user_id: str,
        filters: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = [],
        top_k: int = 5,
    ) -> PipelineOutput:
        """Execute search with proper context and metadata"""
        try:
            await self.ensure_initialized()

            # Create pipeline input
            pipeline_input = PipelineInput(
                query=query,
                user_id=user_id,
                conversation_history=conversation_history,
                metadata={
                    "filters": filters,
                    "top_k": top_k,
                    "search_timestamp": datetime.utcnow().isoformat(),
                },
            )
            # Process through pipeline
            result = await self.document_store.process(pipeline_input)

            return result
        except Exception as e:
            logger.exception(
                f"Document search failed: {str(e)}",
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def cleanup(self):
        """Clean up service resources"""
        try:
            # Cleanup document store if it exists and has cleanup method
            if self.document_store and hasattr(self.document_store, "cleanup"):
                if asyncio.iscoroutinefunction(self.document_store.cleanup):
                    await self.document_store.cleanup()
                else:
                    self.document_store.cleanup()

            self.initialized = False
            logger.info("RAG service cleaned up successfully")

        except Exception as e:
            logger.warning(
                f"Service cleanup failed: {str(e)}",
            )
            # Don't re-raise the exception to allow cleanup to continue

    def __del__(self):
        """Cleanup on deletion"""
        try:
            if asyncio.get_event_loop().is_running():
                asyncio.create_task(self.cleanup())
            else:
                loop = asyncio.new_event_loop()
                loop.run_until_complete(self.cleanup())
                loop.close()
        except Exception as e:
            logger.warning(
                f"Error during service cleanup: {str(e)}",
            )
