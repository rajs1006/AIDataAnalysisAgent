from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, validator
from app.utils.tools import PyObjectId


class CollaboratorInviteRequest(BaseModel):
    email: EmailStr


class CollaboratorRegistrationRequest(BaseModel):
    token: str
    email: str
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)
    user_type: Literal["business", "individual"] = "individual"


class CollaboratorInviteResponse(BaseModel):
    id: PyObjectId
    inviter_id: PyObjectId
    collaborator_email: EmailStr
    status: Literal["pending", "accepted", "rejected"]
    invited_at: datetime
    expires_at: datetime


class CollaboratorRegistrationResponse(BaseModel):
    id: PyObjectId
    email: EmailStr
    full_name: Optional[str] = None
    user_type: Literal["business", "individual"]
    message: str = "Registration completed successfully"
