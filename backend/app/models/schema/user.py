from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId


# Create custom type for ObjectId
class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):  # Added handler parameter
        if isinstance(v, ObjectId):
            return str(v)
        return v


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


class TokenPayload(BaseModel):
    sub: str
    exp: int
