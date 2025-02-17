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
        """
        Update or add file metadata to a connector

        Args:
            connector_id (str): ID of the connector
            file_document (FileDocument): File document to create/update

        Returns:
            Tuple[Connector, FileDocument]: Updated connector and file document

        Raises:
            HTTPException: If connector not found or operation fails
        """
        try:
            # Get the connector
            connector = await Connector.find_one(
                {"_id": PydanticObjectId(connector_id)}, fetch_links=True
            )

            if not connector:
                logger.error(
                    f"Connector not found during file metadata creation. "
                    f"connector_id: {connector_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            # Find existing file by file_path
            existing_file = None
            for file_link in connector.files:
                if file_link.doc_id == file_document.doc_id:
                    try:
                        existing_file = await FileDocument.get(file_link.id)
                        break
                    except Exception as e:
                        logger.warning(
                            f"Failed to fetch existing file. connector_id: {connector_id}, "
                            f"file_id: {file_link.id}, error: {str(e)}"
                        )
                        continue

            try:
                if existing_file:
                    logger.info(
                        f"Updating existing file metadata. connector_id: {connector_id}, "
                        f"file_id: {existing_file.id}, doc_id: {file_document.doc_id}"
                    )
                    # Update existing file
                    updates = file_document.dict(exclude_unset=True)
                    update_count = 0
                    for field, value in updates.items():
                        if value is not None:
                            setattr(existing_file, field, value)
                            update_count += 1

                    await existing_file.save()
                    file_doc = existing_file
                    logger.info(
                        f"Updated {update_count} fields in existing file. "
                        f"connector_id: {connector_id}, file_id: {existing_file.id}"
                    )
                else:
                    logger.info(
                        f"Creating new file metadata. connector_id: {connector_id}, "
                        f"doc_id: {file_document.doc_id}"
                    )
                    # Save new file document
                    await file_document.save()
                    # Add new file link to connector
                    connector.files.append(
                        Link(file_document, document_class=FileDocument)
                    )
                    file_doc = file_document

                connector.updated_at = datetime.utcnow()
                await connector.save()

                return connector, file_doc

            except Exception as e:
                logger.exception(
                    f"Failed to save file metadata. connector_id: {connector_id}, "
                    f"doc_id: {file_document.doc_id}, error: {str(e)}\n"
                    f"Traceback: {traceback.format_exc()}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to save file metadata: {str(e)}",
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.exception(
                f"Unexpected error in create_file_metadata. connector_id: {connector_id}, "
                f"error: {str(e)}\n"
                f"Traceback: {traceback.format_exc()}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process file metadata: {str(e)}",
            )

    @staticmethod
    async def get_file_by_doc_id(doc_id: str) -> Optional[FileDocument]:
        """
        Get a file from the connector by doc_id

        Args:
            doc_id (str): Document ID of the file to retrieve

        Returns:
            Optional[FileDocument]: Found file document or None

        Raises:
            HTTPException: If database operation fails
        """
        try:
            fileDocument = await FileDocument.find_one(
                FileDocument.doc_id == str(doc_id)
            )
            if fileDocument:
                logger.debug(f"File found. doc_id: {doc_id}")
                return fileDocument

            logger.info(f"File not found. doc_id: {doc_id}")
            return None

        except Exception as e:
            logger.exception(
                f"Error retrieving file. doc_id: {doc_id}, "
                f"error: {str(e)}\n"
                f"Traceback: {traceback.format_exc()}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve file: {str(e)}",
            )

    async def remove_file(self, doc_id: str) -> bool:
        """
        Remove a file from the connector by doc_id

        Args:
            doc_id (str): Document ID of the file to remove

        Returns:
            bool: True if file was removed successfully, False otherwise
        """
        try:
            file_to_remove = await self.get_file_by_doc_id(doc_id)
            if not file_to_remove:
                logger.warning(f"File not found for removal. doc_id: {doc_id}")
                return False

            try:
                # Delete the FileDocument
                file_doc = await FileDocument.get(file_to_remove.id)
                if file_doc:
                    await file_doc.delete()
                    logger.info(
                        f"Successfully deleted file document. doc_id: {doc_id}, "
                        f"file_id: {file_to_remove.id}"
                    )
                else:
                    logger.warning(
                        f"FileDocument not found for deletion. doc_id: {doc_id}, "
                        f"file_id: {file_to_remove.id}"
                    )

                return True

            except Exception as e:
                logger.exception(
                    f"Error deleting file document. doc_id: {doc_id}, "
                    f"error: {str(e)}\n"
                    f"Traceback: {traceback.format_exc()}"
                )
                return False

        except Exception as e:
            logger.exception(
                f"Unexpected error in remove_file. doc_id: {doc_id}, "
                f"error: {str(e)}\n"
                f"Traceback: {traceback.format_exc()}"
            )
            return False
