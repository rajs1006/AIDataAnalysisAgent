from datetime import datetime
from beanie import PydanticObjectId
from fastapi import HTTPException, status
from typing import Optional, List, Tuple
import logging

from app.models.database.connectors.onedrive import OneDriveConnector
from app.models.schema.connectors.onedrive import (
    OneDriveCreate,
    OneDriveFileMetadata,
)
from app.models.schema.base.connector import FileStatus
from app.models.schema.base.connector import ConnectorType
from app.models.schema.base.connector import ConnectorStatus

logger = logging.getLogger(__name__)


class OneDriveCRUD:
    @staticmethod
    async def get_user_connectors(user_id: str) -> List[OneDriveConnector]:
        """Get all active OneDrive connectors for a user"""
        return await OneDriveConnector.find(
            {"user_id": str(user_id), "enabled": True}
        ).to_list()

    @staticmethod
    async def create_connector(
        connector_data: OneDriveCreate, user_id: str
    ) -> OneDriveConnector:
        """Create a new OneDrive connector"""
        existing = await OneDriveConnector.find_one(
            {
                "user_id": str(user_id),
                "connector_type": ConnectorType.ONEDRIVE,
                "status": ConnectorStatus.ACTIVE,
                "enabled": True,
            }
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User can only have one active onedrive connector at a time",
            )

        connector = OneDriveConnector(
            name=connector_data.name,
            path=connector_data.folder.path,
            # description=connector_data.description,
            config={
                "folder": connector_data.folder.dict(),
                "settings": connector_data.settings.dict(),
            },
            user_id=str(user_id),
            enabled=True,
            status="active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await connector.insert()
        return connector

    @staticmethod
    async def get_connector(
        connector_id: str, user_id: str
    ) -> Optional[OneDriveConnector]:
        """Get a specific connector"""
        return await OneDriveConnector.find_one(
            {
                "_id": PydanticObjectId(connector_id),
                "user_id": str(user_id),
                "enabled": True,
            }
        )

    @staticmethod
    async def validate_connector(connector_id: str, user_id: str) -> OneDriveConnector:
        """Validate and return a connector"""
        connector = await OneDriveConnector.find_one(
            {
                "_id": PydanticObjectId(connector_id),
                "user_id": str(user_id),
                "enabled": True,
            }
        )

        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
            )

        return connector

    @staticmethod
    async def update_connector_status(
        connector_id: str, status: str, error_message: Optional[str] = None
    ) -> OneDriveConnector:
        """Update a connector's status"""
        connector = await OneDriveConnector.get(PydanticObjectId(connector_id))
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
            )

        connector.status = status
        connector.error_message = error_message
        connector.updated_at = datetime.utcnow()
        await connector.save()
        return connector

    @staticmethod
    async def update_file_metadata(
        connector_id: str, file_metadata: OneDriveFileMetadata
    ) -> Tuple[OneDriveConnector, OneDriveFileMetadata]:
        """Update or add file metadata to a connector"""
        try:
            connector = await OneDriveConnector.get(PydanticObjectId(connector_id))
            if not connector:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            # Update existing file metadata or add new one
            existing_files = [
                f for f in connector.files if f.file_id != file_metadata.file_id
            ]
            existing_files.append(file_metadata)
            connector.files = existing_files
            connector.updated_at = datetime.utcnow()

            await connector.save()
            return connector, file_metadata

        except Exception as e:
            logger.error(f"Error updating file metadata: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update file metadata: {str(e)}",
            )

    @staticmethod
    async def delete_file_metadata(
        connector_id: str, file_id: str
    ) -> OneDriveConnector:
        """Remove file metadata from a connector"""
        try:
            connector = await OneDriveConnector.get(PydanticObjectId(connector_id))
            if not connector:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            # Update file status to deleted
            for file in connector.files:
                if file.file_id == file_id:
                    file.status = FileStatus.DELETED
                    break

            connector.updated_at = datetime.utcnow()
            await connector.save()
            return connector

        except Exception as e:
            logger.error(f"Error deleting file metadata: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete file metadata: {str(e)}",
            )

    @staticmethod
    async def update_sync_status(
        connector_id: str, sync_time: datetime, error: Optional[str] = None
    ) -> OneDriveConnector:
        """Update connector sync status"""
        connector = await OneDriveConnector.get(PydanticObjectId(connector_id))
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
            )

        connector.last_sync = sync_time
        if error:
            connector.status = "error"
            connector.error_message = error
        else:
            connector.status = "active"
            connector.error_message = None

        await connector.save()
        return connector
