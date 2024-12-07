from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from pathlib import Path
from datetime import datetime


class ConnectorType(str, Enum):
    LOCAL_FOLDER = "local_folder"
    ONEDRIVE = "onedrive"
    GOOGLE_DRIVE = "google_drive"
    S3 = "s3"


class ConnectorStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


class Extension(str, Enum):
    PDF = "pdf"
    DOC = "doc"
    DOCX = "docx"
    TXT = "txt"


class FileStatus(str, Enum):
    ACTIVE = "active"
    DELETED = "deleted"
    PROCESSING = "processing"
    ERROR = "error"


class ConnectorBase(BaseModel):
    user_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    connector_type: ConnectorType
    path: Optional[str] = None  # Required for LOCAL_FOLDER, optional for others
    credentials: Optional[dict] = None  # For storing service account keys, etc.
    enabled: bool = True
    user_id: str
    created_at: datetime
    updated_at: datetime
    last_sync: Optional[datetime] = None
    status: str
    error_message: Optional[str] = None
    supported_extensions: List[str] = [".pdf", ".doc", ".docx", ".txt"]

    @validator("path")
    def validate_path(cls, v, values):
        if values.get("connector_type") == ConnectorType.LOCAL_FOLDER:
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
