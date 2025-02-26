from app.core.logging_config import get_logger
import traceback
from typing import List, Dict, Any, Optional
from datetime import datetime

from beanie import PydanticObjectId
from fastapi import HTTPException, status

from app.models.database.connectors.connector import Connector, FileDocument
from app.models.database.users import User
from app.models.enums import ConnectorStatusEnum, ConnectorTypeEnum, FileStatusEnum
from app.models.schema.base.connector import ConnectorUpdate
from app.core.files.blob_storage import BlobStorage
from app.core.exceptions.connector_exceptions import FileNotFoundException
from app.models.schema.base.hierarchy import FileContentResponse

logger = get_logger(__name__)


class ConnectorCRUD:

    @staticmethod
    async def create_connector(connector: Connector, user: User) -> Connector:
        """Create a new folder connector"""

        # existing_for_user = await Connector.find_one(
        #     {
        #         "user_id": str(user.id),
        #         "connector_type": ConnectorTypeEnum.LOCAL_FOLDER,
        #         "status": ConnectorStatusEnum.ACTIVE,
        #         "enabled": True,
        #     }
        # )
        # if existing_for_user:
        #     raise HTTPException(
        #         status_code=status.HTTP_400_BAD_REQUEST,
        #         detail="User can only have one active folder connector at a time",
        #     )

        existing = await Connector.find_one(
            {
                "user_id": str(user.id),
                "name": connector.name,
                "connector_type": ConnectorTypeEnum.LOCAL_FOLDER,
                "status": ConnectorStatusEnum.ACTIVE,
                "enabled": True,
            }
        )
        if existing:
            return existing

        await connector.insert()
        return connector

    @staticmethod
    async def get_user_connectors(user_id: str):
        """Get all active connectors for a user"""
        try:
            connectors = await Connector.find(
                {
                    "user_id": str(user_id),
                    "enabled": True,
                    "status": ConnectorStatusEnum.ACTIVE,
                }
            ).to_list()

            logger.info(
                f"Retrieved {len(connectors)} active connectors for user {user_id}"
            )
            return connectors

        except Exception as e:
            logger.exception(f"Failed to retrieve connectors for user {user_id}")
            raise

    @staticmethod
    async def get_connector(connector_id: str, user_id: str):
        """Get all active connectors for a user"""
        try:
            connector = await Connector.find_one(
                {
                    "_id": PydanticObjectId(connector_id),
                    "user_id": str(user_id),
                    "enabled": True,
                }
            )

            if connector:
                logger.info(f"Retrieved connector {connector_id} for user {user_id}")
            else:
                logger.warning(
                    f"No connector found with id {connector_id} for user {user_id}"
                )

            return connector

        except Exception as e:
            logger.exception(
                f"Failed to retrieve connector {connector_id} for user {user_id}"
            )
            raise

    @staticmethod
    async def update_connector_status(
        user_id: str, connector: ConnectorUpdate
    ) -> Connector:
        """Update a connector's status"""
        try:
            existing_connector = await Connector.find_one(
                {
                    "_id": PydanticObjectId(connector.id),
                    "user_id": str(user_id),
                    "enabled": True,
                }
            )

            if not existing_connector:
                logger.warning(
                    f"Connector not found during status update. user_id: {user_id}, "
                    f"connector_id: {connector.id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            # Update the fields you want to change
            connector_updated = connector.dict(exclude_none=True)
            for key, value in connector_updated.items():
                setattr(existing_connector, key, value)

            # Save the updated connector
            await existing_connector.pre_save()
            await existing_connector.save()

            logger.info(
                f"Successfully updated connector status. user_id: {user_id}, "
                f"connector_id: {connector.id}"
            )
            return connector_updated

        except HTTPException:
            raise
        except Exception as e:
            logger.exception(
                f"Failed to update connector status. user_id: {user_id}, "
                f"connector_id: {connector.id}"
            )
            raise

    @staticmethod
    async def remove_file_reference_from_connector(
        connector_id: str, doc_id: str
    ) -> bool:
        """
        Remove a file reference from a specific connector

        Args:
            connector_id (str): The ID of the connector
            doc_id (str): The ID of the file to remove from the connector

        Returns:
            bool: True if reference removal was successful, False otherwise
        """
        try:
            connector = await Connector.get(PydanticObjectId(connector_id))
            if not connector:
                logger.warning(
                    f"Connector {connector_id} not found for file reference removal"
                )
                return False

            original_file_count = len(connector.files)
            connector.files = [f for f in connector.files if str(f.doc_id) != doc_id]
            files_removed = original_file_count - len(connector.files)

            await connector.save()

            logger.info(
                f"Removed {files_removed} file reference(s) from connector {connector_id}. "
                f"doc_id: {doc_id}"
            )
            return connector

        except Exception as e:
            logger.exception(
                f"Failed to remove file reference. connector_id: {connector_id}, "
                f"doc_id: {doc_id}"
            )
            raise

    @staticmethod
    async def get_user_active_connectors(user_id: str) -> List[Connector]:
        """
        Retrieve active connectors for a user.

        Args:
            user_id (str): ID of the user

        Returns:
            List of connectors

        Raises:
            HTTPException: If no connectors found
        """
        try:
            connectors = await Connector.find(
                Connector.user_id == str(user_id),
                Connector.enabled == True,
                Connector.status == ConnectorStatusEnum.ACTIVE,
            ).to_list()

            for connector in connectors:
                await connector.fetch_all_links()

            if not connectors:
                logger.warning(f"No active connectors found for user {user_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No active connectors found",
                )

            logger.info(
                f"Retrieved {len(connectors)} active connectors for user {user_id}"
            )
            print("=====================connectors=================================")
            print(connectors)
            print("=====================connectors=================================")
            return connectors

        except HTTPException:
            raise
        except Exception as e:
            logger.exception(f"Failed to retrieve active connectors for user {user_id}")
            raise

    # @staticmethod
    # async def get_file_blob(connector_id: str, file_id: str, user_id: str):
    #     """
    #     Retrieve file blob by file ID.

    #     Args:
    #         connector_id (str): ID of the connector
    #         file_id (str): ID of the file
    #         user_id (str): ID of the user

    #     Returns:
    #         BlobData: File blob data

    #     Raises:
    #         FileNotFoundException: If file not found
    #     """
    #     try:
    #         connector = await Connector.find_one(
    #             {
    #                 "_id": PydanticObjectId(connector_id),
    #                 "user_id": str(user_id),
    #                 "enabled": True,
    #             }
    #         )

    #         if not connector:
    #             raise HTTPException(
    #                 status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
    #             )

    #         # Find file with matching doc_id
    #         file_metadata = next(
    #             (file for file in connector.files if file.doc_id == file_id), None
    #         )

    #         if not file_metadata:
    #             raise FileNotFoundException(file_id)

    #         # Retrieve blob from storage using GCS path if available
    #         if file_metadata.blob_gcs_path:
    #             # Create a temporary BlobData object with GCS information
    #             return await BlobStorage.retrieve_blob(file_metadata.blob_gcs_path)

    #         raise FileNotFoundException(file_id)

    #     except Exception as e:
    #         logger.error(
    #             f"Error retrieving file blob: {str(e)}",
    #         )
    #         raise

    # @staticmethod
    # async def get_file_content(connector_id: str, file_id: str, user_id: str):
    #     """
    #     Retrieve file blob by file ID.

    #     Args:
    #         connector_id (str): ID of the connector
    #         file_id (str): ID of the file
    #         user_id (str): ID of the user

    #     Returns:
    #         BlobData: File blob data

    #     Raises:
    #         FileNotFoundException: If file not found
    #     """
    #     try:
    #         if connector_id:
    #             connector = await Connector.find_one(
    #                 {
    #                     "_id": PydanticObjectId(connector_id),
    #                     "user_id": str(user_id),
    #                     "enabled": True,
    #                 }
    #             )

    #             if not connector:
    #                 raise HTTPException(
    #                     status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
    #                 )

    #             # Find file with matching doc_id
    #             file_metadata = next(
    #                 (file for file in connector.files if file.doc_id == file_id), None
    #             )

    #             if not file_metadata:
    #                 raise FileNotFoundException(file_id)
    #         else:

    #         return FileContentResponse(
    #             text=file_metadata.summary["summary"],
    #             metadata={"file_path": file_metadata.file_path},
    #         )
    #     except Exception as e:
    #         logger.error(
    #             f"Error retrieving file blob: {str(e)}",
    #         )
    #         raise
