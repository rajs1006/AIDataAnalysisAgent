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


class CollaboratorCRUD:

    @staticmethod
    async def get_document_collaborators(user_id: str) -> List[Collaborator]:
        return await Collaborator.find(
            {
                "$or": [{"inviter_id": str(user_id)}, {"invitee_id": str(user_id)}],
                "status": "accepted",
                "expires_at": {"$gt": datetime.utcnow()},
            }
        ).to_list()

    @staticmethod
    async def get_document_invitee(user_id: str) -> List[Collaborator]:
        return await Collaborator.find(
            {
                "invitee_id": str(user_id),
                "status": "accepted",
                "expires_at": {"$gt": datetime.utcnow()},
            }
        ).to_list()

    @staticmethod
    async def update_document_access_to_collaborator(
        collaborator_id: str,
        document_id: str,
        auth_role: DocumentAccessEnum = DocumentAccessEnum.READ,
    ) -> Collaborator:  # Changed return type to single Collaborator
        """
        Update or add document access for a collaborator.

        Args:
            collaborator_id (str): The ID of the collaborator
            document_id (str): The document ID to grant access to
            auth_role (DocumentAccessEnum): The access role to grant. Defaults to READ.

        Returns:
            Collaborator: Updated collaborator object

        Raises:
            HTTPException: If collaborator is not found or not in accepted status
        """
        now = datetime.utcnow()
        # Fetch collaborator by ID and status
        collaborator = await Collaborator.find_one(
            {
                "_id": PydanticObjectId(collaborator_id),
                "status": "accepted",
            }
        )

        if not collaborator:
            raise HTTPException(
                status_code=404,
                detail=f"Collaborator with ID {collaborator_id} not found or not in accepted status",
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
            # Update existing access role
            existing_access.auth_role = auth_role
            existing_access.invited_at = now
            existing_access.expires_at = now + timedelta(days=360)
            # existing_access.updated_at = (
            #     datetime.utcnow()
            # )  # Track when access was modified
        else:
            # Create and add new document access
            doc_access = DocumentAccess(
                document_id=document_id,
                invited_at=now,
                expires_at=now + timedelta(days=360),
            )
            collaborator.document_access.append(doc_access)

        # Save the changes
        await collaborator.save()

        return collaborator

    @staticmethod
    async def remove_document_access(collaborator_ids: List[str], document_id: str):
        """
        Remove document access from specified collaborators

        Args:
            collaborator_ids (List[str]): List of collaborator IDs to update
            document_id (str): The document ID to remove access from

        Returns:
            int: Number of collaborators updated
        """
        result = await Collaborator.update_many(
            {
                "_id": {"$in": collaborator_ids},
                "document_access": {"$elemMatch": {"document_id": document_id}},
            },
            {"$pull": {"document_access": {"document_id": document_id}}},
        )

        return result

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
