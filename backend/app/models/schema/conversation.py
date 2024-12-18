from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.utils.tools import PyObjectId


class MessageCreate(BaseModel):
    content: str
    metadata: Optional[Dict] = None


class MessageResponse(BaseModel):
    id: PyObjectId
    role: str
    content: str
    created_at: datetime
    metadata: Optional[Dict] = None


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    metadata: Optional[Dict] = None


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    metadata: Optional[Dict] = None


class ConversationSummary(BaseModel):
    summary: str
    key_points: List[str]
    generated_at: datetime


class ConversationAnalytics(BaseModel):
    total_conversations: int
    total_messages: int
    active_conversations: int
    avg_messages_per_conversation: float
    recent_conversations: List[Dict]  # Using Dict here as it's a dynamic structure


class ConversationExport(BaseModel):
    conversation: Dict  # Using Dict as it contains nested structures
    messages: List[Dict]
    metadata: Optional[Dict] = None
    archived_messages: Optional[List[Dict]] = None


class ConversationResponse(BaseModel):
    id: PyObjectId
    title: str
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict] = None
    messages: List[MessageResponse] = []
