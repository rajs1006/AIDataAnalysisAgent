from app.crud.folder import FolderConnectorCRUD
from app.crud.connector import ConnectorCRUD
from app.crud.user import UserCRUD
from app.crud.agent import AgentCRUD
from app.core.dependencies.vector import get_vector_store
from app.crud.conversation import ConversationCRUD
from app.crud.onedrive import OneDriveCRUD


async def get_connector_crud() -> ConnectorCRUD:
    """Get ConnectorCRUD instance."""
    return ConnectorCRUD()


async def get_folder_crud() -> FolderConnectorCRUD:
    """Get FolderConnectorCRUD instance."""
    return FolderConnectorCRUD()


async def get_user_crud() -> UserCRUD:
    """Get UserCRUD instance."""
    return UserCRUD()


async def get_agent_crud() -> AgentCRUD:
    """Get AgentCRUD instance."""
    return AgentCRUD()


async def get_onedrive_crud() -> OneDriveCRUD:
    """Get OneDriveCRUD instance."""
    return OneDriveCRUD()


def get_conversation_crud() -> ConversationCRUD:
    return ConversationCRUD()
