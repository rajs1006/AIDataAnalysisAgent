from fastapi import Depends
from app.services.auth.service import AuthService
from app.services.conversation.service import ConversationService
from app.services.connectors.onedrive.service import OneDriveService
from app.services.connectors.folder.service import FolderConnectorService

from app.core.dependencies.cruds import (
    get_agent_crud,
    get_conversation_crud,
    get_onedrive_crud,
    get_folder_crud,
    get_user_crud,
    get_connector_crud,
)
from app.core.dependencies.vector import get_vector_store
from app.core.dependencies.agent import get_react_agent
from app.services.store.vectorizer import VectorStore
from app.agents.openai_agent import ReActAgent
from app.crud.agent import AgentCRUD
from app.crud.conversation import ConversationCRUD
from app.crud.onedrive import OneDriveCRUD
from app.crud.connector import ConnectorCRUD
from app.crud.folder import FolderConnectorCRUD
from app.crud.user import UserCRUD
from app.services.agent.service import AgentService
from app.services.connectors.base import ConnectorService


def get_connector_service(
    connector_crud: ConnectorCRUD = Depends(get_connector_crud),
) -> ConnectorService:
    return ConnectorService(crud=connector_crud)


def get_conversation_service(
    conversation_crud: ConversationCRUD = Depends(get_conversation_crud),
) -> ConversationService:
    return ConversationService(conversation_crud=conversation_crud)


def get_agent_service(
    agent: ReActAgent = Depends(get_react_agent),
    agent_crud: AgentCRUD = Depends(get_agent_crud),
    vector_store: VectorStore = Depends(get_vector_store),
    conversation_service: ConversationService = Depends(get_conversation_service),
) -> AgentService:
    return AgentService(
        agent=agent,
        agent_crud=agent_crud,
        vector_store=vector_store,
        conversation_service=conversation_service,
    )


def get_onedrive_service(
    vector_store: VectorStore = Depends(get_vector_store),
    onedrive_crud: OneDriveCRUD = Depends(get_onedrive_crud),
) -> OneDriveService:
    return OneDriveService(crud=onedrive_crud, vector_store=vector_store)


def get_folder_service(
    folder_crud: FolderConnectorCRUD = Depends(get_folder_crud),
    vector_store: VectorStore = Depends(get_vector_store),
) -> FolderConnectorService:
    return FolderConnectorService(crud=folder_crud, vector_store=vector_store)


def get_auth_service(
    user_crud: UserCRUD = Depends(get_user_crud),
) -> AuthService:
    return AuthService(user_crud=user_crud)
