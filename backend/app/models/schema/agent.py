# app/models/schema/agent.py

from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


# RAG Function Parameter Schemas
class SearchParameters(BaseModel):
    query: str = Field(..., description="The search query string")
    limit: int = Field(5, description="Maximum number of results to return")


class ImageData(BaseModel):
    """Model for image data and processing parameters"""

    content: str = Field(
        ..., description="Base64 encoded image data"
    )  # Changed from bytes to str
    mime_type: str = Field(..., description="Image MIME type")
    filename: Optional[str] = Field(None, description="Original filename")


class QueryRequest(BaseModel):
    query: str = Field(..., description="User's question")
    conversation_id: Optional[str] = Field(None, description="ID of the conversation")
    model: str = Field(default="gpt-4-1106-preview", description="OpenAI model to use")
    temperature: float = Field(default=0.7, ge=0, le=2, description="Model temperature")
    max_tokens: int = Field(default=500, ge=1, description="Maximum response tokens")
    image_data: Optional[ImageData] = Field(
        None, description="Image data if processing an image"
    )


class Source(BaseModel):
    """Source information for search results"""

    connector_name: str = Field(
        ..., description="Name of the connector that provided this result"
    )
    file_path: str = Field(..., description="Path or identifier of the source file")
    relevance_score: Optional[float] = Field(
        None, description="Relevance score of the result"
    )
    doc_id: Optional[str] = Field(None, description="Document ID in the vector store")
    connector_id: Optional[str] = Field(None, description="ID of the connector")


class QueryResponse(BaseModel):
    answer: Optional[str]
    sources: Optional[List[Source]]


class SearchContext(BaseModel):
    content: str
    metadata: dict
    score: Optional[float] = None


class SuggestedCorrection(BaseModel):
    """Model for typo corrections with confidence scoring"""

    original: str = Field(..., description="Original word with potential typo")
    correction: str = Field(..., description="Suggested correction")
    confidence: float = Field(
        default=0.8, ge=0.0, le=1.0, description="Confidence score for the correction"
    )


class SearchResult(BaseModel):
    """Model for search results"""

    content: str = Field(..., description="Document content")
    score: float = Field(..., ge=0.0, le=1.0, description="Relevance score")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Result metadata"
    )
    source: str = Field(..., description="Source document reference")


class AnalysisResult(BaseModel):
    """Model for content analysis results"""

    relevance_score: float
    key_points: List[str]
    missing_info: List[str]
    source_reference: str


class ReActActionType(str, Enum):
    """Available ReAct actions"""

    SEARCH = "search_documents"
    ANSWER = "provide_answer"
    CLARIFY = "clarify"


class ReActAction(BaseModel):
    """Model for ReAct actions"""

    type: ReActActionType
    query: str = Field(..., description="Search query or response content")
    thought: str = Field(..., description="Reasoning behind the action")
    confidence: float = Field(
        default=1.0, ge=0.0, le=1.0, description="Confidence in the action"
    )


class SearchMetadata(BaseModel):
    """Metadata for search operations"""

    original_query: str
    variations: List[str] = Field(default_factory=list)
    corrections: Dict[str, SuggestedCorrection] = Field(default_factory=dict)
    total_results: int = 0
    average_score: float = 0.0
    search_timestamp: str


class ReActState(BaseModel):
    """Track agent's state during conversation"""

    # Existing fields
    search_count: int = 0
    has_final_answer: bool = False
    last_action: Optional[str] = None
    last_observation: Optional[str] = None
    chat_history: List[Dict[str, Any]] = Field(default_factory=list)
    current_reasoning: Optional[str] = None
    search_results: List[SearchResult] = Field(default_factory=list)
    search_metadata: Optional[SearchMetadata] = None
    needs_clarification: bool = False
    clarification_reason: Optional[str] = None
    last_processed_image: Optional[Dict[str, Any]] = Field(
        None, description="Information about the last processed image"
    )

    # New context-related fields
    search_context: List[SearchContext] = Field(
        default_factory=list, description="Current search context for the conversation"
    )
    context_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata about the current context (e.g., relevance scores, timestamps)",
    )
    context_history: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="History of context changes during the conversation",
    )
    active_context_sources: List[str] = Field(
        default_factory=list, description="Currently active context sources being used"
    )


class ConversationContext(BaseModel):
    """Track conversation context and user style"""

    user_style: str = Field(default="neutral", description="User's communication style")
    formality_level: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Level of formality in conversation"
    )
    technical_level: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Level of technical detail preferred"
    )
    detail_preference: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Preferred level of detail in responses",
    )
