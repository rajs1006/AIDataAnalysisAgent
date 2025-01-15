import logging
from fastapi import HTTPException, status
from app.crud.connector import ConnectorCRUD
from app.models.schema.base.connector import ConnectorUpdate
from app.services.agent.rag.service import RagService

logger = logging.getLogger(__name__)


class ConnectorService:

    def __init__(self, crud: ConnectorCRUD, rag_service: RagService):
        self.crud = crud
        self.rag_service = rag_service

    async def list_connectors(self, user_id: str):
        return await self.crud.get_user_connectors(user_id)

    async def update_connector_status(self, connector: ConnectorUpdate, user_id: str):
        """Update connector status"""

        connector_updated = await self.crud.update_connector_status(
            user_id=user_id, connector=connector
        )

        if not connector_updated["enabled"]:
            await self.rag_service.delete_documents(
                user_id=user_id, connector_id=connector.id
            )
