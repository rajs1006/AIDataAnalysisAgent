from app.core.logging_config import get_logger
from fastapi import APIRouter, Depends, status, Request, HTTPException
from typing import List
from app.core.dependencies import (
    get_current_user,
    get_vector_store,
    get_onedrive_crud,
    get_onedrive_service,
)
from app.services.connectors.onedrive.service import OneDriveService
from app.models.schema.connectors.onedrive import (
    OneDriveCreate,
    OneDriveResponse,
    OAuthCallbackRequest,
)
from app.core.store.vectorizer import VectorStore
from app.crud.onedrive import OneDriveCRUD

router = APIRouter()



@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_connector(
    connector_data: OneDriveCreate,
    current_user=Depends(get_current_user),
    service: OneDriveService = Depends(get_onedrive_service),
):
    """Create a new OneDrive connector"""
    try:
        return await service.create_connector(connector_data, current_user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error creating connector: {str(e)}", )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create connector: {str(e)}",
        )


@router.post("/webhook")
async def webhook(
    request: Request,
    service: OneDriveService = Depends(get_onedrive_service),
):
    """Handle OneDrive webhook notifications"""
    try:
        data = await request.json()
        await service.process_webhook(data)
        return {"status": "success"}
    except Exception as e:
        logger.error("Webhook processing failed: {str(e)}", )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process webhook: {str(e)}",
        )


@router.post("/{connector_id}/sync")
async def sync_connector(
    connector_id: str,
    current_user=Depends(get_current_user),
    service: OneDriveService = Depends(get_onedrive_service),
):
    """Manually trigger connector sync"""
    try:
        await service.sync_folder(connector_id, current_user.id)
        return {"status": "success"}
    except Exception as e:
        logger.error("Manual sync failed: {str(e)}", )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync connector: {str(e)}",
        )


@router.get("/{connector_id}/status")
async def get_connector_status(
    connector_id: str,
    current_user=Depends(get_current_user),
    service: OneDriveService = Depends(get_onedrive_service),
):
    """Get connector sync status"""
    try:
        connector = await service.crud.get_connector(connector_id, str(current_user.id))
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connector not found",
            )
        return {
            "status": connector.status,
            "last_sync": connector.last_sync,
            "error_message": connector.error_message,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting status: {str(e)}", )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get status: {str(e)}",
        )


@router.delete("/{connector_id}")
async def delete_connector(
    connector_id: str,
    current_user=Depends(get_current_user),
    service: OneDriveService = Depends(get_onedrive_service),
):
    """Delete OneDrive connector"""
    try:
        await service.delete_connector(connector_id, str(current_user.id))
        return {"status": "success"}
    except Exception as e:
        logger.error("Error deleting connector: {str(e)}", )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete connector: {str(e)}",
        )
