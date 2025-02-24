from datetime import datetime, timedelta
from typing import Literal, List, Optional
from beanie import Document, Indexed
from pydantic import Field
from app.models.enums import DocumentAccessEnum


class DocumentAccess(Document):
    document_id: str
    auth_role: DocumentAccessEnum = DocumentAccessEnum.READ
    invited_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(
        default_factory=lambda: datetime.utcnow() + timedelta(days=360)
    )



class Collaborator(Document):
    inviter_id: str
    invitee_id: str
    status: Literal["pending", "accepted", "rejected"] = "pending"
    invited_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(
        default_factory=lambda: datetime.utcnow() + timedelta(days=360)
    )
    invitation_token: str
    document_access: Optional[List[DocumentAccess]] = []

    class Settings:
        name = "collaborator"
        indexes = ["inviter_id", "invitee_id", "invitation_token"]

    @classmethod
    def is_invite_expired(cls, invite):
        return datetime.utcnow() > invite.expires_at

    @classmethod
    async def get_collaborators_by_document(cls, document_id: str):
        """
        Fetch active collaborators that have access to a specific document.

        Args:
            document_id (str): The ID of the document to filter by

        Returns:
            List[Collaborator]: List of active collaborators with access to the document
        """
        return await cls.find(
            {
                "status": "accepted",
                "expires_at": {"$gt": datetime.utcnow()},
                "document_access": {"$elemMatch": {"document_id": document_id}},
            }
        ).to_list()

    @classmethod
    async def get_collaborators_except_document(cls, document_id: str):
        """
        Fetch active collaborators that don't have access to a specific document.

        Args:
            document_id (str): The ID of the document to exclude

        Returns:
            List[Collaborator]: List of active collaborators without access to the document
        """
        return await cls.find(
            {
                "status": "accepted",
                "expires_at": {"$gt": datetime.utcnow()},
                "$or": [
                    {"document_access": None},
                    {
                        "document_access": {
                            "$not": {"$elemMatch": {"document_id": document_id}}
                        }
                    },
                ],
            }
        ).to_list()
