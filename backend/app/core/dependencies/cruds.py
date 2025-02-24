from app.crud.folder import FolderConnectorCRUD
from app.crud.connector import ConnectorCRUD
from app.crud.user import UserCRUD
from app.crud.agent import AgentCRUD
from app.crud.conversation import ConversationCRUD
from app.crud.onedrive import OneDriveCRUD
from app.crud.image import ImageAgentCRUD
from app.crud.billing import BillingCRUD, ModelPricingCRUD
from app.crud.collaborator import CollaboratorCRUD
from app.crud.file import FileCRUD 


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


async def get_conversation_crud() -> ConversationCRUD:
    return ConversationCRUD()


async def get_image_agent_crud() -> ImageAgentCRUD:
    return ImageAgentCRUD()


def get_billing_crud() -> BillingCRUD:
    """Get BillingCRUD instance."""
    return BillingCRUD()


def get_model_pricing_crud() -> ModelPricingCRUD:
    """Get ModelPricingCRUD instance."""
    return ModelPricingCRUD()


def get_collaborator_crud() -> CollaboratorCRUD:
    """Get CollaboratorCRUD instance."""
    return CollaboratorCRUD()


def get_file_crud() -> FileCRUD:
    """Get FileCRUD instance."""
    return FileCRUD()
