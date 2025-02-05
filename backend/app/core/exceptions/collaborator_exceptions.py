from fastapi import status


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
