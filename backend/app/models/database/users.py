from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import EmailStr
from app.models.schema.connectors.onedrive import OneDriveAuth


class User(Document):
    email: Indexed(EmailStr, unique=True)
    hashed_password: str
    full_name: Optional[str] = None
    disabled: bool = False
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
    onedriveOauth: Optional[OneDriveAuth] = None

    class Settings:
        name = "auth"
        use_state_management = True

    class Config:
        schema_extra = {
            "example": {"email": "user@example.com", "full_name": "John Doe"}
        }
        validate_assignment = True
