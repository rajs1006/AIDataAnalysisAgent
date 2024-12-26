from fastapi import (
    APIRouter,
    Depends,
    status,
    Request,
    HTTPException,
    Form,
    File,
    UploadFile,
)
from app.core.dependencies import (
    get_current_user,
    get_current_user_api,
    get_folder_service,
)
from app.services.connectors.folder.service import FolderConnectorService
from app.models.schema.connectors.folder import FolderCreate
from typing import List
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter()


# class folder_service:


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_connector(
    name: str = Form(...),
    connector_type: str = Form(...),
    platform_info: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user=Depends(get_current_user),
    folder_service: FolderConnectorService = Depends(get_folder_service),
    # vector_store: VectorStore = Depends(get_vector_store),
    # folder_crud: FolderConnectorCRUD = Depends(get_folder_crud),
):
    """Create a new folder connector and generate watcher executable"""
    try:
        connector_data = FolderCreate(
            name=name,
            connector_type=connector_type,
            platform_info=json.loads(platform_info),
            files=files,
        )
        return await folder_service.create_connector(connector_data, current_user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating connector: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create connector: {str(e)}",
        )


@router.post("/watch")
async def watch_event(
    request: Request,
    current_user=Depends(get_current_user_api),
    # vector_store: VectorStore = Depends(get_vector_store),
    # folder_crud: FolderConnectorCRUD = Depends(get_folder_crud),
    folder_service: FolderConnectorService = Depends(get_folder_service),
):
    """Handle file watch events with vectorization"""
    try:
        # endpoint = folder_service(folder_crud, vector_store)
        return await folder_service.process_watch_event(request, current_user)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing watch event: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process watch event: {str(e)}",
        )


@router.get("/{connector_id}/status")
async def check_connector_status(
    connector_id: str,
    current_user=Depends(get_current_user_api),
    # vector_store: VectorStore = Depends(get_vector_store),
    # folder_crud: FolderConnectorCRUD = Depends(get_folder_crud),
    folder_service: FolderConnectorService = Depends(get_folder_service),
):
    """Check if a connector is active"""
    try:
        # service = FolderConnectorService(folder_crud, vector_store)
        return await folder_service.get_connector_status(connector_id, current_user.id)
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error checking connector status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check connector status: {str(e)}",
        )


@router.put("/{connector_id}")
async def update_connector_status(
    connector_id: str,
    status: str,
    current_user=Depends(get_current_user),
    folder_service: FolderConnectorService = Depends(get_folder_service),
    # vector_store: VectorStore = Depends(get_vector_store),
    # folder_crud: FolderConnectorCRUD = Depends(get_folder_crud),
):
    """Update connector status"""
    try:
        # endpoint = folder_service(folder_crud, vector_store)
        return await folder_service.update_connector_status(
            connector_id, status, current_user.id
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating connector status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update connector status: {str(e)}",
        )
