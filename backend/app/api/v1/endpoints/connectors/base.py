from fastapi import APIRouter, Depends, status, Request, HTTPException
from typing import List
from app.core.dependencies import (
    get_current_user,
    get_connector_crud,
)
from app.services.connectors.base import ConnectorService
from app.models.database.connectors.connector import Connectors
from app.crud.connector import ConnectorCRUD
from app.models.schema.base.connector import ConnectorUpdate
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class service:
    def __init__(self, connector_crud: ConnectorCRUD):
        self.service = ConnectorService(connector_crud)


@router.get("/", response_model=List[Connectors])
async def list_connectors(
    current_user=Depends(get_current_user),
    connector_crud: ConnectorCRUD = Depends(get_connector_crud),
):
    """List all active folder connectors for the current user"""
    try:
        endpoint = service(connector_crud)
        return await endpoint.service.list_connectors(current_user.id)
    except Exception as e:
        logger.error(f"Error listing connectors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve connectors",
        )


@router.put("/")
async def update_connector_status(
    connector: ConnectorUpdate,
    current_user=Depends(get_current_user),
    connector_crud: ConnectorCRUD = Depends(get_connector_crud),
):
    """Update connector status"""
    try:
        endpoint = service(connector_crud)
        await endpoint.service.update_connector_status(connector, current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating connector status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update connector status: {str(e)}",
        )
