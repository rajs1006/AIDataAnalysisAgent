from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from app.core.config.config import settings


class PreprocessingConfig(BaseModel):
    """Configuration for document preprocessing"""

    chunk_size: int = 500
    chunk_overlap: int = 50
    clean_whitespace: bool = True
    clean_header_footer: bool = True
    split_by: str = "word"  # word, sentence, or passage
    language: str = "en"


class EmbeddingConfig(BaseModel):
    """Configuration for embeddings"""

    model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384
    normalize_embeddings: bool = True
    max_seq_length: int = 256
    batch_size: int = 32


class RetrieverConfig(BaseModel):
    """Configuration for retriever components"""

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    top_k: int = 5
    min_score: float = 0.5
    timeout: int = 30  # seconds
    return_raw_scores: bool = True
    batch_size: int = 32

    @validator("top_k")
    def validate_top_k(cls, v):
        if v < 1:
            raise ValueError("top_k must be at least 1")
        return v


class RerankingConfig(BaseModel):
    """Configuration for reranking results"""

    enabled: bool = True
    model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    batch_size: int = 32
    top_k: int = 5
    score_threshold: float = 0.5
    max_length: int = 512


class GeneratorConfig(BaseModel):
    """Configuration for text generation"""

    model_name: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 1000
    top_p: float = 0.95
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    stop_sequences: List[str] = []
    generation_kwargs: Dict[str, Any] = Field(default_factory=dict)

    @validator("temperature")
    def validate_temperature(cls, v):
        if not 0 <= v <= 2:
            raise ValueError("temperature must be between 0 and 2")
        return v


class HybridPipelineConfig(BaseModel):
    """Complete pipeline configuration with enhanced settings"""

    version: str = "1.0.0"
    name: str = "default"
    preprocessing: PreprocessingConfig = Field(default_factory=PreprocessingConfig)
    embedding: EmbeddingConfig = Field(default_factory=EmbeddingConfig)
    retriever: RetrieverConfig = Field(default_factory=RetrieverConfig)
    reranking: RerankingConfig = Field(default_factory=RerankingConfig)
    generator: GeneratorConfig = Field(default_factory=GeneratorConfig)

    # Document store settings
    document_store: Dict[str, Any] = Field(
        default_factory=lambda: {
            "url": settings.QDRANT_URL,
            "index": "rag_collection",
            "similarity": "cosine",
            "embedding_dim": 384,
            "use_sparse_embeddings": True,
            "payload_fields_to_index": [
                {"field_name": "metadata.user_id", "field_schema": "keyword"},
                {"field_name": "metadata.connector_id", "field_schema": "keyword"},
                # ("metadata.user_id", "keyword"),  # For user isolation
                # (
                #     "metadata.connector_id",
                #     "keyword",
                # ),  # For connector-based filtering
                {
                    "field_name": "metadata.file_type",
                    "field_schema": "keyword",
                },  # For file type filtering
                {"field_name": "metadata.indexed_at", "field_schema": "datetime"},
            ],
        }
    )

    # Pipeline behavior settings
    max_retries: int = 3
    timeout: int = 60
    debug_mode: bool = False
    openai_api_key: Optional[str] = settings.OPENAI_API_KEY

    class Config:
        arbitrary_types_allowed = True

    def get_component_config(self, component_name: str) -> Dict[str, Any]:
        """Get configuration for a specific component"""
        component_configs = {
            "preprocessor": self.preprocessing.dict(),
            "embedder": self.embedding.dict(),
            "retriever": self.retriever.dict(),
            "reranker": self.reranking.dict(),
            "generator": self.generator.dict(),
        }
        return component_configs.get(component_name, {})


# Predefined configurations for different use cases
DEFAULT_CONFIGS = {
    "default": HybridPipelineConfig(
        name="default",
        preprocessing=PreprocessingConfig(chunk_size=500, chunk_overlap=50),
        retriever=RetrieverConfig(top_k=5),
    ),
    "max_quality": HybridPipelineConfig(
        name="max_quality",
        preprocessing=PreprocessingConfig(
            chunk_size=300,  # Smaller chunks for more precise matching
            chunk_overlap=100,
        ),
        retriever=RetrieverConfig(
            top_k=10,
            min_score=0.7,  # Higher threshold for better quality
            model_name="sentence-transformers/all-mpnet-base-v2",  # Better but slower model
        ),
        reranking=RerankingConfig(enabled=True, top_k=5, score_threshold=0.7),
        generator=GeneratorConfig(
            temperature=0.3, max_tokens=2000  # More focused generation
        ),
    ),
    "fast_search": HybridPipelineConfig(
        name="fast_search",
        preprocessing=PreprocessingConfig(
            chunk_size=1000, chunk_overlap=25  # Larger chunks for faster processing
        ),
        retriever=RetrieverConfig(
            top_k=3,
            min_score=0.3,  # Lower threshold for faster retrieval
            model_name="sentence-transformers/all-MiniLM-L6-v2",  # Faster model
        ),
        reranking=RerankingConfig(enabled=False),  # Skip reranking for speed
        generator=GeneratorConfig(max_tokens=500, temperature=0.9),  # Shorter responses
    ),
    "balanced": HybridPipelineConfig(
        name="balanced",
        preprocessing=PreprocessingConfig(chunk_size=500, chunk_overlap=50),
        retriever=RetrieverConfig(top_k=5, min_score=0.5),
        reranking=RerankingConfig(enabled=True, top_k=3, score_threshold=0.6),
        generator=GeneratorConfig(temperature=0.7, max_tokens=1000),
    ),
}
