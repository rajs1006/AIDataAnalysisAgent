import logging
import traceback
from app.models.database.base.connector import BaseConnector

logger = logging.getLogger(__name__)


class ConnectorCRUD:
    @staticmethod
    async def get_user_connectors(user_id: str):
        """Get all active connectors for a user"""
        try:
            return await BaseConnector.find(
                {"user_id": str(user_id), "enabled": True}
            ).to_list()
        except Exception as e:
            traceback.print_exception(type(e), e, e.__traceback__)
            raise
