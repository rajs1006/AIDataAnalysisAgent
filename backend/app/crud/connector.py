import logging
import traceback
from app.models.database.connectors.connector import Connectors
from beanie import PydanticObjectId
from fastapi import HTTPException, status
from typing import Optional
from datetime import datetime
from app.models.schema.base.connector import ConnectorUpdate

logger = logging.getLogger(__name__)


class ConnectorCRUD:
    @staticmethod
    async def get_user_connectors(user_id: str):
        """Get all active connectors for a user"""
        try:
            connectors = await Connectors.find(
                {"user_id": str(user_id), "enabled": True}
            ).to_list()

            return connectors
        except Exception as e:
            traceback.print_exception(type(e), e, e.__traceback__)
            raise

    @staticmethod
    async def get_connector(connector_id: str, user_id: str):
        """Get all active connectors for a user"""
        try:
            return await Connectors.find_one(
                {
                    "_id": PydanticObjectId(connector_id),
                    "user_id": str(user_id),
                    "enabled": True,
                }
            )
        except Exception as e:
            traceback.print_exception(type(e), e, e.__traceback__)
            raise

    @staticmethod
    async def update_connector_status(
        user_id: str, connector: ConnectorUpdate
    ) -> Connectors:
        """Update a connector's status"""
        try:
            existing_connector = await Connectors.find_one(
                {
                    "_id": PydanticObjectId(connector.id),
                    "user_id": str(user_id),
                    "enabled": True,
                }
            )

            if not existing_connector:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            # Update the fields you want to change
            connector_updated = connector.dict(exclude_none=True)
            for key, value in connector_updated.items():
                setattr(existing_connector, key, value)

            # Save the updated connector
            # Use pre_save hook and save
            await existing_connector.pre_save()
            await existing_connector.save()

            return connector_updated
        except Exception as e:
            traceback.print_exception(type(e), e, e.__traceback__)
            raise
