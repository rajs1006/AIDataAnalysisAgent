"""Custom exceptions for the RAG pipeline."""


class PipelineError(Exception):
    """Base exception for pipeline errors."""

    pass


class QueryEnhancementError(PipelineError):
    """Raised when query enhancement fails."""

    pass


class DataRoutingError(PipelineError):
    """Raised when data routing or query execution fails."""

    pass


class ResponseGenerationError(PipelineError):
    """Raised when response generation fails."""

    pass


class MongoQueryError(PipelineError):
    """Raised when MongoDB query generation or execution fails."""

    pass


class CacheError(PipelineError):
    """Raised when cache operations fail."""

    pass


class DocumentProcessingError(PipelineError):
    """Raised when document processing fails."""

    pass


class ValidationError(PipelineError):
    """Raised when data validation fails."""

    pass


class ResourceInitializationError(PipelineError):
    """Raised when resource initialization fails."""

    pass
