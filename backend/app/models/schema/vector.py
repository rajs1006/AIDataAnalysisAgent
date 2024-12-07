from pydantic import BaseModel
from typing import Dict, Any, List
from datetime import datetime


class VectorMetadata(BaseModel):
    user_id: str
    connector_id: str
    file_path: str
    # file_type: str
    # file_size: int
    last_modified: datetime
    created_at: datetime


class VectorDocument(BaseModel):
    id: str
    # vector: List[float]
    metadata: VectorMetadata
    content_preview: str
    indexed_at: int
    score: float
