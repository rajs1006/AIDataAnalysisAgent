from typing import Dict, Any, List, Optional
import logging
import asyncio
from datetime import datetime
import uuid
from fastapi import HTTPException

from haystack import Document

from app.agents.haystack_agent.pipeline import HaystackRAGPipeline
from app.agents.haystack_agent.base import PipelineInput, PipelineOutput
from app.core.store.vectorizer.haystacks import VectorStore

logger = logging.getLogger(__name__)


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
            logger.error(f"Failed to initialize RAG service: {str(e)}")
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
                    "user_id": user_id,
                    "connector_id": connector_id,
                    "indexed_at": datetime.utcnow().isoformat(),
                    "file_path": doc.get("file_path", "Unknown"),
                    "file_type": doc.get("file_type", "Unknown"),
                    "file_name": doc.get("file_name", "Unknown"),
                    **(metadata or {}),
                }

                haystack_doc = Document(
                    content=doc["content"],
                    meta=doc_metadata,
                    id=f"{connector_id}_{doc.get('doc_id', str(uuid.uuid4()))}",
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
            logger.error(f"Failed to add documents: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def delete_documents(
        self,
        user_id: str,
        connector_id: str,
    ) -> Dict[str, Any]:
        """Delete documents with proper user isolation"""
        try:
            await self.ensure_initialized()

            print("-----------------------------------------")
            print("deleting ", user_id, connector_id)
            # Delete through document store
            await self.document_store.delete_connector_documents(
                user_id=str(user_id), connector_id=str(connector_id)
            )

        except Exception as e:
            logger.error(f"Delete operation failed: {str(e)}")
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
            logger.error(f"Document search failed: {str(e)}")
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
            logger.error(f"Failed to get stats: {str(e)}")
            return {"status": "error", "detail": str(e)}

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
            logger.error(f"Service cleanup failed: {str(e)}")
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
            logger.error(f"Error during service cleanup: {str(e)}")
