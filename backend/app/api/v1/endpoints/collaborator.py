from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies.auth import get_current_user
from app.models.database.users import User
from app.models.schema.collaborator import (
    CollaboratorInviteRequest,
    DocumentAccessCreate,
    DocumentAccessResponse,
)
from app.services.collaborator.service import CollaboratorService
from app.core.exceptions.collaborator_exceptions import (
    MaxCollaboratorsExceededException,
    CollaboratorAlreadyInvitedException,
    InvalidCollaboratorRoleException,
    CollaboratorNotFoundException,
)

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.core.dependencies.auth import get_current_user
from app.models.database.users import User
from app.models.schema.collaborator import (
    CollaboratorInviteRequest,
    CollaboratorRegistrationRequest,
    CollaboratorRegistrationResponse,
    CollaboratorResponse,
)
from app.services.collaborator.service import (
    CollaboratorService,
    MaxCollaboratorInvitesError,
    DuplicateCollaboratorInviteError,
)
from app.core.dependencies.service import get_collaborator_service

router = APIRouter()


@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_collaborator(
    invite_data: CollaboratorInviteRequest,
    current_user: User = Depends(get_current_user),
    service: CollaboratorService = Depends(get_collaborator_service),
):
    """
    Invite a new collaborator
    """
    try:
        invite = await service.create_collaborator_invite(
            inviter_id=str(current_user.id), invite_data=invite_data
        )
        return {
            "message": "Collaborator invite sent successfully",
            "invite_id": str(invite.id),
        }
    except MaxCollaboratorInvitesError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "message": e.message,
                "error_code": e.error_code,
                "max_limit": e.max_limit,
            },
        )
    except DuplicateCollaboratorInviteError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": e.message, "error_code": e.error_code, "email": e.email},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/register", response_model=CollaboratorRegistrationResponse)
async def complete_collaborator_registration(
    registration_data: CollaboratorRegistrationRequest,
    service: CollaboratorService = Depends(get_collaborator_service),
):
    """
    Complete registration for an invited collaborator
    """
    try:
        user = await service.complete_registration(registration_data=registration_data)
        return CollaboratorRegistrationResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name or "",
            user_type=user.user_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/", response_model=List[CollaboratorResponse])
async def list_collaborator_invites(
    current_user: User = Depends(get_current_user),
    service: CollaboratorService = Depends(get_collaborator_service),
):
    """
    List collaborator invites for the current user
    """
    try:
        invites = await service.get_collaborator_invites(user_id=str(current_user.id))
        return invites
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collaborator_invite(
    invite_id: str,
    current_user: User = Depends(get_current_user),
    service: CollaboratorService = Depends(get_collaborator_service),
):
    """
    Delete a collaborator invite
    """
    try:
        await service.delete_collaborator_invite(
            invite_id=invite_id, current_user_id=str(current_user.id)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/file/share", response_model=List[CollaboratorResponse])
async def get_document_collaborators(
    document_id: str,
    current_user: User = Depends(get_current_user),
    service: CollaboratorService = Depends(get_collaborator_service),
):
    """
    Get list of collaborators for a specific document
    """
    return await service.get_document_collaborators(document_id, str(current_user.id))


@router.post("/file/share", response_model=List[DocumentAccessResponse])
async def update_document_collaborator(
    invite_request: List[DocumentAccessCreate],
    current_user: User = Depends(get_current_user),
    service: CollaboratorService = Depends(get_collaborator_service),
):
    """
    Invite a collaborator to a document
    """
    try:
        return await service.update_document_collaborator(
            invite_request, str(current_user.id)
        )
    except (
        MaxCollaboratorsExceededException,
        CollaboratorAlreadyInvitedException,
        InvalidCollaboratorRoleException,
    ) as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


# @router.delete("/file/share", response_model=DocumentAccessResponse)
# async def remove_document_access(
#     remove_request: DocumentAccessRemove,
#     current_user: User = Depends(get_current_user),
#     service: CollaboratorService = Depends(get_collaborator_service),
# ):
#     """
#     Remove collaborator access from a document
#     """
#     try:
#         return await service.remove_document_collaborator(
#             remove_request, str(current_user.id)
#         )
#     except Exception as e:  # You might want to catch specific exceptions
#         raise HTTPException(status_code=400, detail=str(e))


# @router.put("/{collaborator_id}/role", response_model=DocumentAccessResponse)
# def update_collaborator_role(
#     collaborator_id: str,
#     update_request: CollaboratorUpdateRequest,
#     current_user: User = Depends(get_current_user),
#     service: CollaboratorService = Depends(get_collaborator_service),
# ):
#     """
#     Update a collaborator's role
#     """
#     try:
#         return service.update_collaborator_role(
#             collaborator_id, update_request, str(current_user.id)
#         )
#     except (CollaboratorNotFoundException, InvalidCollaboratorRoleException) as e:
#         raise HTTPException(status_code=e.status_code, detail=e.detail)


# @router.post("/{collaborator_id}/accept", response_model=DocumentAccessResponse)
# def accept_invitation(
#     collaborator_id: str,
#     current_user: User = Depends(get_current_user),
#     service: CollaboratorService = Depends(get_collaborator_service),
# ):
#     """
#     Accept a collaboration invitation
#     """
#     try:
#         return service.accept_invitation(collaborator_id, str(current_user.id))
#     except CollaboratorNotFoundException as e:
#         raise HTTPException(status_code=e.status_code, detail=e.detail)
