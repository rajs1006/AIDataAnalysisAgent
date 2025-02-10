from app.core.logging_config import get_logger
from datetime import datetime
from beanie import PydanticObjectId
from fastapi import HTTPException, status
from typing import Optional, Tuple
from app.models.database.context.image import ImageContext
from app.models.schema.context.image import ImageMetadata
from app.models.database.users import User
from app.models.schema.base.connector import ConnectorTypeEnum
from app.models.schema.base.context import ContextStatus


logger = get_logger(__name__)


class ImageAgentCRUD:

    @staticmethod
    async def context_files(user_id: str, conversation_id: str) -> ImageContext:
        """Get context files for a specific conversation"""
        context = await ImageContext.find_one(
            {
                "user_id": str(user_id),
                "status": ContextStatus.ACTIVE,
                "enabled": True,
            }
        )

        if context:
            # Filter files to only include those matching the conversation_id
            context.files = [
                file
                for file in context.files
                if file.conversation_id == conversation_id
            ]

        return context

    @staticmethod
    async def contexts(user_id: str) -> ImageContext:
        """Create a new folder connector"""

        context = await ImageContext.find_one(
            {
                "user_id": str(user_id),
                "status": ContextStatus.ACTIVE,
                "enabled": True,
            }
        )
        if not context:
            context = ImageContext(
                name="image",
                # description=connector_data.description,
                user_id=str(user_id),
                enabled=True,
                files=[],
                status=ContextStatus.ACTIVE,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            await context.insert()

        return context

    @staticmethod
    async def log_error(connector_id: str, error_message: str) -> None:
        """Log an error for a connector"""
        try:
            connector = await ImageContext.get(PydanticObjectId(connector_id))
            if connector:
                connector.error_message = error_message
                connector.status = "error"
                connector.updated_at = datetime.utcnow()
                await connector.save()
        except Exception as e:
            logger.error(
                "Failed to log error for connector {connector_id}: {str(e)}",
            )

    @staticmethod
    async def update_context_metadata(
        connector_id: str, image_metadata: ImageMetadata
    ) -> Tuple[ImageContext, ImageMetadata]:
        """Update or add file metadata to a connector"""
        try:
            # Get the connector
            connector = await ImageContext.get(PydanticObjectId(connector_id))
            if not connector:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            # Add new file metadata
            connector.files.append(image_metadata)
            connector.updated_at = datetime.utcnow()

            # Save the updated connector
            await connector.save()

            return connector, image_metadata

        except Exception as e:
            logger.error(
                "Error updating image metadata: {str(e)}",
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update image metadata: {str(e)}",
            )
