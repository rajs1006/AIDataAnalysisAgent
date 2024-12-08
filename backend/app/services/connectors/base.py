import logging

from app.crud.connector import ConnectorCRUD

logger = logging.getLogger(__name__)


class ConnectorService:

    def __init__(self, crud: ConnectorCRUD):
        self.crud = crud

    async def list_connectors(self, user_id: str):
        return await self.crud.get_user_connectors(user_id)
