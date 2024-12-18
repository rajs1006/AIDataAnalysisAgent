from datetime import datetime
from typing import Dict, List, Optional
from beanie import PydanticObjectId

from beanie import Document, Link
from pydantic import Field

from app.models.database.users import User


class Message(Document):
    user_id: str
    conversation_id: str
    role: str = Field(..., description="Role can be 'user' or 'assistant'")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict] = Field(default=None)

    class Settings:
        name = "messages"

class Conversation(Document):
    user_id: str
    title: Optional[str] = Field(default="New Conversation")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict] = Field(default=None)
    user: Optional[Link[User]]

    class Settings:
        name = "conversations"
