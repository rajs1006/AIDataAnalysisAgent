from app.core.logging_config import get_logger
import traceback
from typing import List, Dict, Any, Optional
from datetime import datetime

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.database.connectors.connector import Connectors
from app.models.schema.base.connector import ConnectorUpdate, FileStatus
from app.core.files.blob_storage import BlobStorage
from app.core.exceptions.connector_exceptions import FileNotFoundException
from app.models.schema.base.hierarchy import FileContentResponse

logger = get_logger(__name__)


class ConnectorCRUD:
    @staticmethod
    async def get_user_connectors(user_id: str):
        """Get all active connectors for a user"""
        try:
            connectors = await Connectors.find(
                {"user_id": str(user_id), "enabled": True}
            ).to_list()

            return connectors
        except Exception as e:
            traceback.print_exception(type(e), e, e.__traceback__)
            raise

    @staticmethod
    async def get_connector(connector_id: str, user_id: str):
        """Get all active connectors for a user"""
        try:
            return await Connectors.find_one(
                {
                    "_id": PydanticObjectId(connector_id),
                    "user_id": str(user_id),
                    "enabled": True,
                }
            )
        except Exception as e:
            traceback.print_exception(type(e), e, e.__traceback__)
            raise

    @staticmethod
    async def update_connector_status(
        user_id: str, connector: ConnectorUpdate
    ) -> Connectors:
        """Update a connector's status"""
        try:
            existing_connector = await Connectors.find_one(
                {
                    "_id": PydanticObjectId(connector.id),
                    "user_id": str(user_id),
                    "enabled": True,
                }
            )

            if not existing_connector:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            # Update the fields you want to change
            connector_updated = connector.dict(exclude_none=True)
            for key, value in connector_updated.items():
                setattr(existing_connector, key, value)

            # Save the updated connector
            # Use pre_save hook and save
            await existing_connector.pre_save()
            await existing_connector.save()

            return connector_updated
        except Exception as e:
            traceback.print_exception(type(e), e, e.__traceback__)
            raise

    @staticmethod
    async def get_user_active_connectors(user_id: str) -> List[Connectors]:
        """
        Retrieve file hierarchy for a specific connector.

        Args:
            user_id (str): ID of the user

        Returns:
            List of connectors
        """
        try:
            connectors = await Connectors.find(
                {"user_id": str(user_id), "enabled": True, "status": FileStatus.ACTIVE}
            ).to_list()

            if not connectors:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )
            return connectors

        except Exception as e:
            logger.error(
                "Error retrieving active connector for user {user_id}: {str(e)}",
            )
            raise

    @staticmethod
    async def get_file_blob(connector_id: str, file_id: str, user_id: str):
        """
        Retrieve file blob by file ID.

        Args:
            connector_id (str): ID of the connector
            file_id (str): ID of the file
            user_id (str): ID of the user

        Returns:
            BlobData: File blob data

        Raises:
            FileNotFoundException: If file not found
        """
        try:
            connector = await Connectors.find_one(
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

            # Find file with matching doc_id
            file_metadata = next(
                (file for file in connector.files if file.doc_id == file_id), None
            )

            if not file_metadata:
                raise FileNotFoundException(file_id)

            # Retrieve blob from storage using GCS path if available
            if file_metadata.blob_gcs_path:
                # Create a temporary BlobData object with GCS information
                return await BlobStorage.retrieve_blob(file_metadata.blob_gcs_path)

            raise FileNotFoundException(file_id)

        except Exception as e:
            logger.error(
                f"Error retrieving file blob: {str(e)}",
            )
            raise

    @staticmethod
    async def get_file_content(connector_id: str, file_id: str, user_id: str):
        """
        Retrieve file blob by file ID.

        Args:
            connector_id (str): ID of the connector
            file_id (str): ID of the file
            user_id (str): ID of the user

        Returns:
            BlobData: File blob data

        Raises:
            FileNotFoundException: If file not found
        """
        try:
            connector = await Connectors.find_one(
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

            # Find file with matching doc_id
            file_metadata = next(
                (file for file in connector.files if file.doc_id == file_id), None
            )
            print(file_metadata.summary)

            if not file_metadata:
                raise FileNotFoundException(file_id)

            return FileContentResponse(
                text=file_metadata.summary["summary"],
                metadata={"file_path": file_metadata.file_path},
            )
        except Exception as e:
            logger.error(
                f"Error retrieving file blob: {str(e)}",
            )
            raise
