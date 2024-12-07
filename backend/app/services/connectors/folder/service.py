import io
import logging
from datetime import datetime
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse

from app.services.store.vectorizer import VectorStore
from app.crud.folder import FolderConnectorCRUD
from app.services.connectors.folder.watcher import ExecutableBuilder
from app.models.schema.connectors.folder import WatchEvent
from app.models.schema.base.connector import FileStatus
from app.core.security.auth import create_api_key

logger = logging.getLogger(__name__)


class FolderConnectorService:

    def __init__(self, crud: FolderConnectorCRUD, vector_store: VectorStore):
        self.vector_store = vector_store
        self.crud = crud

    async def list_connectors(self, user_id: str):
        return await self.crud.get_user_connectors(user_id)

    async def create_connector(self, connector_data, current_user):
        try:
            # Create connector in database
            connector = await self.crud.create_connector(connector_data, current_user)

            # API KEY to authenticate watcher
            api_key = create_api_key(str(current_user.id))
            # Build executable
            executable_builder = ExecutableBuilder(connector, api_key)
            executable_bytes, executable_name = await executable_builder.build()

            return StreamingResponse(
                io.BytesIO(executable_bytes),
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f'attachment; filename="{executable_name}"'
                },
            )
        except Exception as e:
            if "connector" in locals():
                await connector.delete()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create connector: {str(e)}",
            )

    async def process_watch_event(self, request, current_user):
        """Process a file watch event"""
        try:
            body = await request.json()
            event = WatchEvent(**body)

            # Validate connector
            connector = await self.crud.validate_connector(
                event.connector_id, str(current_user.id)
            )

            # Handle event based on type
            if event.event_type == "deleted":
                return await self._handle_file_deletion(connector, event)
            else:  # created or modified
                return await self._handle_file_update(connector, event)

        except Exception as e:
            logger.exception("Error processing watch event")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
            )

    async def get_connector_status(self, connector_id: str, user_id: str):
        """Get connector status"""
        connector = await self.crud.get_connector(connector_id, user_id)
        return (
            {"active": connector.status == "active"} if connector else {"active": False}
        )

    async def update_connector_status(
        self, connector_id: str, new_status: str, user_id: str
    ):
        """Update connector status"""
        connector = await self.crud.get_connector(connector_id, user_id)
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
            )

        await self.crud.update_connector_status(connector_id, new_status)
        return {"status": new_status}

    async def _handle_file_update(self, connector, event: WatchEvent):
        try:
            if not any(
                event.metadata.file_path.lower().endswith(ext)
                for ext in connector.supported_extensions
            ):
                return {
                    "status": "skipped",
                    "message": f"Unsupported file type: {event.metadata.extension}",
                }

            doc_id = f"{connector.id}_{event.metadata.content_hash}"
            if event.content:
                point_ids = await self.vector_store.store_document(
                    collection_name=str(connector.user_id),
                    doc_id=doc_id,
                    content=event.content,
                    metadata={
                        "user_id": str(connector.user_id),
                        "connector_id": str(connector.id),
                        "file_path": event.metadata.file_path,
                        "parent_doc_id": doc_id,
                        **event.metadata.dict(),
                    },
                )

                # Update metadata for each chunk
                event.metadata.content = event.content
                event.metadata.doc_id = doc_id
                event.metadata.status = FileStatus.ACTIVE
                event.metadata.last_indexed = datetime.utcnow()
                event.metadata.vector_ids = point_ids  # Store all chunk IDs
                event.metadata.total_chunks = len(point_ids)

                await self.crud.update_file_metadata(str(connector.id), event.metadata)

            return {"status": "success", "doc_id": doc_id}

        except Exception as e:
            logger.error(f"Error processing file update: {str(e)}")
            event.metadata.status = FileStatus.ERROR
            event.metadata.error_message = str(e)
            await self.crud.update_file_metadata(str(connector.id), event.metadata)
            raise

    async def _handle_file_deletion(self, connector, event: WatchEvent):
        try:
            existing_file = next(
                (f for f in connector.files if f.file_path == event.metadata.file_path),
                None,
            )
            if existing_file and existing_file.doc_id:
                # Delete all chunks associated with document
                for chunk_id in existing_file.vector_ids:
                    await self.vector_store.delete_document(str(connector.id), chunk_id)

            await self.crud.delete_file_metadata(
                str(connector.id), event.metadata.file_path
            )
            return {"status": "success", "message": "File deleted successfully"}

        except Exception as e:
            logger.error(f"Error processing file deletion: {str(e)}")
            raise
