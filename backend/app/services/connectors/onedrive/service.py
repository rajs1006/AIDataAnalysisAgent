import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status

from app.services.store.vectorizer import VectorStore
from app.crud.onedrive import OneDriveCRUD
from app.models.schema.connectors.onedrive import (
    OneDriveCreate,
    OneDriveFileMetadata,
    OAuthCallbackRequest,
)
from app.models.schema.base.connector import FileStatus
from app.models.database.users import User
from .client import OneDriveClient
from app.core.security.oauth import OneDriveOAuth

logger = logging.getLogger(__name__)


class OneDriveService:
    def __init__(self, crud: OneDriveCRUD, vector_store: VectorStore):
        self.vector_store = vector_store
        self.crud = crud

    async def handle_oauth_callback(self, callback_data: OAuthCallbackRequest):
        """Handle OAuth callback after authorization"""
        try:
            # Initialize OAuth handler
            oauth_handler = OneDriveOAuth(callback_data.redirect_uri)

            # Exchange code for tokens
            auth_data = await oauth_handler.get_tokens(callback_data.code)

            # Test access by making a basic API call
            async with OneDriveClient(auth_data) as client:
                user_drive = await client._make_request("GET", "/me/drive")

            return {
                "status": "success",
                "auth_data": auth_data,
                "drive_info": {
                    "id": user_drive["id"],
                    "name": user_drive["name"],
                    "type": user_drive["driveType"],
                },
            }

        except Exception as e:
            logger.error(f"OAuth callback handling failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to handle OAuth callback: {str(e)}",
            )

    async def list_connectors(self, user_id: str):
        return await self.crud.get_user_connectors(user_id)

    async def create_connector(self, connector_data: OneDriveCreate, user: User):
        try:
            # Validate OneDrive access
            async with OneDriveClient(user.onedriveOauth) as client:
                # Verify folder access
                await client.list_folder_contents(
                    connector_data.folder.drive_id,
                    connector_data.folder.id,
                    recursive=False,
                )

            # Create connector in database
            connector = await self.crud.create_connector(connector_data, user.id)

            # Start initial sync
            await self.sync_folder(connector.id, user)

            return connector

        except Exception as e:
            logger.error(f"Failed to create OneDrive connector: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create connector: {str(e)}",
            )

    async def sync_folder(self, connector_id: str, user: str):
        """Synchronize OneDrive folder contents"""
        try:
            connector = await self.crud.get_connector(connector_id, user.id)
            if not connector:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Connector not found {connector_id}",
                )

            async with OneDriveClient(user.onedriveOauth) as client:
                # List all files in folder
                items = await client.list_folder_contents(
                    connector.config["folder"]["drive_id"],
                    connector.config["folder"]["id"],
                )

                for item in items:
                    if not item.get("file"):  # Skip folders
                        continue

                    # Convert to file metadata
                    file_metadata = await client.convert_to_file_metadata(item)

                    # Check if file should be processed based on settings
                    if not self._should_process_file(
                        file_metadata, connector.config["settings"]
                    ):
                        continue

                    # Process file
                    await self._process_file(connector, client, file_metadata)

                # Update sync status
                await self.crud.update_sync_status(connector_id, datetime.utcnow())

        except Exception as e:
            logger.error(f"Folder sync failed: {str(e)}")
            await self.crud.update_sync_status(connector_id, datetime.utcnow(), str(e))
            raise

    async def _process_file(
        self, connector, client: OneDriveClient, file_metadata: OneDriveFileMetadata
    ):
        """Process a single file"""
        try:
            # Download file content
            content = await client.get_file_content(
                file_metadata.drive_id, file_metadata.file_id
            )

            # Generate document ID
            doc_id = f"{connector.id}_{file_metadata.file_id}"

            # Store in vector database
            point_ids = await self.vector_store.store_document(
                collection_name=str(connector.user_id),
                doc_id=doc_id,
                content=content,
                metadata={
                    "user_id": str(connector.user_id),
                    "connector_id": str(connector.id),
                    "file_path": file_metadata.file_path,
                    "parent_doc_id": doc_id,
                    **file_metadata.dict(),
                },
            )

            # Update file metadata
            file_metadata.content = content
            file_metadata.doc_id = doc_id
            file_metadata.status = FileStatus.ACTIVE
            file_metadata.last_indexed = datetime.utcnow()
            file_metadata.vector_ids = point_ids  # Store all chunk IDs
            file_metadata.total_chunks = len(point_ids)

            await self.crud.update_file_metadata(str(connector.id), file_metadata)

        except Exception as e:
            logger.error(f"File processing failed: {str(e)}")
            file_metadata.status = FileStatus.ERROR
            file_metadata.error_message = str(e)
            await self.crud.update_file_metadata(str(connector.id), file_metadata)

    def _should_process_file(
        self, file_metadata: OneDriveFileMetadata, settings: Dict[str, Any]
    ) -> bool:
        """Check if file should be processed based on settings"""
        if settings["sync_mode"] == "all":
            return True

        if not settings.get("file_types"):
            return True

        file_extension = file_metadata.filename.split(".")[-1].lower()
        return file_extension in settings["file_types"]

    async def process_webhook(self, subscription_data: Dict[str, Any]):
        """Process OneDrive webhook notification"""
        try:
            connector_id = subscription_data["clientState"].split("_")[-1]
            connector = await self.crud.get_connector(connector_id, None)

            if not connector:
                logger.error(f"Connector not found for webhook: {connector_id}")
                return

            async with OneDriveClient(connector.config.auth) as client:
                for change in subscription_data.get("value", []):
                    await self._handle_change(connector, client, change)

        except Exception as e:
            logger.error(f"Webhook processing failed: {str(e)}")
            raise

    async def _handle_change(
        self, connector, client: OneDriveClient, change: Dict[str, Any]
    ):
        """Handle a single change notification"""
        try:
            if change["changeType"] == "deleted":
                await self._handle_deletion(connector, change)
            else:
                item = await client._make_request(
                    "GET",
                    f"/drives/{change['driveId']}/items/{change['id']}",
                )
                file_metadata = await client.convert_to_file_metadata(item)
                await self._process_file(connector, client, file_metadata)

        except Exception as e:
            logger.error(f"Change handling failed: {str(e)}")
            raise

    async def _handle_deletion(self, connector, change: Dict[str, Any]):
        """Handle file deletion"""
        try:
            # Delete from vector store
            doc_id = f"{connector.id}_{change['id']}"
            await self.vector_store.delete_document(str(connector.id), doc_id)

            # Update file metadata
            await self.crud.delete_file_metadata(str(connector.id), change["id"])

        except Exception as e:
            logger.error(f"Deletion handling failed: {str(e)}")
            raise
