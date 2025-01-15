import logging
import tempfile
from pathlib import Path
import os
from datetime import datetime
from fastapi import HTTPException, status
from haystack.dataclasses import Document

from app.services.agent.rag.service import RagService
from app.crud.folder import FolderConnectorCRUD
from app.models.schema.connectors.folder import FileEvent
from app.models.schema.base.connector import FileStatus
from app.models.schema.connectors.folder import FolderCreate, FileMetadata
from app.models.database.users import User
from app.utils.tools import get_content_hash
from app.core.files.processor import DocumentProcessor

logger = logging.getLogger(__name__)


class FolderConnectorService:

    def __init__(self, crud: FolderConnectorCRUD, rag_service: RagService):
        self.rag_service = rag_service
        self.crud = crud

    async def list_connectors(self, user_id: str):
        return await self.crud.get_user_connectors(user_id)

    async def create_connector(self, connector_data: FolderCreate, current_user: User):
        try:
            # Create connector in database
            now = int(datetime.utcnow().timestamp() * 1000)
            connector = await self.crud.create_connector(connector_data, current_user)

            for file in connector_data.files:
                content = await file.read()

                # Save to temporary file for DocumentProcessor
                with tempfile.NamedTemporaryFile(
                    delete=False, suffix=Path(file.filename).suffix
                ) as temp_file:
                    temp_file.write(content)
                    temp_path = temp_file.name

                try:
                    # Process with DocumentProcessor
                    processor = DocumentProcessor()
                    result = processor.process_file(temp_path)
                    if result.error:
                        raise HTTPException(status_code=500, detail=result.error)

                    result_content = result.content

                finally:
                    # Clean up temp file
                    os.unlink(temp_path)

                # Read file content
                metadata = FileMetadata(
                    filename=file.filename,
                    file_path=file.filename,
                    content_hash=get_content_hash(content=content),
                    size=len(content),
                    mime_type=file.content_type or "application/octet-stream",
                    last_modified=now,
                    created_at=now,  # milliseconds timestamp
                    extension=Path(file.filename).suffix,
                )

                # Create watch event
                event = FileEvent(
                    connector_id=str(connector.id),
                    event_type="created",  # or whatever event type you need
                    metadata=metadata,
                    content=result_content,
                    timestamp=now,
                )
                # return await self._handle_file_update(connector, connector_data)
                await self._handle_file_update(connector, event)

        except Exception as e:
            error_message = f"Failed to create connector: {str(e)}"
            if "connector" in locals():
                await connector.delete()
            logger.exception(error_message)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_message,
            )

    async def process_watch_event(self, request, current_user):
        """Process a file watch event"""
        try:
            body = await request.json()
            event = FileEvent(**body)

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

    async def _handle_file_update(self, connector, event: FileEvent):
        """Handle file updates using Haystack components"""
        try:
            # Check file extension
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
                # Create document metadata
                doc_metadata = {
                    "user_id": str(connector.user_id),
                    "connector_id": str(connector.id),
                    "file_path": event.metadata.file_path,
                    "parent_doc_id": doc_id,
                    "file_type": event.metadata.extension,
                    "file_name": event.metadata.filename,
                    "content_hash": event.metadata.content_hash,
                    **event.metadata.dict(),
                }

                # Add document using RAG service
                await self.rag_service.add_documents(
                    documents=[
                        {
                            "content": event.content,
                            "doc_id": doc_id,
                            "file_path": event.metadata.file_path,
                            "file_type": event.metadata.extension,
                            "file_name": event.metadata.filename,
                        }
                    ],
                    user_id=str(connector.user_id),
                    connector_id=str(connector.id),
                    metadata=doc_metadata,
                )

                # Update metadata for tracking
                event.metadata.content = event.content
                event.metadata.doc_id = doc_id
                event.metadata.status = FileStatus.ACTIVE
                event.metadata.last_indexed = datetime.utcnow()

                # Update connector metadata
                await self.crud.update_file_metadata(str(connector.id), event.metadata)

                return {"status": "success", "doc_id": doc_id}

        except Exception as e:
            logger.error(f"Error processing file update: {str(e)}")
            event.metadata.status = FileStatus.ERROR
            event.metadata.error_message = str(e)
            await self.crud.update_file_metadata(str(connector.id), event.metadata)
            raise

    # async def _handle_file_update(self, connector, event: FileEvent):
    #     try:
    #         if not any(
    #             event.metadata.file_path.lower().endswith(ext)
    #             for ext in connector.supported_extensions
    #         ):
    #             return {
    #                 "status": "skipped",
    #                 "message": f"Unsupported file type: {event.metadata.extension}",
    #             }

    #         doc_id = f"{connector.id}_{event.metadata.content_hash}"
    #         if event.content:

    #             point_ids = await self.vector_store.store_document(
    #                 collection_name=str(connector.user_id),
    #                 doc_id=doc_id,
    #                 content=event.content,
    #                 metadata={
    #                     "user_id": str(connector.user_id),
    #                     "connector_id": str(connector.id),
    #                     "file_path": event.metadata.file_path,
    #                     "parent_doc_id": doc_id,
    #                     **event.metadata.dict(),
    #                 },
    #             )

    #             # Update metadata for each chunk
    #             event.metadata.content = event.content
    #             event.metadata.doc_id = doc_id
    #             event.metadata.status = FileStatus.ACTIVE
    #             event.metadata.last_indexed = datetime.utcnow()
    #             event.metadata.vector_ids = point_ids  # Store all chunk IDs
    #             event.metadata.total_chunks = len(point_ids)

    #             await self.crud.update_file_metadata(str(connector.id), event.metadata)

    #         return {"status": "success", "doc_id": doc_id}

    #     except Exception as e:
    #         logger.error(f"Error processing file update: {str(e)}")
    #         event.metadata.status = FileStatus.ERROR
    #         event.metadata.error_message = str(e)
    #         await self.crud.update_file_metadata(str(connector.id), event.metadata)
    #         raise

    async def _handle_file_deletion(self, connector, event: FileEvent):
        try:
            existing_file = next(
                (f for f in connector.files if f.file_path == event.metadata.file_path),
                None,
            )
            if existing_file and existing_file.doc_id:
                # Delete all chunks associated with document
                for chunk_id in existing_file.vector_ids:
                    await self.rag_service.delete_document(str(connector.id), chunk_id)

            await self.crud.delete_file_metadata(
                str(connector.id), event.metadata.file_path
            )
            return {"status": "success", "message": "File deleted successfully"}

        except Exception as e:
            logger.error(f"Error processing file deletion: {str(e)}")
            raise
