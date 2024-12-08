from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
from .connectors.folder import FileMetadata


class VectorMetadata(FileMetadata):
    user_id: str
    connector_id: str
    parent_doc_id: Optional[str] = None


class VectorDocument(BaseModel):
    id: str
    vector: Optional[List[float]] = None
    content: Optional[str] = ""
    metadata: VectorMetadata
    content_preview: str
    indexed_at: int
    score: float
