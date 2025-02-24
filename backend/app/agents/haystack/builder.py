from haystack import Pipeline
from haystack_integrations.components.embedders.fastembed import (
    FastembedTextEmbedder,
    FastembedDocumentEmbedder,
    FastembedSparseTextEmbedder,
    FastembedSparseDocumentEmbedder,
)
from haystack.utils import Secret
from haystack.components.preprocessors import DocumentSplitter
from haystack.components.preprocessors import CSVDocumentSplitter
from haystack.components.preprocessors import CSVDocumentCleaner
from haystack.document_stores.types import DuplicatePolicy
from haystack.components.routers import MetadataRouter
from haystack.components.joiners import DocumentJoiner
from haystack.components.builders import PromptBuilder
from haystack.components.generators import OpenAIGenerator
from haystack.components.preprocessors import DocumentSplitter
from haystack_integrations.components.retrievers.qdrant import QdrantHybridRetriever

from app.agents.haystack.writer import AsyncDocumentWriter
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class PipelineBuilder:
    """Handles creation and management of document processing pipelines."""

    def __init__(self, document_store, config):
        self.document_store = document_store
        self.config = config

    async def build_query_pipeline(self, system_prompt: str):
        """Build query processing pipeline"""
        try:
            query_pipeline = Pipeline()

            retriever = QdrantHybridRetriever(
                document_store=self.document_store,
                top_k=self.config.retriever.top_k,
            )

            prompt = PromptBuilder(template=system_prompt)
            # Initialize generator
            generator = OpenAIGenerator(
                api_key=Secret.from_token(self.config.openai_api_key),
                model=self.config.generator.model_name,
                generation_kwargs=self.config.generator.generation_kwargs,
            )

            query_pipeline.add_component(
                "sparse_text_embedder",
                FastembedSparseTextEmbedder(model="prithvida/Splade_PP_en_v1"),
                # FastembedSparseTextEmbedder(
                #     model=self.config.embedding.sparse_model_name
                # ),
            )
            query_pipeline.add_component(
                "dense_text_embedder",
                FastembedTextEmbedder(
                    model=self.config.embedding.dense_model_name,
                    prefix="Represent this sentence for searching relevant passages: ",
                ),
            )
            query_pipeline.add_component("retriever", retriever)
            query_pipeline.add_component("prompt_builder", prompt)
            query_pipeline.add_component("generator", generator)

            # Add and connect components
            query_pipeline.connect(
                "sparse_text_embedder.sparse_embedding",
                "retriever.query_sparse_embedding",
            )
            query_pipeline.connect(
                "dense_text_embedder.embedding", "retriever.query_embedding"
            )
            query_pipeline.connect("retriever", "prompt_builder.documents")
            query_pipeline.connect("prompt_builder", "generator")

            return query_pipeline

        except Exception as e:
            logger.exception(
                f"Failed to build query pipeline: {str(e)}",
            )
            raise

    async def build_indexing_pipeline(self) -> Pipeline:
        """Create an indexing pipeline for documents."""
        try:
            pipeline = Pipeline()

            # Add the ConditionalRouter component to the pipeline.
            router = MetadataRouter(
                rules={
                    "text": {
                        "field": "meta.file_type",
                        "operator": "!=",
                        "value": ".csv",
                    },
                    "csv": {
                        "field": "meta.file_type",
                        "operator": "==",
                        "value": ".csv",
                    },
                }
            )
            pipeline.add_component(instance=router, name="router")
            # Add the preprocessor component for non-CSV documents.
            pipeline.add_component(
                "text_splitter",
                instance=DocumentSplitter(
                    split_by=self.config.preprocessing.split_by,
                    split_length=self.config.preprocessing.chunk_size,
                    split_overlap=self.config.preprocessing.chunk_overlap,
                ),
            )
            # Add CSV-specific components.
            pipeline.add_component(
                instance=CSVDocumentSplitter(
                    row_split_threshold=1, column_split_threshold=1
                ),
                name="csv_splitter",
            )
            pipeline.add_component(
                instance=CSVDocumentCleaner(
                    remove_empty_rows=True, remove_empty_columns=True, keep_id=True
                ),
                name="cleaner",
            )

            # Common components for both pipelines
            pipeline.add_component(
                "sparse_doc_embedder",
                FastembedSparseDocumentEmbedder(
                    model=self.config.embedding.sparse_model_name,
                    meta_fields_to_embed=["file_summary", "file_name"],
                ),
            )
            pipeline.add_component(
                "dense_doc_embedder",
                FastembedDocumentEmbedder(
                    model=self.config.embedding.dense_model_name,
                    meta_fields_to_embed=["file_summary", "file_name"],
                ),
            )
            pipeline.add_component(
                "writer",
                AsyncDocumentWriter(
                    document_store=self.document_store,
                    policy=DuplicatePolicy.OVERWRITE,
                ),
            )
            pipeline.add_component(instance=DocumentJoiner(), name="document_joiner")

            # For non-CSV documents: router -> preprocessor -> sparse_doc_embedder.
            pipeline.connect("router.text", "text_splitter")

            # Connect the components accordingly
            pipeline.connect("router.csv", "cleaner")
            pipeline.connect("cleaner", "csv_splitter")

            pipeline.connect("cleaner", "document_joiner")
            pipeline.connect("text_splitter", "document_joiner")

            pipeline.connect("document_joiner", "sparse_doc_embedder")
            pipeline.connect("sparse_doc_embedder", "dense_doc_embedder")
            pipeline.connect("dense_doc_embedder", "writer")

            return pipeline

        except Exception as e:
            logger.exception(f"Failed to build document pipeline: {str(e)}")
            raise
