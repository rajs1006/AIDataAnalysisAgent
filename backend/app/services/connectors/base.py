import logging
from fastapi import HTTPException, status
from app.crud.connector import ConnectorCRUD
from app.models.schema.base.connector import ConnectorUpdate

logger = logging.getLogger(__name__)


class ConnectorService:

    def __init__(self, crud: ConnectorCRUD):
        self.crud = crud

    async def list_connectors(self, user_id: str):
        return await self.crud.get_user_connectors(user_id)

    async def update_connector_status(self, connector: ConnectorUpdate, user_id: str):
        """Update connector status"""

        return await self.crud.update_connector_status(
            user_id=user_id, connector=connector
        )
