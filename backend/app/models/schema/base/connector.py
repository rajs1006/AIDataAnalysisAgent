from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from pathlib import Path
from datetime import datetime
from beanie import Document, Indexed, PydanticObjectId
from app.models.enums import ConnectorStatusEnum, ConnectorTypeEnum, FileStatusEnum


class ConnectorBase(BaseModel):
    user_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    connector_type: ConnectorTypeEnum
    path: Optional[str] = None  # Required for LOCAL_FOLDER, optional for others
    credentials: Optional[dict] = None  # For storing service account keys, etc.
    enabled: bool = True
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_sync: Optional[datetime] = None
    status: ConnectorStatusEnum = ConnectorStatusEnum.ACTIVE
    error_message: Optional[str] = None
    supported_extensions: List[str] = [".pdf", ".doc", ".docx", ".txt"]

    @validator("path")
    def validate_path(cls, v, values):
        if values.get("connector_type") == ConnectorTypeEnum.LOCAL_FOLDER:
            if not v:
                raise ValueError("Path is required for local folder connectors")
            path = Path(v)
            if not path.exists():
                raise ValueError(f"Path {v} does not exist")
            if not path.is_dir():
                raise ValueError(f"Path {v} is not a directory")
        return v


class ConnectorMetadata(BaseModel):
    filename: str
    extension: str
    size: int
    last_modified: datetime  # milliseconds timestamp
    created_at: datetime  # milliseconds timestamp
    content_hash: str
    content: Optional[str] = None
    summary: Optional[dict] = None
    file_path: Optional[str] = None
    status: FileStatusEnum = FileStatusEnum.ACTIVE
    doc_id: Optional[str] = None
    last_indexed: Optional[datetime] = None
    vector_ids: Optional[list] = None
    error_message: Optional[str] = None
    total_chunks: Optional[int] = None

    # blob metadata
    blob_file_id: Optional[str] = None
    blob_content_type: Optional[str] = None
    blob_size: Optional[int] = None
    blob_filename: Optional[str] = None
    blob_gcs_bucket: Optional[str] = None
    blob_gcs_path: Optional[str] = None

    ai_metadata: Optional[dict] = None

    class Config:
        use_enum_values = True
        json_encoders = {datetime: lambda v: int(v.timestamp() * 1000) if v else None}


class ConnectorUpdate(BaseModel):
    id: PydanticObjectId
    enabled: Optional[bool] = None
    status: Optional[str] = None

    class Config:
        extra = "forbid"


# New schema for frontend representation
class ConnectorFrontend(BaseModel):
    config: Optional[dict] = None
    connector_type: ConnectorTypeEnum
    created_at: str
    description: Optional[str] = None
    enabled: bool
    error_message: Optional[str] = None
    last_sync: Optional[str] = None
    name: str
    path: Optional[str] = None
    status: str
    supported_extensions: List[str]
    updated_at: str
    user_id: str
    connector_id: str

    @classmethod
    def from_database_model(cls, db_model):
        """
        Convert a database Connectors model to frontend representation
        """
        return cls(
            config=None,
            connector_type=db_model.connector_type,
            created_at=db_model.created_at.isoformat() if db_model.created_at else None,
            description=None,
            enabled=db_model.enabled,
            error_message=None,
            last_sync=db_model.last_sync.isoformat() if db_model.last_sync else None,
            name=db_model.name,
            path=None,
            status=db_model.status,
            supported_extensions=db_model.supported_extensions,
            updated_at=db_model.updated_at.isoformat() if db_model.updated_at else None,
            user_id=db_model.user_id,
            connector_id=str(db_model.id),
        )
