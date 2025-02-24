from datetime import datetime, timedelta
from typing import Optional, List, Literal
from beanie import Document, Indexed
from pydantic import EmailStr
from app.models.schema.connectors.onedrive import OneDriveAuth


class User(Document):
    email: Indexed(EmailStr, unique=True)
    hashed_password: Optional[str] = None
    full_name: Optional[str] = None
    user_type: Literal["business", "individual", "admin"] = "individual"
    disabled: bool = False
    is_email_verified: bool = False
    is_collaborator: bool = False  # New field to track collaborator status
    
    # Existing fields remain the same
    verification_token: Optional[str] = None
    verification_token_expires_at: Optional[datetime] = None
    verification_token_used: bool = False
    verification_link: Optional[str] = None
    
    reset_password_token: Optional[str] = None
    reset_password_token_expires_at: Optional[datetime] = None
    reset_password_token_used: bool = False
    reset_password_link: Optional[str] = None
    
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
    onedriveOauth: Optional[OneDriveAuth] = None
    api_keys: Optional[List[str]] = None

    class Settings:
        name = "auth"
        use_state_management = True

    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com", 
                "full_name": "John Doe", 
                "user_type": "business",
                "is_collaborator": False
            }
        }
        validate_assignment = True

    # Existing methods remain the same
    def generate_verification_token(self, purpose: Literal["registration", "reset-password"], web_url: str):
        """
        Generate a verification token for the user
        
        :param purpose: Purpose of the token
        :param web_url: Base web URL for verification link
        """
        from app.core.security.auth import generate_verification_token
        
        # Generate token
        token = generate_verification_token(purpose)
        
        # Set token details based on purpose
        if purpose == "registration":
            self.verification_token = token
            self.verification_token_expires_at = datetime.utcnow() + timedelta(hours=24)
            self.verification_token_used = False
            self.verification_link = f"{web_url}/auth/verify?type=registration&token={token}"
        else:
            self.reset_password_token = token
            self.reset_password_token_expires_at = datetime.utcnow() + timedelta(hours=24)
            self.reset_password_token_used = False
            self.reset_password_link = f"{web_url}/auth/verify?type=reset-password&token={token}"
        
        return token
