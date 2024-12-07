import logging

from app.models.database.connectors import BaseConnector

logger = logging.getLogger(__name__)


class ConnectorCRUD:
    @staticmethod
    async def get_user_connectors(user_id: str):
        """Get all active connectors for a user"""
        return await BaseConnector.find(
            {"user_id": str(user_id), "enabled": True}
        ).to_list()
