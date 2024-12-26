from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from pathlib import Path
from datetime import datetime
from beanie import Document, Indexed, PydanticObjectId


class ContextStatus(str, Enum):
    ACTIVE = "active"
    DELETED = "deleted"
    PROCESSING = "processing"
    ERROR = "error"


class ContextMetadata(BaseModel):
    filename: str
    extension: str
    size: int
    last_modified: int  # milliseconds timestamp
    created_at: int  # milliseconds timestamp
    content_hash: str
    content_text: str
    content: Optional[str] = None
    file_path: Optional[str] = None
    status: ContextStatus = ContextStatus.ACTIVE
    doc_id: Optional[str] = None
    last_indexed: Optional[datetime] = None
    vector_ids: Optional[list] = None
    error_message: Optional[str] = None
    total_chunks: Optional[int] = None

    class Config:
        use_enum_values = True
        json_encoders = {datetime: lambda v: int(v.timestamp() * 1000) if v else None}
