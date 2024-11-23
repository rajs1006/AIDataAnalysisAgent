from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import EmailStr

class User(Document):
    email: Indexed(EmailStr, unique=True)
    hashed_password: str
    full_name: Optional[str] = None
    disabled: bool = False
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    class Settings:
        name = "users"
        
    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "full_name": "John Doe"
            }
        }