import tempfile
from pathlib import Path
import os
from typing import List
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
        """
        Create a connector and process its files.

        Args:
            connector_data: Data for creating the connector, including files
            current_user: Current user creating the connector

        Returns:
            dict: Contains connector_id and processed_files information

        Raises:
            HTTPException: If connector creation fails
        """
        processed_files = []
        documents = []
        connector = None

        try:
            # Create connector in database
            now = datetime.utcnow()
            connector = await self.crud.create_connector(
                Connector.from_request_data(connector_data, str(current_user.id)),
                current_user,
            )

            for file in connector_data.files:
                try:
                    # Validate file extension
                    extension = Path(file.filename).suffix.lower()
                    if extension not in connector.supported_extensions:
                        processed_files.append(
                            {
                                "filename": file.filename,
                                "error": f"Extension {extension} is not supported",
                            }
                        )
                        continue

                    # Read and process file
                    content = await file.read()
                    content_hash = get_content_hash(content=content)
                    doc_id = f"{connector.id}_{content_hash}"

                    print("=================doc_id==================")
                    print(doc_id)

                    # Create temporary file for processing
                    with tempfile.NamedTemporaryFile(
                        delete=False, suffix=extension
                    ) as temp_file:
                        temp_file.write(content)
                        temp_path = temp_file.name

                    try:
                        # Process document
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
                            processed_files.append(
                                {"filename": file.filename, "error": str(result.error)}
                            )
                            continue

                    finally:
                        # Clean up temp file
                        os.unlink(temp_path)

                    # Create metadata
                    metadata = FileMetadata(
                        filename=file.filename,
                        file_path=file.filename,
                        content=result.content,
                        content_hash=content_hash,
                        size=len(content),
                        mime_type=file.content_type or "application/octet-stream",
                        last_modified=now,
                        created_at=now,
                        extension=extension,
                        summary=result.metadata["summary"],
                        ai_metadata=result.metadata["ai_metadata"],
                        file_id=doc_id,
                        doc_id=doc_id,
                        status=FileStatusEnum.ACTIVE,
                        last_indexed=now,
                        **BlobData.from_class(result.blob_data),
                    )

                    # Store metadata
                    await self.file_crud.create_file_metadata(
                        str(connector.id),
                        FileDocument.from_embedded_data(metadata),
                    )

                    # Prepare document for vector store
                    if result.content:
                        documents.append(
                            {
                                "content": result.parsed_content,
                                "file_id": doc_id,
                                "file_path": metadata.file_path,
                                "file_type": metadata.extension,
                                "file_name": metadata.filename,
                                "file_summary": metadata.summary,
                            }
                        )

                    processed_files.append(
                        {"filename": file.filename, "status": "success"}
                    )

                except Exception as file_error:
                    logger.exception(
                        "Error processing file",
                        extra={
                            "filename": file.filename,
                            "error_details": str(file_error),
                        },
                    )
                    processed_files.append(
                        {"filename": file.filename, "error": str(file_error)}
                    )

            # Add documents to vector store if any were processed successfully
            if documents:
                await self.rag_service.add_documents(
                    documents=documents,
                    user_id=str(connector.user_id),
                    connector_id=str(connector.id),
                )

            return {
                "connector_id": str(connector.id),
                "processed_files": processed_files,
            }

        except Exception as e:
            if connector:
                await connector.delete()

            error_message = f"Failed to create connector: {str(e)}"
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

    async def _handle_file_update(
        self, connector: Connector, documents: List[Document]
    ):
        """Handle file updates using Haystack components"""
        try:
            return await self.rag_service.add_documents(
                documents=Document,
                user_id=str(connector.user_id),
                connector_id=str(connector.id),
                # metadata=event.metadata.dict(),
            )

            # return {"status": "success", "doc_id": doc_id}

        except Exception as e:
            logger.exception(
                "Error adding file to Rag",
                # extra={"file_metadata": event.metadata.dict(), "error_details": str(e)},
            )
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
