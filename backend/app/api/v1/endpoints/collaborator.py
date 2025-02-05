from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.core.dependencies.auth import get_current_user
from app.models.database.users import User
from app.models.schema.collaborator import (
    CollaboratorInviteRequest,
    CollaboratorRegistrationRequest,
    CollaboratorRegistrationResponse,
    CollaboratorInviteResponse,
)
from app.services.collaborator.service import (
    CollaboratorService,
    MaxCollaboratorInvitesError,
    DuplicateCollaboratorInviteError,
)

router = APIRouter()
collaborator_service = CollaboratorService()


@router.post("/invite", status_code=status.HTTP_201_CREATED)
async def invite_collaborator(
    invite_data: CollaboratorInviteRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Invite a new collaborator
    """
    try:
        invite = await collaborator_service.create_collaborator_invite(
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
):
    """
    Complete registration for an invited collaborator
    """
    try:
        user = await collaborator_service.complete_registration(
            registration_data=registration_data
        )
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


@router.get("/", response_model=List[CollaboratorInviteResponse])
async def list_collaborator_invites(current_user: User = Depends(get_current_user)):
    """
    List collaborator invites for the current user
    """
    try:
        invites = await collaborator_service.get_collaborator_invites(
            user_id=str(current_user.id)
        )
        return invites
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/{invite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collaborator_invite(
    invite_id: str, current_user: User = Depends(get_current_user)
):
    """
    Delete a collaborator invite
    """
    try:
        await collaborator_service.delete_collaborator_invite(
            invite_id=invite_id, current_user_id=str(current_user.id)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
