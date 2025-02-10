from fastapi import HTTPException, status


class CollaboratorServiceError(Exception):
    """Base exception for Collaborator Service errors."""

    def __init__(
        self,
        message: str,
        error_code: str = "COLLABORATOR_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)


class MaxCollaboratorInvitesError(CollaboratorServiceError):
    """Exception raised when maximum collaborator invites are reached."""

    def __init__(self, max_limit: int):
        super().__init__(
            f"Maximum number of pending collaborator invites ({max_limit}) reached. "
            "Please cancel existing invites before sending new ones.",
            error_code="MAX_COLLABORATOR_INVITES_REACHED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        )
        self.max_limit = max_limit


class DuplicateCollaboratorInviteError(CollaboratorServiceError):
    """Exception raised when trying to invite an already invited collaborator."""

    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code="DUPLICATE_COLLABORATOR_INVITE",
            status_code=status.HTTP_409_CONFLICT,
        )


class MaxCollaboratorsExceededException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum number of collaborators (5) has been reached.",
        )


class CollaboratorAlreadyInvitedException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="Collaborator has already been invited to this document.",
        )


class InvalidCollaboratorRoleException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid collaborator role specified.",
        )


class CollaboratorNotFoundException(HTTPException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND, detail="Collaborator not found."
        )
