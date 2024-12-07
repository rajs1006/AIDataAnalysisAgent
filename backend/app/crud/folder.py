from datetime import datetime
from beanie import PydanticObjectId
from fastapi import HTTPException, status
from typing import Optional, Tuple
import logging

from app.models.database.connectors.folder import FolderConnector
from app.models.schema.connectors.folder import (
    FileMetadata,
    FolderCreate,
)

logger = logging.getLogger(__name__)


class FolderConnectorCRUD:

    @staticmethod
    async def create_connector(connector_data: FolderCreate, user) -> FolderConnector:
        """Create a new folder connector"""

        existing_for_user = await FolderConnector.find_one(
            {"user_id": str(user.id), "enabled": True}
        )
        if existing_for_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User can only have one active folder connector at a time",
            )

        existing = await FolderConnector.find_one(
            {"user_id": str(user.id), "name": connector_data.name, "enabled": True}
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Connector with this name already exists",
            )

        connector = FolderConnector(
            name=connector_data.name,
            description=connector_data.description,
            connector_type=connector_data.connector_type,
            path=connector_data.path,
            user_id=str(user.id),
            config=connector_data.config,
            supported_extensions=connector_data.supported_extensions,
            enabled=True,
            files=[],
            status="active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await connector.insert()
        return connector

    @staticmethod
    async def get_connector(
        connector_id: str, user_id: str
    ) -> Optional[FolderConnector]:
        """Get a specific connector"""
        return await FolderConnector.find_one(
            {
                "_id": PydanticObjectId(connector_id),
                "user_id": str(user_id),
                "enabled": True,
            }
        )

    @staticmethod
    async def validate_connector(connector_id: str, user_id: str) -> FolderConnector:
        """Validate and return a connector"""
        if not connector_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Missing connector ID"
            )

        connector = await FolderConnector.find_one(
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
    ) -> FolderConnector:
        """Update a connector's status"""
        connector = await FolderConnector.get(PydanticObjectId(connector_id))
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
        connector_id: str, file_metadata: FileMetadata
    ) -> Tuple[FolderConnector, FileMetadata]:
        """Update or add file metadata to a connector"""
        try:
            # Get the connector
            connector = await FolderConnector.get(PydanticObjectId(connector_id))
            if not connector:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            # Remove existing file metadata if it exists
            connector.files = [
                f for f in connector.files if f.file_path != file_metadata.file_path
            ]

            # Add new file metadata
            connector.files.append(file_metadata)
            connector.updated_at = datetime.utcnow()

            # Save the updated connector
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
        connector_id: str, file_path: str
    ) -> FolderConnector:
        """Remove file metadata from a connector"""
        try:
            connector = await FolderConnector.get(PydanticObjectId(connector_id))
            if not connector:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            # Remove file metadata
            connector.files = [f for f in connector.files if f.file_path != file_path]
            connector.updated_at = datetime.utcnow()

            # Save the updated connector
            await connector.save()

            return connector

        except Exception as e:
            logger.error(f"Error deleting file metadata: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete file metadata: {str(e)}",
            )

    @staticmethod
    async def log_error(connector_id: str, error_message: str) -> None:
        """Log an error for a connector"""
        try:
            connector = await FolderConnector.get(PydanticObjectId(connector_id))
            if connector:
                connector.error_message = error_message
                connector.status = "error"
                connector.updated_at = datetime.utcnow()
                await connector.save()
        except Exception as e:
            logger.error(f"Failed to log error for connector {connector_id}: {str(e)}")
