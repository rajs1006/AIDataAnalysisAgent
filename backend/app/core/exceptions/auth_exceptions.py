from fastapi import status


class AuthServiceError(Exception):
    """Base exception for Auth Service errors."""

    def __init__(
        self, 
        message: str, 
        error_code: str = "AUTH_ERROR", 
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)


class AuthenticationError(AuthServiceError):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message, 
            error_code="AUTHENTICATION_FAILED", 
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class TokenError(AuthServiceError):
    """Raised for token-related errors."""

    def __init__(self, message: str = "Invalid or expired token"):
        super().__init__(
            message, 
            error_code="INVALID_TOKEN", 
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class EmailDeliveryError(AuthServiceError):
    """Raised when email sending fails."""

    def __init__(self, message: str = "Failed to send email"):
        super().__init__(
            message, 
            error_code="EMAIL_DELIVERY_FAILED", 
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class OAuthError(AuthServiceError):
    """Raised for OAuth-related errors."""

    def __init__(self, message: str = "OAuth operation failed"):
        super().__init__(
            message, 
            error_code="OAUTH_ERROR", 
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AccountDisabledError(AuthServiceError):
    """Raised when a user account is disabled and requires admin intervention."""

    def __init__(
        self,
        admin_email: str = None,
        message: str = "Please contact system administration to activate your account"
    ):
        full_message = f"{message} {admin_email}" if admin_email else message
        super().__init__(
            full_message, 
            error_code="ACCOUNT_DISABLED", 
            status_code=status.HTTP_403_FORBIDDEN
        )
        self.admin_email = admin_email
