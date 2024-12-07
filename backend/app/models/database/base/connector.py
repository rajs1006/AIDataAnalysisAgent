from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from datetime import datetime, timedelta
from typing import Optional, Dict, List


class BaseConnector(Document):

    id: Optional[PydanticObjectId] = None
    user_id: str
    name: str = Field(..., min_length=1, max_length=255)
    path: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict] = None
    supported_extensions: List[str] = [".pdf", ".doc", ".docx", ".txt"]
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_sync: Optional[datetime] = None
    status: str = "created"  # created, active, error, disabled
    error_message: Optional[str] = None

    class Settings:
        name = "connectors"
        indexes = [
            "user_id",
            "connector_type",
            ("user_id", "name"),
            [("files.file_path", 1), ("user_id", 1)],
            [("files.status", 1), ("user_id", 1)],
        ]
