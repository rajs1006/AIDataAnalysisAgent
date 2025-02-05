from typing import List, Optional
from beanie import PydanticObjectId
from pymongo.errors import DuplicateKeyError

from app.models.database.collaborators import CollaboratorInvite
from app.models.database.users import User
from app.core.config.config import settings
from app.core.security.auth import get_password_hash
from app.services.email.smtp import send_email
from app.utils.tools import generate_unique_token


async def create_collaborator_invite(
    inviter_id: PydanticObjectId, 
    invitee_id: PydanticObjectId
) -> CollaboratorInvite:
    """
    Create a new collaborator invite
    
    :param inviter_id: ID of the user creating the invite
    :param invitee_id: ID of the invited collaborator
    :return: Created CollaboratorInvite instance
    :raises ValueError: If invite already exists or max collaborators reached
    """
    # Check if inviter exists
    inviter = await User.get(inviter_id)
    if not inviter:
        raise ValueError("Inviter user not found")

    # Check if invitee exists
    invitee = await User.get(invitee_id)
    if not invitee:
        raise ValueError("Invitee user not found")

    # Check if invitee is the same as inviter
    if inviter_id == invitee_id:
        raise ValueError("Cannot invite yourself as a collaborator")

    # Check maximum collaborators
    existing_invites = await CollaboratorInvite.find(
        CollaboratorInvite.inviter_id == inviter_id,
        CollaboratorInvite.status == "pending"
    ).to_list()
    
    if len(existing_invites) >= settings.MAX_COLLABORATORS_PER_USER:
        raise ValueError("Maximum number of pending collaborator invites reached")

    # Check for existing pending invite
    existing_invite = await CollaboratorInvite.find_one(
        CollaboratorInvite.inviter_id == inviter_id,
        CollaboratorInvite.invitee_id == invitee_id,
        CollaboratorInvite.status == "pending"
    )
    
    if existing_invite:
        raise ValueError("Collaborator already invited")

    # Generate invitation token
    invitation_token = generate_unique_token()

    # Create new invite
    invite = CollaboratorInvite(
        inviter_id=inviter_id,
        invitee_id=invitee_id,
        invitation_token=invitation_token
    )

    try:
        await invite.insert()
    except DuplicateKeyError:
        raise ValueError("Invite already exists")

    return invite


async def get_user_collaborators(
    user_id: PydanticObjectId, 
    status: Optional[str] = None
) -> List[dict]:
    """
    Retrieve collaborator invites for a user
    
    :param user_id: ID of the user
    :param status: Optional status filter
    :return: List of collaborator invites with additional details
    """
    query = CollaboratorInvite.inviter_id == user_id
    
    if status:
        query &= CollaboratorInvite.status == status

    invites = await CollaboratorInvite.find(query).to_list()
    
    # Fetch invitee details
    collaborator_details = []
    for invite in invites:
        # Fetch invitee user to get email
        invitee = await User.get(invite.invitee_id)
        
        collaborator_details.append({
            "id": str(invite.id),
            "inviterId": str(invite.inviter_id),
            "inviteeEmail": invitee.email,
            "status": invite.status,
            "invitedAt": invite.invited_at,
            "expiresAt": invite.expires_at
        })

    return collaborator_details


async def update_collaborator_invite_status(
    invite_id: PydanticObjectId, 
    status: str,
    current_user_id: PydanticObjectId
) -> CollaboratorInvite:
    """
    Update the status of a collaborator invite
    
    :param invite_id: ID of the invite
    :param status: New status (accepted/rejected)
    :param current_user_id: ID of the user updating the invite
    :return: Updated CollaboratorInvite instance
    :raises ValueError: If invite not found or unauthorized
    """
    invite = await CollaboratorInvite.get(invite_id)
    
    if not invite:
        raise ValueError("Invite not found")
    
    if invite.invitee_id != current_user_id:
        raise ValueError("Unauthorized to update this invite")
    
    if invite.status != "pending":
        raise ValueError("Invite can only be updated when in pending status")
    
    if CollaboratorInvite.is_invite_expired(invite):
        invite.status = "rejected"
        await invite.save()
        raise ValueError("Invite has expired")
    
    invite.status = status
    await invite.save()
    
    return invite


async def delete_collaborator_invite(
    invite_id: PydanticObjectId, 
    current_user_id: PydanticObjectId
) -> bool:
    """
    Delete a collaborator invite
    
    :param invite_id: ID of the invite to delete
    :param current_user_id: ID of the user attempting to delete
    :return: True if deleted, False otherwise
    :raises ValueError: If unauthorized or invite not found
    """
    invite = await CollaboratorInvite.get(invite_id)
    
    if not invite:
        raise ValueError("Invite not found")
    
    if invite.inviter_id != current_user_id:
        raise ValueError("Unauthorized to delete this invite")
    
    await invite.delete()
    return True
