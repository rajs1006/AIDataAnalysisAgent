from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from app.models.schema.base.connector import ConnectorTypeEnum
from app.models.schema.context.image import ImageMetadata
from ..base.context import BaseContext


class ImageContext(BaseContext):
    files: List[ImageMetadata] = Field(default_factory=list)

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
