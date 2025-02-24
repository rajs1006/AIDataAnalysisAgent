from typing import Optional


class DocumentProcessingError(Exception):
    """
    Base exception for document processing related errors.

    Attributes:
        message (str): A descriptive error message.
        details (Optional[str]): Additional details about the error, if available.
    """

    def __init__(self, message: str, details: Optional[str] = None):
        """
        Initialize a DocumentProcessingError.

        Args:
            message (str): The primary error message.
            details (Optional[str], optional): Additional error details. Defaults to None.
        """
        self.message = message
        self.details = details
        super().__init__(self._format_error())

    def _format_error(self) -> str:
        """
        Format the error message with optional details.

        Returns:
            str: Formatted error message.
        """
        if self.details:
            return f"{self.message}: {self.details}"
        return self.message


class ConfigurationError(DocumentProcessingError):
    """
    Exception raised for configuration-related errors in document processing.
    """

    def __init__(self, message: str, details: Optional[str] = None):
        """
        Initialize a ConfigurationError.

        Args:
            message (str): The primary error message.
            details (Optional[str], optional): Additional error details. Defaults to None.
        """
        super().__init__(message, details)


class APIError(DocumentProcessingError):
    """
    Exception raised for API-related errors during document processing.
    """

    def __init__(self, message: str, details: Optional[str] = None):
        """
        Initialize an APIError.

        Args:
            message (str): The primary error message.
            details (Optional[str], optional): Additional error details. Defaults to None.
        """
        super().__init__(message, details)


class InvalidFileTypeError(DocumentProcessingError):
    """
    Exception raised when an unsupported or invalid file type is encountered.
    """

    def __init__(self, message: str, details: Optional[str] = None):
        """
        Initialize an InvalidFileTypeError.

        Args:
            message (str): The primary error message.
            details (Optional[str], optional): Additional error details. Defaults to None.
        """
        super().__init__(message, details)
