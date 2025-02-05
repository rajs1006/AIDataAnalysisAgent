from datetime import datetime, timedelta
from typing import Literal
from app.models.database.users import User
from beanie import Document, Indexed, Link
from pydantic import EmailStr, Field
from app.utils.tools import PyObjectId


class CollaboratorInvite(Document):
    inviter_id: str  # References User
    invitee_id: str  # References invited User
    status: Literal["pending", "accepted", "rejected"] = "pending"
    invited_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(
        default_factory=lambda: datetime.utcnow() + timedelta(hours=48)
    )
    invitation_token: str

    class Settings:
        name = "collaborator"
        indexes = ["inviter_id", "invitee_id", "invitation_token"]

    @classmethod
    def is_invite_expired(cls, invite):
        return datetime.utcnow() > invite.expires_at
