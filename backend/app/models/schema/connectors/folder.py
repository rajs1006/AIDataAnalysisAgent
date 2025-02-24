# app/models/schema/connectors/folder.py

from enum import Enum
from typing import Optional, Dict, List, Union
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.schema.base.connector import (
    ConnectorBase,
    ConnectorMetadata,
    FileStatusEnum,
)
from fastapi import UploadFile


class FileMetadata(ConnectorMetadata):
    file_id: Optional[str] = ""


class FileEvent(BaseModel):
    connector_id: str
    event_type: str  # created, modified, deleted
    metadata: FileMetadata
    content: Optional[Union[str, List[Dict]]] = None
    parsed_content: Optional[str] = None
    timestamp: datetime


class PlatformInfo(BaseModel):
    arch: str
    os: str


class FolderCreate(ConnectorBase):
    config: Optional[dict] = None  # For connector-specific configuration
    platform_info: PlatformInfo
    files: List[UploadFile]  # Changed to List[UploadFile]

    class Config:  # Note: capital C in Config, not lowercase config
        arbitrary_types_allowed = True


class FolderResponse(ConnectorBase):
    id: str
    files: List[FileMetadata] = []

    class Config:
        orm_mode = True
