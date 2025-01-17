from datetime import datetime
from typing import Optional, Dict, List
from beanie import Document, Indexed
from pydantic import BaseModel, Field


# Database Models
class ModelPricing(Document):
    model_name: Indexed(str, unique=True)
    prompt_token_cost: float = Field(..., ge=0)
    completion_token_cost: float = Field(..., ge=0)
    effective_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="active", pattern="^(active|inactive)$")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = None

    class Settings:
        name = "matrices"
        indexes = ["model_name", "status", [("model_name", 1), ("effective_date", -1)]]
