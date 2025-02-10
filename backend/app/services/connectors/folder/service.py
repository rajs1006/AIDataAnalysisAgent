import tempfile
from pathlib import Path
import os
from datetime import datetime
from app.models.database.connectors.connector import Connector, FileDocument
from app.models.enums import ConnectorTypeEnum, ConnectorStatusEnum
from fastapi import HTTPException, status
from haystack.dataclasses import Document

from app.services.agent.rag.service import RagService
from app.crud.folder import FolderConnectorCRUD
from app.crud.connector import ConnectorCRUD
from app.crud.file import FileCRUD
from app.models.schema.connectors.folder import FileEvent
from app.models.schema.base.connector import FileStatusEnum
from app.models.schema.connectors.folder import FolderCreate, FileMetadata
from app.models.database.users import User
from app.utils.tools import get_content_hash
from app.core.files.processor import DocumentProcessor
from app.core.logging_config import get_logger
from app.models.schema.base.hierarchy import BlobData

logger = get_logger(__name__)


class FolderConnectorService:

    def __init__(
        self, crud: ConnectorCRUD, file_crud: FileCRUD, rag_service: RagService
    ):
        self.rag_service = rag_service
        self.crud = crud
        self.file_crud = file_crud

    async def create_connector(self, connector_data: FolderCreate, current_user: User):
        processed_files = []
        try:
            # Create connector in database
            now = datetime.utcnow()
            connector = await self.crud.create_connector(
                Connector.from_request_data(connector_data, str(current_user.id)),
                current_user,
            )

            for file in connector_data.files:
                try:
                    extension = Path(file.filename).suffix
                    content = await file.read()

                    # Save to temporary file for DocumentProcessor
                    with tempfile.NamedTemporaryFile(
                        delete=False, suffix=extension
                    ) as temp_file:
                        temp_file.write(content)
                        temp_path = temp_file.name

                    try:
                        # Process with DocumentProcessor
                        processor = DocumentProcessor()
                        result = await processor.process_file(
                            temp_path, extension=extension
                        )
                        if result.error:
                            logger.error(
                                "Error processing file",
                                extra={
                                    "filename": file.filename,
                                    "error_details": result.error,
                                },
                            )
                            continue

                        result_content = result.content
                        result_blob = BlobData.from_class(result.blob_data)

                    finally:
                        # Clean up temp file
                        os.unlink(temp_path)

                    # Read file content
                    metadata = FileMetadata(
                        filename=file.filename,
                        file_path=file.filename,
                        content=result_content,
                        content_hash=get_content_hash(content=content),
                        size=len(content),
                        mime_type=file.content_type or "application/octet-stream",
                        last_modified=now,
                        created_at=now,  # milliseconds timestamp
                        extension=extension,
                        summary=result.metadata["summary"],
                        ai_metadata=result.metadata["ai_metadata"],
                        **result_blob,
                    )

                    # Create watch event
                    event = FileEvent(
                        connector_id=str(connector.id),
                        event_type="created",
                        metadata=metadata,
                        content=result_content,
                        timestamp=now,
                    )

                    # Process file and store result
                    file_result = await self._handle_file_update(connector, event)
                    processed_files.append(
                        {"filename": file.filename, "result": file_result}
                    )

                except Exception as file_error:
                    logger.exception(
                        "Error processing file",
                        filename=file.filename,
                        error_details=file_error,
                    )
                    processed_files.append(
                        {"filename": file.filename, "error": str(file_error)}
                    )

            # Return connector with processed files information
            return {
                "connector_id": str(connector.id),
                "processed_files": processed_files,
            }

        except Exception as e:
            error_message = f"Failed to create connector: {str(e)}"
            if "connector" in locals():
                await connector.delete()
            logger.exception(
                "Connector creation failed",
                extra={
                    "error_details": error_message,
                    "processed_files_count": len(processed_files),
                },
            )
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
            event.metadata.file_id = doc_id
            if event.content:

                # Add document using RAG service
                await self.rag_service.add_documents(
                    documents=[
                        {
                            "content": event.content,
                            "file_id": doc_id,
                            "file_path": event.metadata.file_path,
                            "file_type": event.metadata.extension,
                            "file_name": event.metadata.filename,
                        }
                    ],
                    user_id=str(connector.user_id),
                    connector_id=str(connector.id),
                    # metadata=event.metadata.dict(),
                )

                # Update metadata for tracking
                event.metadata.doc_id = doc_id
                event.metadata.status = FileStatusEnum.ACTIVE
                event.metadata.last_indexed = datetime.utcnow()

                # Update connector metadata
                await self.file_crud.create_file_metadata(
                    str(connector.id), FileDocument.from_embedded_data(event.metadata)
                )

                return {"status": "success", "doc_id": doc_id}

        except Exception as e:
            logger.exception(
                "Error processing file update",
                extra={"file_metadata": event.metadata.dict(), "error_details": str(e)},
            )
            event.metadata.status = FileStatusEnum.ERROR
            event.metadata.error_message = str(e)
            await self.file_crud.create_file_metadata(str(connector.id), event.metadata)
            raise

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
            logger.exception(
                "Error processing file deletion",
                extra={"file_path": event.metadata.file_path, "error_details": str(e)},
            )
            raise
