from beanie import Document, Indexed, PydanticObjectId, Link
from pydantic import Field
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from app.models.enums import ConnectorTypeEnum, ConnectorStatusEnum, FileStatusEnum
from app.models.schema.base.connector import ConnectorMetadata


class FileDocument(Document):
    filename: str
    extension: str
    size: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_modified: datetime = Field(default_factory=datetime.utcnow)
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

    async def pre_save(self):
        self.updated_at = datetime.utcnow()

    class Settings:
        name = "files"
        indexes = [
            "filename",
            "status",
            "content_hash",
        ]

    class Config:
        json_encoders = {datetime: lambda v: int(v.timestamp() * 1000)}

    @classmethod
    def from_embedded_data(cls, file_data: ConnectorMetadata) -> "FileDocument":
        """
        Create a FileDocument instance from old embedded file data
        """
        return cls(
            filename=file_data.filename,
            extension=file_data.extension,
            size=file_data.size,
            last_modified=file_data.last_modified,
            created_at=file_data.created_at,
            content_hash=file_data.content_hash,
            content=file_data.content,
            summary=file_data.summary,
            file_path=file_data.file_path,
            status=(
                file_data.status
                if hasattr(file_data, "status")
                else FileStatusEnum.ACTIVE
            ),
            doc_id=file_data.doc_id,
            last_indexed=file_data.last_indexed,
            vector_ids=file_data.vector_ids,
            error_message=file_data.error_message,
            total_chunks=file_data.total_chunks,
            blob_file_id=file_data.blob_file_id,
            blob_content_type=file_data.blob_content_type,
            blob_size=file_data.blob_size,
            blob_filename=file_data.blob_filename,
            blob_gcs_bucket=file_data.blob_gcs_bucket,
            blob_gcs_path=file_data.blob_gcs_path,
            ai_metadata=file_data.ai_metadata,
        )


class Connector(Document):
    user_id: str
    name: str = Field(..., min_length=1, max_length=255)
    path: Optional[str] = None
    description: Optional[str] = None
    connector_type: Optional[ConnectorTypeEnum] = None
    config: Optional[Dict] = None
    supported_extensions: List[str] = [".pdf", ".doc", ".docx", ".txt"]
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_sync: Optional[datetime] = None
    status: str = ConnectorStatusEnum.ACTIVE
    error_message: Optional[str] = None
    files: Optional[List[Link[FileDocument]]] = Field(default_factory=list)

    async def pre_save(self):
        self.updated_at = datetime.utcnow()

    class Config:
        json_encoders = {
            datetime: lambda v: int(
                v.timestamp() * 1000
            )  # Convert to milliseconds timestamp
        }

    def dict(self, *args, **kwargs):
        d = super().dict(*args, **kwargs)
        # Convert datetime objects to millisecond timestamps
        if "created_at" in d:
            d["created_at"] = int(d["created_at"].timestamp() * 1000)
        if "updated_at" in d:
            d["updated_at"] = int(d["updated_at"].timestamp() * 1000)
        if "last_sync" in d and d["last_sync"]:
            d["last_sync"] = int(d["last_sync"].timestamp() * 1000)
        return d

    class Settings:
        name = "connectors"
        indexes = [
            "user_id",
            "connector_type",
            ("user_id", "name"),
        ]

    @classmethod
    def from_request_data(cls, connector_data, user_id: str) -> "Connector":
        now = datetime.utcnow()
        return cls(
            name=connector_data.name,
            connector_type=ConnectorTypeEnum.LOCAL_FOLDER,
            path=connector_data.path,
            user_id=user_id,
            config=connector_data.platform_info.dict(),
            supported_extensions=connector_data.supported_extensions,
            enabled=True,
            status=ConnectorStatusEnum.ACTIVE,
            created_at=now,
            updated_at=now,
        )
