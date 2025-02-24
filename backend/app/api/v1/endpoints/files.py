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
from app.core.dependencies.service import get_file_service
from app.services.connectors.service import ConnectorService
from app.services.file.service import FileService
from app.models.schema.files import DeleteDocumentRequest

router = APIRouter()


@router.get(
    "/hierarchy",
    response_model=FileHierarchyResponse,
    summary="Get file hierarchy for a connector",
)
async def get_connector_file_hierarchy(
    current_user: User = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service),
):
    """
    Retrieve the file hierarchy for a specific connector.

    - **connector_id**: ID of the connector
    - Returns a hierarchical representation of files
    """
    return await file_service.get_connector_file_hierarchy(str(current_user.id))


@router.get(
    "/blob/{file_id}",
    summary="Retrieve file blob",
    description="Retrieve the raw file blob for a specific file in a connector",
)
async def get_file_blob(
    file_id: str,
    file_service: FileService = Depends(get_file_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve the raw file blob for a specific file.

    - **connector_id**: ID of the connector
    - **file_id**: ID of the file blob
    - Returns raw file data with appropriate content type
    """
    try:
        connector_id = None  ## TODO: Need to be removed
        blob_data = await file_service.get_file_blob(file_id, str(current_user.id))
        # Return blob as a streaming response
        return Response(
            content=blob_data.blob,
            media_type=blob_data.mime_type,
            headers={
                "Content-Disposition": f"inline; filename={blob_data.filename}",
            },
        )
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise


@router.get(
    "/content/{file_id}",
    response_model=FileContentResponse,
    summary="Retrieve file content",
    description="Retrieve the text content for a specific file in a connector",
)
async def get_file_content(
    file_id: str,
    file_service: FileService = Depends(get_file_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve the text content for a specific file.

    - **connector_id**: ID of the connector
    - **file_id**: ID of the file
    - Returns file text content with metadata
    """
    try:
        return await file_service.get_file_content(file_id, str(current_user.id))
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise


@router.delete(
    "/delete",
    response_model=FileContentResponse,
    summary="Retrieve file content",
    description="Retrieve the text content for a specific file in a connector",
)
async def get_file_content(
    documents: List[DeleteDocumentRequest],
    file_service: FileService = Depends(get_file_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve the text content for a specific file.

    - **connector_id**: ID of the connector
    - **file_id**: ID of the file
    - Returns file text content with metadata
    """
    try:
        return await file_service.delete_files(documents, str(current_user.id))
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise
