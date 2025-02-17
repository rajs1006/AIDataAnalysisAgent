from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, Literal, List
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, Field, validator
from app.utils.tools import PyObjectId
from app.models.enums import DocumentAccessEnum, InviteStatusEnum, UserTypeEnum


class DocumentAccessBase(BaseModel):
    document_id: str = Field(..., description="Unique identifier of the document")
    auth_role: DocumentAccessEnum = Field(
        ..., description="Authorization role for the collaborator"
    )


class DocumentAccessCreate(DocumentAccessBase):
    collaborator_id: str = Field(
        ..., description="ID of the user inviting the collaborator"
    )
    # collaborator_email: EmailStr = Field(
    #     ..., description="Email of the collaborator being invited"
    # )


class DocumentAccessRemove(DocumentAccessBase):
    collaborator_ids: List[str] = Field(
        ..., description="IDs of the user inviting the collaborator"
    )


class DocumentAccessResponse(BaseModel):
    document_id: str
    collaborator_id: str = Field(
        ..., description="ID of the user inviting the collaborator"
    )
    auth_role: str
    message: str = "Registration completed successfully"


class CollaboratorListResponse(BaseModel):
    collaborators: List[DocumentAccessResponse]


class CollaboratorUpdateRequest(BaseModel):
    auth_role: DocumentAccessEnum = Field(
        ..., description="New authorization role for the collaborator"
    )


class CollaboratorInviteRequest(BaseModel):
    email: EmailStr


class CollaboratorRegistrationRequest(BaseModel):
    token: str
    email: str
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)
    user_type: UserTypeEnum = UserTypeEnum.INDIVIDUAL.value


class CollaboratorResponse(BaseModel):
    id: PyObjectId
    inviter_id: PyObjectId
    collaborator_email: EmailStr
    invitee_id: PyObjectId
    status: InviteStatusEnum
    invited_at: datetime
    expires_at: datetime
    document_id: Optional[str] = None
    auth_role: Optional[str] = None


class CollaboratorRegistrationResponse(BaseModel):
    id: PyObjectId
    email: EmailStr
    full_name: Optional[str] = None
    user_type: UserTypeEnum
    message: str = "Registration completed successfully"
