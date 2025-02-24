from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field, validator
from app.utils.tools import PyObjectId
from .connectors.onedrive import OneDriveAuth


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    user_type: Literal["business", "individual", "admin"] = "individual"
    disabled: Optional[bool] = False


class UserRegistrationRequest(BaseModel):
    """
    Request payload for user registration
    """
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    userType: Literal["business", "individual", "admin"] = "individual"


class UserRegistrationResponse(BaseModel):
    """
    Response for successful registration
    """
    code: str = "REGISTRATION_SUCCESSFUL"
    message: str = "Registration link sent"


class UserVerificationRequest(BaseModel):
    """
    Request payload for email verification or password reset
    """
    email: str
    token: str
    password: str = Field(..., min_length=8)
    confirmPassword: str
    type: Literal["registration", "reset-password"]

    @validator('confirmPassword')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class UserVerificationResponse(BaseModel):
    """
    Response for successful email verification
    """
    id: PyObjectId
    email: EmailStr
    isEmailVerified: bool = True
    message: str = "Verification successful"


class ForgotPasswordRequest(BaseModel):
    """
    Request payload for forgot password
    """
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    """
    Response for forgot password request
    """
    message: str = "Password reset link sent"


class UserLoginRequest(BaseModel):
    """
    Request payload for user login
    """
    email: EmailStr
    password: str


class UserLoginResponse(BaseModel):
    """
    Response for successful login
    """
    accessToken: str
    refreshToken: str
    user: dict


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)


class UserResponse(UserBase):
    id: PyObjectId
    is_email_verified: bool = False
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenValidationResponse(BaseModel):
    access_token: PyObjectId
    valid: bool
    expiry_time: datetime
