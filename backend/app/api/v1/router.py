from fastapi import APIRouter
from .endpoints import auth, agent, conversation, billing, collaborator
from .endpoints.connectors import folder
from .endpoints.connectors import onedrive
from .endpoints.connectors import base
from .endpoints import files as connectors_files

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(agent.router, prefix="/agent", tags=["ai.agents"])
api_router.include_router(
    collaborator.router, prefix="/collaborators", tags=["ai.collaborators"]
)
api_router.include_router(
    conversation.router, prefix="/conversations", tags=["conversations"]
)
api_router.include_router(base.router, prefix="/connectors", tags=["connectors"])
api_router.include_router(
    folder.router, prefix="/connectors/folder", tags=["connectors.folder"]
)
api_router.include_router(
    onedrive.router, prefix="/connectors/onedrive", tags=["connectors.onedrive"]
)
api_router.include_router(
    connectors_files.router, prefix="/connectors/files", tags=["connectors.files"]
)
