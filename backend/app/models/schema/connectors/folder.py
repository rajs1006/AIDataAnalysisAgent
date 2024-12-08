# app/models/schema/connectors/folder.py

from enum import Enum
from typing import Optional, Dict, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.schema.base.connector import (
    ConnectorBase,
    ConnectorMetadata,
    FileStatus,
)


class FileMetadata(ConnectorMetadata):
    file_id: Optional[str] = ""


class WatchEvent(BaseModel):
    connector_id: str
    event_type: str  # created, modified, deleted
    metadata: FileMetadata
    content: Optional[str] = None
    timestamp: int


class PlatformInfo(BaseModel):
    arch: str
    os: str


class FolderCreate(ConnectorBase):
    config: Optional[dict] = None  # For connector-specific configuration
    platform_info: PlatformInfo


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
    files: List[FileMetadata] = []

    class Config:
        orm_mode = True
