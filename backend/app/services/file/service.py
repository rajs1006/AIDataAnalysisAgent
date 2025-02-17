from datetime import datetime, timedelta
from typing import Optional, List

from app.core.config.config import settings
from app.core.security.auth import get_password_hash
from app.models.database.users import User
from app.models.database.collaborators import Collaborator
from app.models.schema.collaborator import (
    CollaboratorRegistrationRequest,
    CollaboratorInviteRequest,
    CollaboratorResponse,
    DocumentAccessCreate,
    DocumentAccessRemove,
    DocumentAccessResponse,
    CollaboratorListResponse,
    CollaboratorUpdateRequest,
)
from app.models.schema.files import DeleteDocumentRequest
from app.core.logging_config import get_logger
from fastapi import HTTPException, status
from app.crud.connector import ConnectorCRUD
from app.crud.collaborator import CollaboratorCRUD
from app.crud.file import FileCRUD
from app.models.schema.base.connector import ConnectorUpdate, ConnectorFrontend
from app.services.agent.rag.service import RagService
from app.models.schema.base.hierarchy import FileHierarchyResponse
from app.core.files.hierarchy import FileHierarchyBuilder
from app.core.files.blob_storage import BlobStorage
from app.services.email.smtp import EmailService
from app.core.security.auth import generate_verification_token, verify_token
from app.crud.user import UserCRUD
from app.crud.file import FileCRUD
from app.crud.connector import ConnectorCRUD
from app.core.exceptions.collaborator_exceptions import (
    DuplicateCollaboratorInviteError,
    MaxCollaboratorInvitesError,
)
from app.core.exceptions.connector_exceptions import FileNotFoundException
from app.crud.collaborator import CollaboratorCRUD
from app.core.exceptions.auth_exceptions import AccountDisabledError, EmailDeliveryError
from app.models.enums import DocumentAccessEnum, InviteStatusEnum
from app.services.agent.rag.service import RagService
from app.core.logging_config import get_logger
from app.models.schema.base.hierarchy import FileContentResponse


logger = get_logger(__name__)


