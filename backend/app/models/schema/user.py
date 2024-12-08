from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.utils.tools import PyObjectId
from .connectors.onedrive import OneDriveAuth


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    disabled: Optional[bool] = False


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)


class UserResponse(UserBase):
    id: PyObjectId
    created_at: datetime
    updated_at: datetime


class RegistrationResponse(BaseModel):
    message: str
    user: UserResponse


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenValidationResponse(BaseModel):
    access_token: PyObjectId
    valid: bool
    expiry_time: datetime
