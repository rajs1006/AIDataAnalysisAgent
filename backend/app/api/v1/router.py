from fastapi import APIRouter
from .endpoints import auth, agent
from .endpoints.connectors import folder
from .endpoints.connectors import onedrive
from .endpoints.connectors import base

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(agent.router, prefix="/agent", tags=["ai.agents"])
api_router.include_router(base.router, prefix="/connectors", tags=["connectors"])
api_router.include_router(
    folder.router, prefix="/connectors/folder", tags=["connectors.folder"]
)
api_router.include_router(
    onedrive.router, prefix="/connectors/onedrive", tags=["connectors.onedrive"]
)
