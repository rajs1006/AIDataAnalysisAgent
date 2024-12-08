from enum import Enum
from typing import Optional, Dict, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.schema.base.connector import ConnectorBase, ConnectorMetadata, FileStatus


class SyncMode(str, Enum):
    ALL = "all"
    FILTERED = "filtered"


class OneDriveAuth(BaseModel):
    access_token: str
    refresh_token: str
    token_expiry: datetime
    token_type: str


class OneDriveFolder(BaseModel):
    id: str
    name: str
    path: str
    drive_id: str


class OneDriveSettings(BaseModel):
    sync_mode: SyncMode = SyncMode.ALL
    # file_types: Optional[List[str]] = None


class OneDriveConfig(BaseModel):
    auth: Optional[OneDriveAuth] = None
    folder: OneDriveFolder
    settings: OneDriveSettings


class OneDriveFileMetadata(ConnectorMetadata):
    file_id: str
    drive_id: str
    web_url: str


class OAuthCallbackRequest(BaseModel):
    token: OneDriveAuth
    code: str
    redirect_uri: str
    code_verifier: str
    scopes: list[str]


class OneDriveCreate(OneDriveConfig):
    name: str


class OneDriveUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    config: Optional[OneDriveConfig] = None
    enabled: Optional[bool] = None

    class Config:
        extra = "forbid"


class OneDriveResponse(ConnectorBase):
    id: str
    files: List[OneDriveFileMetadata] = []

    class Config:
        orm_mode = True
