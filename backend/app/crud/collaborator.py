from sqlalchemy.orm import Session
from sqlalchemy import func
import uuid
from typing import Optional, List
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, status

from app.models.database.collaborators import DocumentAccess, Collaborator
from app.models.database.users import User
from app.models.schema.collaborator import (
    DocumentAccessCreate,
    CollaboratorInviteRequest,
)
from app.core.exceptions.collaborator_exceptions import (
    MaxCollaboratorsExceededException,
    CollaboratorAlreadyInvitedException,
    CollaboratorNotFoundException,
    InvalidCollaboratorRoleException,
)
from app.models.enums import DocumentAccessEnum
from beanie import PydanticObjectId
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class CollaboratorCRUD:

    @staticmethod
    async def get_document_collaborators(user_id: str) -> List[Collaborator]:
        """
        Get all active collaborators for a user (both as inviter and invitee)

        Args:
            user_id (str): User ID to fetch collaborators for

        Returns:
            List[Collaborator]: List of active collaborators

        Raises:
            Exception: If database query fails
        """
        try:
            collaborators = await Collaborator.find(
                {
                    "$or": [{"inviter_id": str(user_id)}, {"invitee_id": str(user_id)}],
                    "status": "accepted",
                    "expires_at": {"$gt": datetime.utcnow()},
                }
            ).to_list()

            logger.info(
                f"Retrieved {len(collaborators)} active collaborators for user {user_id}"
            )
            return collaborators

        except Exception as e:
            logger.exception(f"Failed to retrieve collaborators for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve collaborators",
            )

    @staticmethod
    async def get_document_invitee(user_id: str) -> List[Collaborator]:
        """
        Get all active collaborations where user is invitee

        Args:
            user_id (str): User ID to fetch invitee collaborations for

        Returns:
            List[Collaborator]: List of active collaborations

        Raises:
            Exception: If database query fails
        """
        try:
            collaborators = await Collaborator.find(
                {
                    "invitee_id": str(user_id),
                    "status": "accepted",
                    "expires_at": {"$gt": datetime.utcnow()},
                }
            ).to_list()

            logger.info(
                f"Retrieved {len(collaborators)} active invitee collaborations for user {user_id}"
            )
            return collaborators

        except Exception as e:
            logger.exception(
                f"Failed to retrieve invitee collaborations for user {user_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve collaborations",
            )

    @staticmethod
    async def update_document_access_to_collaborator(
        collaborator_id: str,
        document_id: str,
        auth_role: DocumentAccessEnum = DocumentAccessEnum.READ,
    ) -> Collaborator:
        """
        Update or add document access for a collaborator.

        Args:
            collaborator_id (str): The ID of the collaborator
            document_id (str): The document ID to grant access to
            auth_role (DocumentAccessEnum): The access role to grant

        Returns:
            Collaborator: Updated collaborator object

        Raises:
            HTTPException: If collaborator not found or operation fails
        """
        try:
            now = datetime.utcnow()

            # Fetch collaborator by ID and status
            collaborator = await Collaborator.find_one(
                {
                    "_id": PydanticObjectId(collaborator_id),
                    "status": "accepted",
                }
            )

            if not collaborator:
                logger.warning(
                    f"Collaborator not found or not accepted. collaborator_id: {collaborator_id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Collaborator not found or not in accepted status",
                )

            # Find existing access for this document
            existing_access = next(
                (
                    access
                    for access in collaborator.document_access
                    if access.document_id == document_id
                ),
                None,
            )

            if existing_access:
                logger.info(
                    f"Updating existing access for collaborator {collaborator_id} "
                    f"to document {document_id}"
                )
                # Update existing access role
                existing_access.auth_role = auth_role
                existing_access.invited_at = now
                existing_access.expires_at = now + timedelta(days=360)
            else:
                logger.info(
                    f"Creating new access for collaborator {collaborator_id} "
                    f"to document {document_id}"
                )
                # Create and add new document access
                doc_access = DocumentAccess(
                    document_id=document_id,
                    auth_role=auth_role,
                    invited_at=now,
                    expires_at=now + timedelta(days=360),
                )
                collaborator.document_access.append(doc_access)

            # Save the changes
            await collaborator.save()
            logger.info(
                f"Successfully updated document access. collaborator_id: {collaborator_id}, "
                f"document_id: {document_id}, auth_role: {auth_role}"
            )
            return collaborator

        except HTTPException:
            raise
        except Exception as e:
            logger.exception(
                f"Failed to update document access. collaborator_id: {collaborator_id}, "
                f"document_id: {document_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update document access",
            )

    @staticmethod
    async def remove_document_access(inviter_id: str, document_id: str) -> bool:
        """
        Remove document access from specified collaborators

        Args:
            inviter_id (str): Inviter ID to remove access for
            document_id (str): The document ID to remove access from

        Returns:
            bool: True if operation was successful

        Raises:
            HTTPException: If operation fails
        """
        try:
            # Find collaborators that match the criteria
            collaborators = await Collaborator.find(
                {
                    "inviter_id": inviter_id,
                    "document_access": {"$elemMatch": {"document_id": document_id}},
                }
            ).to_list()

            if not collaborators:
                logger.info(
                    f"No collaborators found with document access. "
                    f"inviter_id: {inviter_id}, document_id: {document_id}"
                )
                return True  # Return True since there's nothing to remove

            # Update each collaborator's document access
            for collaborator in collaborators:
                # Remove the document access from the array
                collaborator.document_access = [
                    access
                    for access in collaborator.document_access
                    if access.document_id != document_id
                ]
                await collaborator.save()

            logger.info(
                f"Removed document access for {len(collaborators)} collaborators. "
                f"inviter_id: {inviter_id}, document_id: {document_id}"
            )

            return True

        except Exception as e:
            logger.exception(
                f"Failed to remove document access. inviter_id: {inviter_id}, "
                f"document_id: {document_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove document access",
            )

    # @staticmethod
    # def update_collaborator_role(
    #     db: Session, collaborator_id: str, new_role: str
    # ) -> DocumentAccess:
    #     # Validate auth role
    #     valid_roles = ["read", "comment", "update", "create"]
    #     if new_role not in valid_roles:
    #         raise InvalidCollaboratorRoleException()

    #     collaborator = (
    #         db.query(DocumentAccess)
    #         .filter(DocumentAccess.id == collaborator_id)
    #         .first()
    #     )

    #     if not collaborator:
    #         raise CollaboratorNotFoundException()

    #     collaborator.auth_role = new_role
    #     db.commit()
    #     db.refresh(collaborator)

    #     return collaborator

    # @staticmethod
    # def accept_invitation(
    #     db: Session, collaborator_id: str, user_id: str
    # ) -> DocumentAccess:
    #     collaborator = (
    #         db.query(DocumentAccess)
    #         .filter(
    #             DocumentAccess.id == collaborator_id, DocumentAccess.status == "pending"
    #         )
    #         .first()
    #     )

    #     if not collaborator:
    #         raise CollaboratorNotFoundException()

    #     # Ensure the user accepting the invitation matches the invitee
    #     if collaborator.invitee_id != user_id:
    #         raise CollaboratorNotFoundException()

    #     collaborator.status = "accepted"
    #     db.commit()
    #     db.refresh(collaborator)

    #     return collaborator
