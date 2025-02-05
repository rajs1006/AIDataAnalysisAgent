from app.core.logging_config import get_logger
from fastapi import HTTPException, status


logger = get_logger(__name__)
class ConnectorBaseException(HTTPException):
    """Base exception for connector-related errors."""
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)
        logger.error("{self.__class__.__name__}: {detail}", )


class ConnectorNotFoundException(ConnectorBaseException):
    """Raised when a connector is not found."""
    def __init__(self, connector_id: str):
        super().__init__(
            f"Connector with ID {connector_id} not found", 
            status_code=status.HTTP_404_NOT_FOUND
        )


class FileNotFoundException(ConnectorBaseException):
    """Raised when a file is not found."""
    def __init__(self, file_id: str, connector_id: str = None):
        detail = f"File with ID {file_id} not found"
        if connector_id:
            detail += f" in connector {connector_id}"
        super().__init__(detail, status_code=status.HTTP_404_NOT_FOUND)


class BlobStorageException(ConnectorBaseException):
    """Raised when there are issues with blob storage."""
    def __init__(self, message: str):
        super().__init__(f"Blob storage error: {message}")


class FileSizeLimitException(ConnectorBaseException):
    """Raised when file size exceeds allowed limit."""
    def __init__(self, max_size: int):
        super().__init__(
            f"File size exceeds maximum allowed limit of {max_size} bytes",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
        )


class FileProcessingException(ConnectorBaseException):
    """Raised when file processing fails."""
    def __init__(self, filename: str, reason: str):
        super().__init__(
            f"Failed to process file {filename}: {reason}",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )


class ConnectorAuthorizationException(ConnectorBaseException):
    """Raised when user lacks permission for a connector operation."""
    def __init__(self, user_id: str, connector_id: str):
        super().__init__(
            f"User {user_id} is not authorized to access connector {connector_id}",
            status_code=status.HTTP_403_FORBIDDEN
        )
