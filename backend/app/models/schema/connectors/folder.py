# app/models/schema/connectors/folder.py

from enum import Enum
from typing import Optional, Dict, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.schema.base import ConnectorBase


class FileStatus(str, Enum):
    ACTIVE = "active"
    DELETED = "deleted"
    PROCESSING = "processing"
    ERROR = "error"


class FileType(str, Enum):
    PDF = "pdf"
    DOC = "doc"
    DOCX = "docx"
    TXT = "txt"


class FileMetadata(BaseModel):
    filename: str
    extension: str
    size: int
    last_modified: int  # milliseconds timestamp
    created_at: int  # milliseconds timestamp
    content_hash: str
    content: Optional[str] = None
    file_path: str
    status: FileStatus = FileStatus.ACTIVE
    doc_id: Optional[str] = None
    last_indexed: Optional[datetime] = None
    vector_ids: Optional[list] = None
    error_message: Optional[str] = None
    total_chunks: Optional[int] = None

    class Config:
        use_enum_values = True
        json_encoders = {datetime: lambda v: int(v.timestamp() * 1000) if v else None}


class WatchEvent(BaseModel):
    connector_id: str
    event_type: str  # created, modified, deleted
    metadata: FileMetadata
    content: Optional[str] = None
    timestamp: int


class FolderCreate(ConnectorBase):
    user_id: Optional[str] = None
    supported_extensions: List[str] = [".pdf", ".doc", ".docx", ".txt"]


class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    path: Optional[str] = None
    enabled: Optional[bool] = None
    supported_extensions: Optional[List[str]] = None
    config: Optional[Dict] = None

    class Config:
        extra = "forbid"


class FolderResponse(ConnectorBase):
    id: str
    user_id: str
    files: List[FileMetadata] = []
    created_at: datetime
    updated_at: datetime
    status: str
    error_message: Optional[str] = None

    class Config:
        orm_mode = True
