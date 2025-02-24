"""Enhanced RAG service implementation using LangChain components."""

from typing import Dict, Any, List, Optional, Union
import asyncio
from datetime import datetime
import uuid
from fastapi import HTTPException
from beanie import PydanticObjectId

from haystack import Document
from app.models.database.connectors.connector import Connector, FileDocument
from app.models.schema.base.connector import FileStatusEnum

from app.agents.langchain.pipeline import EnhancedRAGPipeline
from app.agents.langchain.router import QueryResult
from app.agents.haystack.base import PipelineInput, PipelineOutput
from app.core.store.vectorizer import VectorStore
from app.core.store.database.mongo import MongoDBConnector
from app.core.logging_config import get_logger
from haystack.dataclasses.byte_stream import ByteStream

logger = get_logger(__name__)


class RagService:
    """Service layer for RAG implementation using LangChain components."""

    def __init__(
        self,
        vector_store: VectorStore,
        mongo_client: Optional[MongoDBConnector] = None,
        pipeline: Optional[EnhancedRAGPipeline] = None,
    ):
        self.initialized = False
        self.document_store = vector_store
        self.mongo_client = mongo_client
        self.pipeline = pipeline

    async def initialize(self):
        """Initialize service components and pipeline."""
        try:
            # Initialize vector store
            await self.document_store.initialize_collection()

            # Initialize pipeline if provided
            if self.pipeline:
                await self.pipeline.initialize(
                    document_store=self.document_store  # , mongo_client=self.mongo_client
                )

            self.initialized = True
            logger.info("LangChain RAG service initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize LangChain RAG service: {str(e)}")
            raise

    async def ensure_initialized(self):
        """Ensure service is initialized before operations."""
        if not self.initialized:
            logger.warning("LangChain RAG service not initialized. Initializing now...")
            await self.initialize()

    async def search_documents(
        self,
        query: str,
        user_id: str,
        filters: Optional[Dict[str, Any]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        top_k: int = 5,
    ) -> PipelineOutput:
        """Execute search with enhanced multimodal capabilities."""
        try:
            await self.ensure_initialized()

            # Create pipeline input
            pipeline_input = PipelineInput(
                query=query,
                user_id=user_id,
                conversation_history=conversation_history or [],
                metadata={
                    "filters": filters,
                    "top_k": top_k,
                    "search_timestamp": datetime.utcnow().isoformat(),
                },
            )

            # Process through enhanced pipeline
            result = await self.pipeline.process(pipeline_input)

            return result

        except Exception as e:
            logger.error(f"Document search failed: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def add_documents(
        self,
        documents: List[Dict[str, Any]],
        user_id: str,
        connector_id: Union[str, PydanticObjectId],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Add documents with enhanced metadata handling using Beanie models."""
        try:
            await self.ensure_initialized()

            # Convert connector_id to PydanticObjectId if string
            # if isinstance(connector_id, str):
            #     connector_id = PydanticObjectId(connector_id)

            # # Get connector
            # connector = await Connector.get(connector_id)
            # if not connector:
            #     raise HTTPException(status_code=404, detail=f"Connector {connector_id} not found")

            # Create file documents
            print("adding document")
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
                # await file_doc.save()
                vector_docs.append(
                    Document(
                        content=doc["content"],
                        blob=ByteStream(
                            data=doc["blob"].blob,
                            mime_type=doc["blob"].mime_type,
                            meta={"file_name": doc["blob"].filename},
                        ),
                        dataframe=doc["dataframe"],
                        meta=doc_metadata,
                    )
                )

            result = await self.document_store.add_documents(
                documents=vector_docs,
                metadata={
                    "batch_id": str(uuid.uuid4()),
                    "total_docs": len(vector_docs),
                    "processor": "langchain_enhanced",
                },
            )

            return {
                "status": "success",
                "processed_documents": len(vector_docs),
                "pipeline_result": result,
            }

        except Exception as e:
            logger.error(f"Failed to add documents: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def get_pipeline_stats(self) -> Dict[str, Any]:
        """Get enhanced pipeline statistics and performance metrics."""
        try:
            if not self.initialized:
                return {"status": "not_initialized"}

            # Get stats from pipeline components
            pipeline_metrics = (
                self.pipeline.performance_metrics if self.pipeline else {}
            )
            store_stats = await self.document_store.get_collection_stats()

            return {
                "status": "active",
                "pipeline_metrics": {
                    "queries_processed": pipeline_metrics.get("queries_processed", 0),
                    "average_query_time": pipeline_metrics.get("average_query_time", 0),
                    "cache_hits": pipeline_metrics.get("cache_hits", 0),
                    "cache_misses": pipeline_metrics.get("cache_misses", 0),
                    "error_count": pipeline_metrics.get("error_count", 0),
                },
                "document_store": store_stats,
                "embedding_models": {
                    "dense": "BAAI/bge-small-en-v1.5",
                    "sparse": "prithvida/Splade_PP_en_v1",
                },
            }

        except Exception as e:
            logger.error(f"Failed to get stats: {str(e)}")
            return {"status": "error", "detail": str(e)}

    async def cleanup(self):
        """Clean up service resources."""
        try:
            if self.pipeline:
                await self.pipeline.cleanup()

            if self.document_store and hasattr(self.document_store, "cleanup"):
                if asyncio.iscoroutinefunction(self.document_store.cleanup):
                    await self.document_store.cleanup()
                else:
                    self.document_store.cleanup()

            self.initialized = False
            logger.info("LangChain RAG service cleaned up successfully")

        except Exception as e:
            logger.error(f"Service cleanup failed: {str(e)}")

    def __del__(self):
        """Cleanup on deletion."""
        try:
            if asyncio.get_event_loop().is_running():
                asyncio.create_task(self.cleanup())
            else:
                loop = asyncio.new_event_loop()
                loop.run_until_complete(self.cleanup())
                loop.close()
        except Exception as e:
            logger.error(f"Error during service cleanup: {str(e)}")
