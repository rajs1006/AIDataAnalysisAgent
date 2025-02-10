from app.core.logging_config import get_logger
import traceback
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from beanie import PydanticObjectId, Link
from fastapi import HTTPException, status

from app.models.database.connectors.connector import FileDocument, Connector
from app.models.database.users import User
from app.models.enums import ConnectorStatusEnum, ConnectorTypeEnum
from app.models.schema.base.connector import ConnectorUpdate, FileStatusEnum
from app.core.files.blob_storage import BlobStorage
from app.core.exceptions.connector_exceptions import FileNotFoundException
from app.models.schema.base.hierarchy import FileContentResponse

logger = get_logger(__name__)


class FileCRUD:

    @staticmethod
    async def create_file_metadata(
        connector_id: str, file_document: FileDocument
    ) -> Tuple[Connector, FileDocument]:
        """Update or add file metadata to a connector"""
        try:
            # Get the connector
            connector = await Connector.find_one(
                {"_id": PydanticObjectId(connector_id)}, fetch_links=True
            )

            if not connector:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            # Find existing file by file_path
            existing_file = None
            for file_link in connector.files:
                if file_link.doc_id == file_document.doc_id:
                    existing_file = await FileDocument.get(file_link.id)
                    break

            if existing_file:
                # Update existing file
                for field, value in file_document.dict(exclude_unset=True).items():
                    if value is not None:  # Only update non-None values
                        setattr(existing_file, field, value)
                await existing_file.save()
                file_doc = existing_file
            else:
                # Save new file document
                await file_document.save()
                # Add new file link to connector
                connector.files.append(Link(file_document, document_class=FileDocument))
                file_doc = file_document

            connector.updated_at = datetime.utcnow()
            await connector.save()

            return connector, file_doc

        except Exception as e:
            logger.error(
                f"Error updating file metadata: {str(e)}",
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update file metadata: {str(e)}",
            )

    # Helper method to remove a file
    async def remove_file(self, doc_id: str) -> None:
        """Remove a file from the connector by file path"""
        file_to_remove = None
        for file_link in self.files:
            if file_link.doc_id == doc_id:
                file_to_remove = file_link
                break

        if file_to_remove:
            self.files = [f for f in self.files if f != file_to_remove]
            # Optionally delete the FileDocument if you want to remove it completely
            file_doc = await FileDocument.get(file_to_remove.id)
            if file_doc:
                await file_doc.delete()

            self.updated_at = datetime.utcnow()
            await self.save()

    # Helper method to get a file by path
    @staticmethod
    async def get_file_by_path(doc_id: str) -> Optional[FileDocument]:
        """Get a file from the connector by file path"""
        print("=====doc_id", doc_id)
        fileDocument = await FileDocument.find_one(FileDocument.doc_id == str(doc_id))
        if fileDocument:
            return fileDocument
        return None
