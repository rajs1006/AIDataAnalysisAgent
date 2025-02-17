from app.core.logging_config import get_logger
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from haystack import Pipeline, Document
from haystack.components.generators import OpenAIGenerator
from haystack.components.preprocessors import DocumentSplitter
from haystack_integrations.components.retrievers.qdrant import QdrantHybridRetriever
from haystack.utils import Secret
from haystack_integrations.components.embedders.fastembed import (
    FastembedTextEmbedder,
    FastembedDocumentEmbedder,
    FastembedSparseTextEmbedder,
    FastembedSparseDocumentEmbedder,
)
from qdrant_client import models
from haystack.components.builders import PromptBuilder

from app.agents.haystack_agent.writer import AsyncDocumentWriter
from app.agents.haystack_agent.base import BasePipeline, PipelineInput, PipelineOutput
from app.agents.haystack_agent.config import HybridPipelineConfig
from app.agents.prompts.prompt_manager import PromptManager


logger = get_logger(__name__)


class HaystackRAGPipeline(BasePipeline):
    """Enhanced RAG pipeline with proper component isolation and error handling"""

    def __init__(self, config: HybridPipelineConfig):
        self.config = config
        self.prompt_manager = PromptManager().load_prompts(
            file_path="haystack_prompt.yml"
        )
        self.executor = ThreadPoolExecutor(max_workers=3)
        self.reset_state()

    def reset_state(self):
        """Reset pipeline state"""
        self.document_store = None
        self.retriever = None
        self.indexing_pipeline = None
        self.query_pipeline = None
        self.initialized = False
        self.performance_metrics = {
            "queries_processed": 0,
            "indexing_operations": 0,
            "average_query_time": 0,
            "total_query_time": 0,
            "errors": [],
        }

    async def run_in_executor(self, func, *args, **kwargs):
        """Run synchronous code in thread executor"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, lambda: func(*args, **kwargs))

    async def initialize(self, document_store):
        """Initialize pipeline components with proper error handling"""
        try:
            if not self.initialized:
                # Store reference
                self.document_store = document_store

                # Initialize core components
                await self._init_core_components()

                # Build pipelines
                await self._build_query_pipeline()
                await self._build_indexing_pipeline()

                self.initialized = True
                logger.info("Pipeline initialized successfully")

        except Exception as e:
            logger.error(
                "Pipeline initialization failed: {str(e)}",
            )
            self.reset_state()
            raise

    async def _init_core_components(self):
        """Initialize core pipeline components"""
        try:
            # Initialize retriever
            self.retriever = QdrantHybridRetriever(
                document_store=self.document_store,
                top_k=self.config.retriever.top_k,
            )

            self.prompt = PromptBuilder(template=self.prompt_manager["SYSTEM_PROMPT"])
            # Initialize generator
            self.generator = OpenAIGenerator(
                api_key=Secret.from_token(self.config.openai_api_key),
                model=self.config.generator.model_name,
                generation_kwargs=self.config.generator.generation_kwargs,
            )

        except Exception as e:
            logger.error(
                "Failed to initialize core components: {str(e)}",
            )
            raise

    async def _build_query_pipeline(self):
        """Build query processing pipeline"""
        try:
            self.query_pipeline = Pipeline()

            self.query_pipeline.add_component(
                "sparse_text_embedder",
                FastembedSparseTextEmbedder(model="prithvida/Splade_PP_en_v1"),
            )
            self.query_pipeline.add_component(
                "dense_text_embedder",
                FastembedTextEmbedder(
                    model="BAAI/bge-small-en-v1.5",
                    prefix="Represent this sentence for searching relevant passages: ",
                ),
            )
            self.query_pipeline.add_component("retriever", self.retriever)
            self.query_pipeline.add_component("prompt_builder", self.prompt)
            self.query_pipeline.add_component("generator", self.generator)

            # Add and connect components
            self.query_pipeline.connect(
                "sparse_text_embedder.sparse_embedding",
                "retriever.query_sparse_embedding",
            )
            self.query_pipeline.connect(
                "dense_text_embedder.embedding", "retriever.query_embedding"
            )
            self.query_pipeline.connect("retriever", "prompt_builder.documents")
            self.query_pipeline.connect("prompt_builder", "generator")

        except Exception as e:
            logger.error(
                "Failed to build query pipeline: {str(e)}",
            )
            raise

    async def _build_indexing_pipeline(self):
        """Build document indexing pipeline"""
        try:
            self.indexing_pipeline = Pipeline()

            # Create preprocessor
            preprocessor = DocumentSplitter(
                split_by=self.config.preprocessing.split_by,
                split_length=self.config.preprocessing.chunk_size,
                split_overlap=self.config.preprocessing.chunk_overlap,
            )

            # Add and connect components
            self.indexing_pipeline.add_component("preprocessor", preprocessor)
            self.indexing_pipeline.add_component(
                "sparse_doc_embedder",
                FastembedSparseDocumentEmbedder(model="prithvida/Splade_PP_en_v1"),
            )
            self.indexing_pipeline.add_component(
                "dense_doc_embedder",
                FastembedDocumentEmbedder(model="BAAI/bge-small-en-v1.5"),
            )
            self.indexing_pipeline.add_component(
                "writer", AsyncDocumentWriter(document_store=self.document_store)
            )

            self.indexing_pipeline.connect("preprocessor", "sparse_doc_embedder")
            self.indexing_pipeline.connect("sparse_doc_embedder", "dense_doc_embedder")
            self.indexing_pipeline.connect("dense_doc_embedder", "writer")

        except Exception as e:
            logger.error(
                "Failed to build indexing pipeline: {str(e)}",
            )
            raise

    async def process(self, input_data: PipelineInput) -> PipelineOutput:
        """Process query with proper error handling and metrics"""
        start_time = datetime.now()
        try:
            if not self.initialized:
                raise ValueError("Pipeline not initialized")

            # Format filters properly for Qdrant
            filters = models.Filter(
                must=[
                    models.FieldCondition(
                        key="meta.user_ids",
                        match=models.MatchAny(any=[input_data.user_id]),
                    ),
                ]
            )

            # Prepare query input for each component
            query_input = {
                "sparse_text_embedder": {"text": input_data.query},
                "dense_text_embedder": {"text": input_data.query},
                "prompt_builder": {
                    "query": input_data.query,
                    "conversation_history": input_data.conversation_history,
                },
                "retriever": {
                    "filters": filters,
                    "top_k": self.config.retriever.top_k,
                },
            }

            # Execute pipeline
            result = await self.run_in_executor(
                self.query_pipeline.run,
                query_input,
            )

            # Process results
            replies = result.get("generator", [])
            answer, sources = self._process_answer(replies)

            # Update metrics
            self._update_metrics(start_time)

            return PipelineOutput(
                answer=answer,
                sources=sources,
                metadata=self._generate_metadata(replies),
            )

        except Exception as e:
            logger.error(
                "Query processing failed: {str(e)}",
            )
            self._record_error(str(e))
            raise

    async def add_documents(
        self, documents: List[Document], metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Add documents with proper preprocessing and metadata"""
        try:
            if not self.initialized:
                raise ValueError("Pipeline not initialized")

            # Enhance documents with metadata
            enhanced_docs = self._enhance_documents(documents, metadata)

            result = await self.run_in_executor(
                self.indexing_pipeline.run, {"documents": enhanced_docs}
            )

            # Update metrics
            self.performance_metrics["indexing_operations"] += 1

            return {
                "status": "success",
                "processed_documents": len(enhanced_docs),
                "result": result,
                "metadata": {
                    "timestamp": datetime.utcnow().isoformat(),
                    "pipeline_stats": await self.get_stats(),
                },
            }

        except Exception as e:
            logger.error(
                "Document indexing failed: {str(e)}",
            )
            self._record_error(str(e))
            raise

    def _process_documents(self, documents: List[Document]) -> List[Dict[str, Any]]:
        """Process documents with enhanced metadata"""
        processed_docs = []
        for idx, doc in enumerate(documents):
            processed_doc = {
                "content": doc.content,
                "metadata": {
                    **doc.metadata,
                    "score": getattr(doc, "score", None),
                    "rank": idx + 1,
                    "processing_info": {
                        "processed_at": datetime.utcnow().isoformat(),
                        "pipeline_version": self.config.version,
                        "embedding_model": self.config.embedding.model_name,
                    },
                },
                "source": doc.metadata.get("source", "Unknown"),
                "doc_id": doc.id_,
            }
            processed_docs.append(processed_doc)
        return processed_docs

    def _process_answer(self, result: Dict[str, Any]) -> str:
        """Extract and process generator answer"""
        answers = result.get("replies", [])
        if not answers:
            return ""

        # Try to parse JSON from the response
        answer_text = answers[0]
        # Remove markdown code block markers and clean the text
        clean_text = answer_text.replace("```json", "").replace("```", "").strip()

        try:
            # Parse the JSON
            import json

            parsed_answer = json.loads(clean_text)

            # Store the structured data in performance metrics
            self.performance_metrics["last_response"] = {
                "answer": parsed_answer.get("answer", ""),
                "sources": parsed_answer.get("sources", ""),
                "summary": parsed_answer.get("summary", ""),
            }

            # Return just the answer text
            return (parsed_answer.get("answer", ""), parsed_answer.get("sources", ""))

        except json.JSONDecodeError as e:
            logger.error(
                "Error parsing JSON response: {str(e)}",
            )
            return (self._clean_answer(answer_text), "")

    def _clean_answer(self, answer: str) -> str:
        """Clean and format the generated answer"""
        if not answer:
            return ""

        # Remove any system artifacts
        answer = answer.replace("<|system|>", "").replace("<|user|>", "")

        # Clean whitespace
        answer = " ".join(answer.split())

        return answer.strip()

    def _enhance_documents(
        self, documents: List[Document], metadata: Optional[Dict] = None
    ) -> List[Document]:
        """Enhance documents with additional metadata"""
        enhanced_docs = []
        for doc in documents:
            doc_metadata = {
                **doc.meta,
                "indexed_at": datetime.utcnow().isoformat(),
                "pipeline_version": self.config.version,
                "embedding_model": self.config.embedding.model_name,
                "processing_config": {
                    "chunk_size": self.config.preprocessing.chunk_size,
                    "chunk_overlap": self.config.preprocessing.chunk_overlap,
                },
                **(metadata or {}),
            }

            enhanced_doc = Document(
                content=doc.content,
                meta=doc_metadata,
                id=doc.id
                or f"{doc_metadata.get('connector_id', 'default')}_{datetime.utcnow().timestamp()}",
            )
            enhanced_docs.append(enhanced_doc)

        return enhanced_docs

    def _generate_metadata(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive metadata about pipeline execution"""
        usage_metrics = {}
        if result and "meta" in result:
            meta = result["meta"][0]
            if "usage" in meta:
                usage = meta["usage"]
                usage_metrics = {
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                    "model": meta.get("model", "unknown"),
                }

        # Get structured response data
        structured_response = self.performance_metrics.get("last_response", {})

        return {
            "pipeline_info": {
                "version": self.config.version,
                "name": self.config.name,
            },
            "usage_metrics": usage_metrics,
            "performance_metrics": self.performance_metrics,
            "structured_response": {
                "sources": structured_response.get("sources", []),
                "summary": structured_response.get("summary", ""),
            },
            "processing_timestamp": datetime.utcnow().isoformat(),
            "retrieval_stats": {
                "total_results": len(result.get("replies", [])),
                "model_used": usage_metrics.get("model", "unknown"),
                "token_usage": {
                    "completion": usage_metrics.get("completion_tokens", 0),
                    "prompt": usage_metrics.get("prompt_tokens", 0),
                    "total": usage_metrics.get("total_tokens", 0),
                },
            },
        }

    def _update_metrics(self, start_time: datetime):
        """Update pipeline performance metrics"""
        query_time = (datetime.now() - start_time).total_seconds()
        self.performance_metrics["queries_processed"] += 1
        self.performance_metrics["total_query_time"] += query_time
        self.performance_metrics["average_query_time"] = (
            self.performance_metrics["total_query_time"]
            / self.performance_metrics["queries_processed"]
        )

    def _record_error(self, error_message: str):
        """Record error in pipeline metrics"""
        if "errors" not in self.performance_metrics:
            self.performance_metrics["errors"] = []

        self.performance_metrics["errors"].append(
            {"timestamp": datetime.utcnow().isoformat(), "error": str(error_message)}
        )

    async def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive pipeline statistics and configuration"""
        try:
            current_time = datetime.utcnow().isoformat()

            # System status and health
            status = {
                "status": "initialized" if self.initialized else "not_initialized",
                "timestamp": current_time,
                "pipeline_version": self.config.version,
                "pipeline_name": self.config.name,
                "debug_mode": self.config.debug_mode,
            }

            # Detailed performance metrics
            performance = {
                "queries": {
                    "total_processed": self.performance_metrics["queries_processed"],
                    "average_time": round(
                        self.performance_metrics.get("average_query_time", 0), 3
                    ),
                    "total_time": round(
                        self.performance_metrics.get("total_query_time", 0), 3
                    ),
                },
                "indexing": {
                    "total_operations": self.performance_metrics["indexing_operations"],
                },
                "errors": {
                    "total": len(self.performance_metrics.get("errors", [])),
                    "recent": self.performance_metrics.get("errors", [])[
                        -5:
                    ],  # Last 5 errors
                },
            }

            # Component configuration and health
            components = {
                "preprocessing": {
                    "config": {
                        "chunk_size": self.config.preprocessing.chunk_size,
                        "chunk_overlap": self.config.preprocessing.chunk_overlap,
                        "split_by": self.config.preprocessing.split_by,
                        "clean_whitespace": self.config.preprocessing.clean_whitespace,
                    }
                },
                "embedding": {
                    "config": {
                        "model": self.config.embedding.model_name,
                        "dimension": self.config.embedding.embedding_dim,
                        "max_seq_length": self.config.embedding.max_seq_length,
                    }
                },
                "retriever": {
                    "config": {
                        "top_k": self.config.retriever.top_k,
                        "min_score": self.config.retriever.min_score,
                        "timeout": self.config.retriever.timeout,
                    },
                    "status": "active" if self.retriever else "inactive",
                },
                # "reranking": {
                #     "config": {
                #         "enabled": self.config.reranking.enabled,
                #         "model": self.config.reranking.model_name,
                #         "top_k": self.config.reranking.top_k,
                #         "score_threshold": self.config.reranking.score_threshold,
                #     },
                #     "status": "active" if self.ranker else "inactive",
                # },
                "generator": {
                    "config": {
                        "model": self.config.generator.model_name,
                        "max_tokens": self.config.generator.max_tokens,
                        "temperature": self.config.generator.temperature,
                    },
                    "status": "active" if self.generator else "inactive",
                },
            }

            # Pipeline health and settings
            pipelines = {
                "indexing_pipeline": {
                    "status": "active" if self.indexing_pipeline else "inactive",
                    "components": ["preprocessor", "embedder", "writer"],
                },
                "query_pipeline": {
                    "status": "active" if self.query_pipeline else "inactive",
                    "components": ["retriever", "ranker", "generator"],
                },
            }

            # Resource settings
            resources = {
                "max_retries": self.config.max_retries,
                "timeout": self.config.timeout,
                "batch_sizes": {
                    "embedding": self.config.embedding.batch_size,
                    "retriever": self.config.retriever.batch_size,
                    "reranker": self.config.reranking.batch_size,
                },
            }

            return {
                "status": status,
                "performance": performance,
                "components": components,
                "pipelines": pipelines,
                "resources": resources,
            }

        except Exception as e:
            logger.error(
                "Failed to gather pipeline stats: {str(e)}",
            )
            return {
                "status": {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat(),
                }
            }

    async def cleanup(self):
        """Cleanup pipeline resources"""
        try:
            # Shutdown thread executor
            if hasattr(self, "executor") and self.executor:
                self.executor.shutdown(wait=True)

            # Clean up individual components that might have cleanup methods
            components_to_cleanup = [
                self.generator,
                self.retriever,
                self.ranker,
                self.doc_embedder,
            ]

            for component in components_to_cleanup:
                if component and hasattr(component, "cleanup"):
                    try:
                        if asyncio.iscoroutinefunction(component.cleanup):
                            await component.cleanup()
                        else:
                            component.cleanup()
                    except Exception as e:
                        logger.warning(
                            f"Error cleaning up component {component.__class__.__name__}: {str(e)}"
                        )

            # Reset pipeline state
            self.reset_state()
            logger.info("Pipeline cleaned up successfully")

        except Exception as e:
            logger.error(
                "Cleanup failed: {str(e)}",
            )

    def __del__(self):
        """Cleanup on deletion"""
        if hasattr(self, "executor") and self.executor:
            try:
                self.executor.shutdown(wait=False)
            except Exception as e:
                logger.error(
                    "Error during executor shutdown: {str(e)}",
                )