class FileService:

    def __init__(
        self,
        file_crud: FileCRUD,
        connector_crud: ConnectorCRUD,
        collaborator_crud: CollaboratorCRUD,
        rag_service: RagService
    ):
        self.file_crud = file_crud
        self.connector_crud = connector_crud
        self.collaborator_crud = collaborator_crud
        self.rag_service = rag_service

    async def get_connector_file_hierarchy(self, user_id: str) -> FileHierarchyResponse:
        """
        Retrieve file hierarchy for a specific connector.

        Args:
            connector_id (str): ID of the connector
            user_id (str): ID of the user

        Returns:
            FileHierarchyResponse: Hierarchical file structure
        """
        try:
            connectors = await self.connector_crud.get_user_active_connectors(
                user_id=user_id
            )
            collaborators = await self.collaborator_crud.get_document_invitee(
                user_id=user_id
            )

            shared_files = []
            for collaborator in collaborators:
                for access in collaborator.document_access:
                    shared_files.append(
                        await self.file_crud.get_file_by_doc_id(access.document_id)
                    )

            return FileHierarchyBuilder.build_connector_hierarchy(
                connectors, shared_files
            )

        except Exception as e:
            logger.error(
                f"Error retrieving file hierarchy: {str(e)}",
            )
            raise

    async def get_file_blob(self, file_id: str, user_id: str):
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
            fileDocument = await self.file_crud.get_file_by_doc_id(file_id)

            if not fileDocument:
                raise FileNotFoundException(file_id)

            # Retrieve blob from storage using GCS path if available
            if fileDocument.blob_gcs_path:
                # Create a temporary BlobData object with GCS information
                return await BlobStorage.retrieve_blob(fileDocument.blob_gcs_path)

            raise FileNotFoundException(file_id)

        except Exception as e:
            logger.error(
                f"Error retrieving file blob: {str(e)}",
            )
            raise

    async def get_file_content(self, file_id: str, user_id: str):
        """
        Retrieve file blob by file ID.

        Args:
            file_id (str): ID of the file
            user_id (str): ID of the user

        Returns:
            BlobData: File blob data

        Raises:
            FileNotFoundException: If file not found
        """
        fileDocument = await self.file_crud.get_file_by_doc_id(file_id)

        return FileContentResponse(
            text=fileDocument.summary,
            metadata={"file_path": fileDocument.file_path},
        )

    async def delete_files(self, documents: List[DeleteDocumentRequest], user_id: str):
        """
        Delete multiple documents and their associated resources

        Args:
            documents (List[DeleteDocumentRequest]): List of documents to delete
            user_id (str): ID of the user requesting deletion

        Returns:
            List[dict]: List of deletion results with success/error status for each document

        Raises:
            HTTPException: If no documents were processed or other errors occurred
        """
        cleanup_results = []

        try:
            for document in documents:
                try:
                    connector = await self.connector_crud.get_connector(
                        user_id=user_id, connector_id=document.connector_id
                    )

                    if not connector:
                        logger.error(
                            f"Connector not found during delete_files. user_id: {user_id}, "
                            f"connector_id: {document.connector_id}"
                        )
                        cleanup_results.append(
                            {
                                "connector_id": str(document.connector_id),
                                "document_id": str(document.document_id),
                                "error": "Connector not found",
                            }
                        )
                        continue

                    # Find matching file in connector
                    matching_files = [
                        file
                        for file in connector.files
                        if file.doc_id == document.document_id
                    ]

                    if not matching_files:
                        logger.warning(
                            f"Document not found in connector. user_id: {user_id}, "
                            f"connector_id: {document.connector_id}, "
                            f"document_id: {document.document_id}"
                        )
                        cleanup_results.append(
                            {
                                "connector_id": str(document.connector_id),
                                "document_id": str(document.document_id),
                                "error": "Document not found in connector",
                            }
                        )
                        continue

                    # Delete each matching file
                    for file in matching_files:
                        result = await self.delete_file(
                            connector_id=document.connector_id,
                            user_id=user_id,
                            doc_id=str(file.doc_id),
                        )
                        cleanup_results.append(result)

                except Exception as e:
                    logger.error(
                        f"Error processing document deletion. user_id: {user_id}, "
                        f"connector_id: {document.connector_id}, "
                        f"document_id: {document.document_id}, error: {str(e)}"
                    )
                    cleanup_results.append(
                        {
                            "connector_id": str(document.connector_id),
                            "document_id": str(document.document_id),
                            "error": f"Failed to process deletion: {str(e)}",
                        }
                    )

            if not cleanup_results:
                logger.error(
                    f"No documents were processed for deletion. user_id: {user_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No documents were found to process",
                )

            return cleanup_results

        except Exception as e:
            logger.error(
                f"Fatal error in delete_files. user_id: {user_id}, error: {str(e)}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process document deletions: {str(e)}",
            )

    async def delete_file(self, connector_id: str, doc_id: str, user_id: str):
        """
        Delete a single file and its associated resources

        Args:
            connector_id (str): ID of the connector
            doc_id (str): ID of the document to delete
            user_id (str): ID of the user requesting deletion

        Returns:
            dict: Deletion result with success/error status
        """
        try:
            # Remove the file
            file_deleted = await self.file_crud.remove_file(doc_id)
            if not file_deleted:
                raise ValueError(f"Failed to delete file {doc_id}")

            # Remove file reference from connector
            ref_removed = (
                await self.connector_crud.remove_file_reference_from_connector(
                    connector_id=connector_id, doc_id=doc_id
                )
            )
            if not ref_removed:
                logger.warning(
                    f"File reference not found in connector. user_id: {user_id}, "
                    f"connector_id: {connector_id}, doc_id: {doc_id}"
                )

            # Remove document access for collaborators
            access_removed = await self.collaborator_crud.remove_document_access(
                inviter_id=user_id, document_id=doc_id
            )
            if not access_removed:
                logger.warning(
                    f"No document access records found to remove. user_id: {user_id}, "
                    f"doc_id: {doc_id}"
                )

            # Delete documents from RAG service
            await self.rag_service.delete_documents(
                user_id=user_id, connector_id=connector_id, doc_id=doc_id
            )

            logger.info(
                f"Successfully deleted file and associated resources. user_id: {user_id}, "
                f"connector_id: {connector_id}, doc_id: {doc_id}"
            )

            return {
                "connector_id": str(connector_id),
                "document_id": str(doc_id),
                "error": None,
            }

        except Exception as e:
            logger.error(
                f"Error deleting file. user_id: {user_id}, connector_id: {connector_id}, "
                f"doc_id: {doc_id}, error: {str(e)}"
            )
            return {
                "connector_id": str(connector_id),
                "document_id": str(doc_id),
                "error": str(e),
            }
