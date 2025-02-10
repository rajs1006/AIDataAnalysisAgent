from app.core.logging_config import get_logger
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime
import uuid
from fastapi import HTTPException

from haystack import Document

from app.agents.haystack_agent.pipeline import HaystackRAGPipeline
from app.agents.haystack_agent.base import PipelineInput, PipelineOutput
from app.core.store.vectorizer.haystacks import VectorStore


logger = get_logger(__name__)


class RagService:
    """Service layer for RAG implementation using Haystack components"""

    def __init__(
        self,
        vector_store: VectorStore,
        pipeline: Optional[HaystackRAGPipeline],
    ):
        self.initialized = False

        # Components
        self.document_store = vector_store
        self.pipeline = pipeline

    async def initialize(self):
        """Initialize service components and pipeline"""
        try:
            # Initialize vector store with proper settings
            await self.document_store.initialize_collection()

            # Create and initialize pipeline
            await self.pipeline.initialize(document_store=self.document_store)

            self.initialized = True
            logger.info("RAG service initialized successfully")

        except Exception as e:
            logger.error(
                "Failed to initialize RAG service: {str(e)}",
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
            haystack_docs = []
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

                haystack_doc = Document(
                    content=doc["content"],
                    meta=doc_metadata,
                    # id=doc.get("doc_id"),
                    # id=f"{connector_id}_{doc.get('doc_id', str(uuid.uuid4()))}",
                )
                haystack_docs.append(haystack_doc)

            # Process through pipeline
            result = await self.pipeline.add_documents(
                documents=haystack_docs,
                metadata={
                    "batch_id": str(uuid.uuid4()),
                    "total_docs": len(haystack_docs),
                },
            )

            return {
                "status": "success",
                "processed_documents": len(haystack_docs),
                "pipeline_result": result,
            }

        except Exception as e:
            logger.error(
                "Failed to add documents: {str(e)}",
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
            logger.error(
                f"Unexpected error updating metadata for doc {doc_id}: {str(e)}"
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def delete_documents(
        self,
        user_id: str,
        connector_id: str,
    ) -> Dict[str, Any]:
        """Delete documents with proper user isolation"""
        try:
            await self.ensure_initialized()

            # Delete through document store
            await self.document_store.delete_connector_documents(
                user_id=str(user_id), connector_id=str(connector_id)
            )

        except Exception as e:
            logger.error(
                "Delete operation failed: {str(e)}",
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
            result = await self.pipeline.process(pipeline_input)

            return result
        except Exception as e:
            logger.error(
                "Document search failed: {str(e)}",
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def get_pipeline_stats(self) -> Dict[str, Any]:
        """Get pipeline statistics and performance metrics"""
        try:
            if not self.initialized:
                return {"status": "not_initialized"}

            # Get stats from pipeline and document store
            pipeline_stats = await self.pipeline.get_stats()
            store_stats = await self.document_store.get_collection_stats()

            return {
                "status": "active",
                "pipeline": pipeline_stats,
                "document_store": store_stats,
            }

        except Exception as e:
            logger.error(
                "Failed to get stats: {str(e)}",
            )
            return {"status": "error", "detail": str(e)}

    async def remove_collaborators(
        self, doc_id: str, user_id: str, collaborator_ids: List[str]
    ) -> Dict[str, Any]:
        """Remove specified collaborators from a document.

        Args:
            doc_id (str): The ID of the document
            user_id (str): The ID of the user making the removal request
            collaborator_ids (List[str]): List of collaborator user IDs to remove

        Returns:
            Dict[str, Any]: Status of the removal operation

        Raises:
            HTTPException: If removal fails or document not found
        """
        try:
            await self.ensure_initialized()

            # Verify document exists and check authorization
            doc = await self.document_store.get_document(doc_id)
            if not doc:
                raise HTTPException(
                    status_code=404, detail=f"Document with ID {doc_id} not found"
                )

            # Check if user is owner or admin collaborator
            existing_collaborators = doc.meta.get("collaborators", [])
            is_admin = any(
                collab.get("user_id") == user_id
                and collab.get("access_level") == "admin"
                for collab in existing_collaborators
            )

            if doc.meta.get("user_id") != user_id and not is_admin:
                raise HTTPException(
                    status_code=403, detail="Not authorized to modify collaborators"
                )

            # Filter out the specified collaborators
            updated_collaborators = [
                collab
                for collab in existing_collaborators
                if collab["user_id"] not in collaborator_ids
            ]

            # Update metadata with new collaborator information
            updated_metadata = {**doc.meta}
            updated_metadata["collaborators"] = updated_collaborators
            updated_metadata["collaborator_ids"] = [
                collab["user_id"] for collab in updated_collaborators
            ]
            updated_metadata["access_levels"] = {
                collab["user_id"]: collab["access_level"]
                for collab in updated_collaborators
            }
            updated_metadata["updated_at"] = datetime.utcnow().isoformat()

            # Create updated document
            updated_doc = Document(
                content=doc.content, meta=updated_metadata, id=doc_id
            )

            # Update through document store
            await self.document_store.update_document(updated_doc)

            return {
                "status": "success",
                "doc_id": doc_id,
                "removed_collaborators": collaborator_ids,
                "remaining_collaborators": updated_metadata["collaborator_ids"],
            }

        except HTTPException as he:
            logger.error(f"Collaborator removal failed for doc {doc_id}: {str(he)}")
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error removing collaborators for doc {doc_id}: {str(e)}"
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def clear_all_collaborators(
        self, doc_id: str, user_id: str
    ) -> Dict[str, Any]:
        """Remove all collaborators from a document.

        Args:
            doc_id (str): The ID of the document
            user_id (str): The ID of the user making the request

        Returns:
            Dict[str, Any]: Status of the clear operation
        """
        try:
            await self.ensure_initialized()

            # Verify document exists and check authorization
            doc = await self.document_store.get_document(doc_id)
            if not doc:
                raise HTTPException(
                    status_code=404, detail=f"Document with ID {doc_id} not found"
                )

            if doc.meta.get("user_id") != user_id:
                raise HTTPException(
                    status_code=403,
                    detail="Only document owner can clear all collaborators",
                )

            # Reset collaborator fields in metadata
            updated_metadata = {**doc.meta}
            updated_metadata["collaborators"] = []
            updated_metadata["collaborator_ids"] = []
            updated_metadata["access_levels"] = {}
            updated_metadata["updated_at"] = datetime.utcnow().isoformat()

            # Create updated document
            updated_doc = Document(
                content=doc.content, meta=updated_metadata, id=doc_id
            )

            # Update through document store
            await self.document_store.update_document(updated_doc)

            return {
                "status": "success",
                "doc_id": doc_id,
                "message": "All collaborators removed",
            }

        except HTTPException as he:
            logger.error(f"Clear collaborators failed for doc {doc_id}: {str(he)}")
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error clearing collaborators for doc {doc_id}: {str(e)}"
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def cleanup(self):
        """Clean up service resources"""
        try:
            # Cleanup pipeline if it exists
            if self.pipeline:
                await self.pipeline.cleanup()

            # Cleanup document store if it exists and has cleanup method
            if self.document_store and hasattr(self.document_store, "cleanup"):
                if asyncio.iscoroutinefunction(self.document_store.cleanup):
                    await self.document_store.cleanup()
                else:
                    self.document_store.cleanup()

            self.initialized = False
            logger.info("RAG service cleaned up successfully")

        except Exception as e:
            logger.error(
                "Service cleanup failed: {str(e)}",
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
            logger.error(
                "Error during service cleanup: {str(e)}",
            )
