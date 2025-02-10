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
    ):
        self.file_crud = file_crud
        self.connector_crud = connector_crud
        self.collaborator_crud = collaborator_crud

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
                        await self.file_crud.get_file_by_path(access.document_id)
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
            fileDocument = await self.file_crud.get_file_by_path(file_id)

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
        fileDocument = await self.file_crud.get_file_by_path(file_id)

        return FileContentResponse(
            text=fileDocument.summary["summary"],
            metadata={"file_path": fileDocument.file_path},
        )
