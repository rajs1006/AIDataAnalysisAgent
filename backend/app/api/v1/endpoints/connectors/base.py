from app.core.logging_config import get_logger
from fastapi import APIRouter, Depends, status, Request, HTTPException
from typing import List
from app.core.dependencies import (
    get_current_user,
    get_connector_crud,
    get_connector_service,
)
from app.services.connectors.service import ConnectorService
from app.models.database.connectors.connector import Connector
from app.crud.connector import ConnectorCRUD
from app.models.schema.base.connector import ConnectorUpdate, ConnectorFrontend
from app.core.logging_config import get_logger

router = APIRouter()

logger = get_logger(__name__)


@router.get("/", response_model=List[ConnectorFrontend])
async def list_connectors(
    current_user=Depends(get_current_user),
    connector_service: ConnectorService = Depends(get_connector_service),
):
    """List all active folder connectors for the current user"""
    try:
        return await connector_service.list_connectors(current_user.id)
    except Exception as e:
        logger.error(
            f"Error listing connectors: {str(e)}",
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve connectors",
        )


@router.put("/")
async def update_connector_status(
    connector: ConnectorUpdate,
    current_user=Depends(get_current_user),
    connector_service: ConnectorService = Depends(get_connector_service),
):
    """Update connector status"""
    try:
        await connector_service.update_connector_status(connector, current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error updating connector status: {str(e)}",
        )
        raise HTTPException(
            detail=f"Failed to update connector status: {str(e)}",
        )
