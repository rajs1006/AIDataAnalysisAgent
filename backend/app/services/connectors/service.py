from app.core.logging_config import get_logger
from fastapi import HTTPException, status
from app.crud.connector import ConnectorCRUD
from app.services.file.service import FileService
from app.crud.collaborator import CollaboratorCRUD
from app.crud.file import FileCRUD
from app.models.schema.base.connector import ConnectorUpdate, ConnectorFrontend
from app.services.agent.rag.service import RagService
from app.models.schema.base.hierarchy import FileHierarchyResponse
from app.core.files.hierarchy import FileHierarchyBuilder

logger = get_logger(__name__)


class ConnectorService:

    def __init__(
        self,
        crud: ConnectorCRUD,
        file_service: FileService,
    ):
        self.crud = crud
        self.file_service = file_service

    async def list_connectors(self, user_id: str) -> ConnectorFrontend:
        connectors = await self.crud.get_user_connectors(user_id)
        return [
            ConnectorFrontend.from_database_model(connector) for connector in connectors
        ]

    async def update_connector_status(self, connector: ConnectorUpdate, user_id: str):
        """
        Update connector status and handle cleanup if connector is disabled

        Args:
            connector (ConnectorUpdate): Connector update data
            user_id (str): ID of the user performing the update

        Returns:
            dict: Dictionary containing update status and any cleanup errors

        Raises:
            HTTPException: If connector update fails or invalid connector
        """
        try:
            # Validate connector exists
            existing_connector = await self.crud.get_connector(
                user_id=user_id, connector_id=connector.id
            )

            if not existing_connector:
                logger.error(
                    f"Connector not found during status update. user_id: {user_id}, "
                    f"connector_id: {connector.id}"
                )
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found"
                )

            cleanup_results = []

            # Handle cleanup if connector is being disabled
            if not connector.enabled:
                logger.info(
                    f"Cleaning up disabled connector resources. user_id: {user_id}, "
                    f"connector_id: {connector.id}"
                )

                if not existing_connector.files:
                    logger.warning(
                        f"No files found to clean up for disabled connector. user_id: {user_id}, "
                        f"connector_id: {connector.id}"
                    )
                else:
                    for file in existing_connector.files:
                        doc_id = str(file.doc_id)
                        try:
                            result = await self.file_service.delete_file(
                                connector_id=connector.id,
                                user_id=user_id,
                                doc_id=doc_id,
                            )
                            cleanup_results.append(result)

                            if result.get("error"):
                                logger.error(
                                    f"Error cleaning up file for disabled connector. user_id: {user_id}, "
                                    f"connector_id: {connector.id}, file_id: {file.id}, , doc_id: {doc_id} "
                                    f"error: {result['error']}"
                                )
                            else:
                                logger.info(
                                    f"Successfully cleaned up file for disabled connector. user_id: {user_id}, "
                                    f"connector_id: {connector.id}, file_id: {file.id} , doc_id: {doc_id }"
                                )

                        except Exception as e:
                            error_msg = f"Failed to process file deletion: {str(e)}"
                            logger.error(
                                f"Error in file cleanup. user_id: {user_id}, "
                                f"connector_id: {connector.id}, file_id: {file.id}, doc_id: {doc_id} "
                                f"error: {error_msg}"
                            )
                            cleanup_results.append(
                                {
                                    "connector_id": str(connector.id),
                                    "document_id": doc_id,
                                    "error": error_msg,
                                }
                            )

            # Update connector status after cleanup
            try:
                await self.crud.update_connector_status(
                    user_id=user_id, connector=connector
                )
                logger.info(
                    f"Successfully updated connector status. user_id: {user_id}, "
                    f"connector_id: {connector.id}, enabled: {connector.enabled}"
                )
            except Exception as e:
                logger.error(
                    f"Failed to update connector status. user_id: {user_id}, "
                    f"connector_id: {connector.id}, error: {str(e)}"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update connector status: {str(e)}",
                )

            # Check if there were any cleanup errors
            has_errors = any(result.get("error") for result in cleanup_results)

            return {
                "status": "success" if not has_errors else "partial_success",
                "message": (
                    "Connector status updated and cleanup completed"
                    if not has_errors
                    else "Connector status updated but some cleanup operations failed"
                ),
                "cleanup_results": cleanup_results,
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                f"Unexpected error in update_connector_status. user_id: {user_id}, "
                f"connector_id: {connector.id}, error: {str(e)}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process connector status update: {str(e)}",
            )
