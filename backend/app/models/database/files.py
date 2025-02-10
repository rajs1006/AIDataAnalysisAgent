from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from datetime import datetime
from typing import Optional, Dict, Any
from app.models.schema.base.connector import FileStatusEnum, ConnectorTypeEnum


class FileDocument(Document):
    connector_id: PydanticObjectId
    connector_type: ConnectorTypeEnum
    filename: str
    extension: str
    size: int
    last_modified: int  # milliseconds timestamp
    created_at: int  # milliseconds timestamp
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

    class Settings:
        name = "files"
        indexes = [
            "connector_id",
            "connector_type",
            "filename",
            "status",
            "content_hash",
        ]

    class Config:
        json_encoders = {datetime: lambda v: int(v.timestamp() * 1000)}
