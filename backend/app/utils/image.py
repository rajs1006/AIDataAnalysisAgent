from pydantic import BaseModel
import io
import base64
import imghdr
from PIL import Image, UnidentifiedImageError
import logging
from typing import Optional, Union

logger = logging.getLogger(__name__)


class ImageValidator:

    def validate_and_process_image(self, image_data: dict) -> Optional[Image.Image]:
        """Process image data from the frontend"""
        try:
            # Extract base64 content
            content = image_data.get("content")
            mime_type = image_data.get("mime_type")

            if not content or not mime_type:
                logger.error("Missing content or mime_type in image data")
                return None

            # Decode base64 content
            try:
                image_bytes = base64.b64decode(content)
            except Exception as e:
                logger.error(f"Failed to decode base64: {str(e)}")
                return None

            # Create PIL Image
            try:
                img = Image.open(io.BytesIO(image_bytes))

                # Verify image integrity
                img.verify()

                # Reopen for processing
                img = Image.open(io.BytesIO(image_bytes))

                # Convert if needed
                if img.mode in ("RGBA", "LA", "P"):
                    img = img.convert("RGB")

                return img
            except Exception as e:
                logger.error(f"Failed to create PIL Image: {str(e)}")
                return None

        except Exception as e:
            logger.error(f"Image validation failed: {str(e)}", exc_info=True)
            return None
