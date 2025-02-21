from typing import Dict, List, Optional, Union, Any
from datetime import datetime
from pydantic import BaseModel, Field
from typing_extensions import Literal


class FileNode(BaseModel):
    """Represents a file or directory in the hierarchy."""

    name: str
    type: Literal["file", "folder"]
    children: Optional[List[Dict[str, "FileNode"]]] = None
    extension: Optional[str] = None
    last_indexed: Optional[datetime] = None
    doc_id: Optional[str] = None
    size: Optional[int] = None
    path: Optional[str] = None
    content_hash: Optional[str] = None


class FileHierarchyResponse(BaseModel):
    """Response model for file hierarchy."""

    hierarchy: List[Dict[str, Dict[str, Any]]]
    total_files: int
    total_size: int
    user_id: str


class BlobData(BaseModel):
    """Represents raw file blob data."""

    file_id: str
    mime_type: str
    filename: str
    gcs_bucket: str
    gcs_path: str
    size: Optional[int] = None
    blob: Optional[bytes] = None

    @classmethod
    def from_class(cls, result_blob) -> dict:
        """Returns a dictionary with blob data fields from the instance."""
        if not isinstance(result_blob, cls):
            raise ValueError("Input must be a BlobData instance")

        return {
            "blob_file_id": result_blob.file_id,
            "blob_mime_type": result_blob.mime_type,
            "blob_size": result_blob.size,
            "blob_filename": result_blob.filename,
            "blob_gcs_bucket": result_blob.gcs_bucket,
            "blob_gcs_path": result_blob.gcs_path,
        }


class FileContentResponse(BaseModel):
    """Response model for file content."""

    text: Dict
    metadata: Dict[str, Optional[str]] = Field(
        description="Metadata associated with the file content",
        example={"file_path": "/path/to/file.txt", "file_name": "example.txt"},
    )
