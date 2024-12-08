from pydantic import Field
from datetime import datetime
from typing import Optional, Dict, List
from app.models.schema.base.connector import ConnectorType
from app.models.schema.connectors.onedrive import (
    OneDriveFileMetadata,
)
from ..base.connector import BaseConnector


class OneDriveConnector(BaseConnector):
    connector_type: ConnectorType = ConnectorType.ONEDRIVE
    files: List[OneDriveFileMetadata] = Field(default_factory=list)

    # class Settings:
    #     name = "data_connectors"
    #     indexes = [
    #         "user_id",
    #         "connector_type",
    #         ("user_id", "name"),
    #         [("files.file_id", 1), ("user_id", 1)],
    #         [("files.status", 1), ("user_id", 1)],
    #         [("config.folder.id", 1), ("user_id", 1)],
    #     ]

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
