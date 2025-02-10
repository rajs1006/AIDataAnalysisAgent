from fastapi import APIRouter, Depends, HTTPException, Response
from typing import List

from app.core.dependencies.auth import get_current_user
from app.models.database.users import User
from app.crud.connector import ConnectorCRUD
from app.models.schema.base.hierarchy import (
    FileHierarchyResponse,
    BlobData,
    FileContentResponse,
)
from app.core.exceptions.connector_exceptions import FileNotFoundException
from app.core.dependencies.service import get_connector_service
from app.services.connectors.service import ConnectorService

router = APIRouter()


@router.get(
    "/hierarchy",
    response_model=FileHierarchyResponse,
    summary="Get file hierarchy for a connector",
)
async def get_connector_file_hierarchy(
    current_user: User = Depends(get_current_user),
    connector_service: ConnectorService = Depends(get_connector_service),
):
    """
    Retrieve the file hierarchy for a specific connector.

    - **connector_id**: ID of the connector
    - Returns a hierarchical representation of files
    """
    return await connector_service.get_connector_file_hierarchy(str(current_user.id))


@router.get(
    "/{connector_id}/blob/{file_id}",
    summary="Retrieve file blob",
    description="Retrieve the raw file blob for a specific file in a connector",
)
async def get_file_blob(
    connector_id: str, file_id: str, current_user: User = Depends(get_current_user)
):
    """
    Retrieve the raw file blob for a specific file.

    - **connector_id**: ID of the connector
    - **file_id**: ID of the file blob
    - Returns raw file data with appropriate content type
    """
    try:
        blob_data = await ConnectorCRUD.get_file_blob(
            connector_id, file_id, str(current_user.id)
        )
        # Return blob as a streaming response
        return Response(
            content=blob_data.blob,
            media_type=blob_data.content_type,
            headers={
                "Content-Disposition": f"inline; filename={blob_data.filename}",
            },
        )
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise


@router.get(
    "/{connector_id}/content/{file_id}",
    response_model=FileContentResponse,
    summary="Retrieve file content",
    description="Retrieve the text content for a specific file in a connector",
)
async def get_file_content(
    connector_id: str, file_id: str, current_user: User = Depends(get_current_user)
):
    """
    Retrieve the text content for a specific file.

    - **connector_id**: ID of the connector
    - **file_id**: ID of the file
    - Returns file text content with metadata
    """
    try:
        return await ConnectorCRUD.get_file_content(
            connector_id, file_id, str(current_user.id)
        )
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise
