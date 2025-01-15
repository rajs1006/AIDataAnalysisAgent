from typing import Optional
from app.models.schema.base.context import (
    ContextMetadata,
)
from PIL import Image


class ImageMetadata(ContextMetadata):
    conversation_id: str
    file_id: str
    config: Optional[dict] = ""
