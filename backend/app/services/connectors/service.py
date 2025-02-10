from app.core.logging_config import get_logger
from fastapi import HTTPException, status
from app.crud.connector import ConnectorCRUD
from app.crud.collaborator import CollaboratorCRUD
from app.crud.file import FileCRUD
from app.models.schema.base.connector import ConnectorUpdate, ConnectorFrontend
from app.services.agent.rag.service import RagService
from app.models.schema.base.hierarchy import FileHierarchyResponse
from app.core.files.hierarchy import FileHierarchyBuilder

logger = get_logger(__name__)


class ConnectorService:

    def __init__(
        self,
        crud: ConnectorCRUD,
        rag_service: RagService,
    ):
        self.crud = crud
        self.rag_service = rag_service

    async def list_connectors(self, user_id: str) -> ConnectorFrontend:
        connectors = await self.crud.get_user_connectors(user_id)
        return [
            ConnectorFrontend.from_database_model(connector) for connector in connectors
        ]

    async def update_connector_status(self, connector: ConnectorUpdate, user_id: str):
        """Update connector status"""

        connector_updated = await self.crud.update_connector_status(
            user_id=user_id, connector=connector
        )

        if not connector_updated["enabled"]:
            await self.rag_service.delete_documents(
                user_id=user_id, connector_id=connector.id
            )
