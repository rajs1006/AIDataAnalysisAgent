from datetime import datetime, timedelta
from typing import Optional, List

from app.core.config.config import settings
from app.core.security.auth import get_password_hash
from app.models.database.users import User
from app.models.database.collaborators import Collaborator
from app.models.schema.collaborator import (
    CollaboratorRegistrationRequest,
    CollaboratorInviteRequest,
    CollaboratorResponse,
    DocumentAccessCreate,
    DocumentAccessRemove,
    DocumentAccessResponse,
    CollaboratorListResponse,
    CollaboratorUpdateRequest,
)
from app.services.email.smtp import EmailService
from app.core.security.auth import generate_verification_token, verify_token
from app.crud.user import UserCRUD
from app.core.exceptions.collaborator_exceptions import (
    DuplicateCollaboratorInviteError,
    MaxCollaboratorInvitesError,
)
from app.crud.collaborator import CollaboratorCRUD
from app.core.exceptions.auth_exceptions import AccountDisabledError, EmailDeliveryError
from app.models.enums import DocumentAccessEnum, InviteStatusEnum
from app.services.agent.rag.service import RagService
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class CollaboratorService:

    def __init__(
        self,
        user_crud: UserCRUD,
        collaborator_crud: CollaboratorCRUD,
        email_service: EmailService,
        rag_service: RagService,
    ):
        self.user_crud = user_crud
        self.collaborator_crud = collaborator_crud
        self.email_service = email_service
        self.rag_service = rag_service

    async def create_collaborator_invite(
        self, inviter_id: str, invite_data: CollaboratorInviteRequest
    ) -> Collaborator:
        """
        Create a collaborator invite by first creating a user

        :param inviter_id: ID of the user creating the invite
        :param invite_data: Invite request details
        :return: Created CollaboratorInvite instance
        """
        # Check if inviter exists
        inviter = await User.get(inviter_id)
        if not inviter:
            raise ValueError("Inviter user not found")

        # Check if user with this email already exists
        existing_user = await User.find_one(User.email == invite_data.email)

        # If user doesn't exist, create a basic user entry
        if not existing_user:
            existing_user = User(
                email=invite_data.email,
                is_collaborator=True,
                is_email_verified=False,
                disabled=False,
            )
            await existing_user.save()

        # Check maximum collaborators
        existing_invites = await Collaborator.find(
            Collaborator.inviter_id == inviter_id,
            Collaborator.status == "pending",
        ).to_list()

        if len(existing_invites) >= settings.MAX_COLLABORATORS_PER_USER:
            raise MaxCollaboratorInvitesError(settings.MAX_COLLABORATORS_PER_USER)

        # Check for existing pending invite
        existing_invite = await Collaborator.find_one(
            Collaborator.inviter_id == inviter_id,
            Collaborator.invitee_id == str(existing_user.id),
            Collaborator.status == "pending",
        )

        if existing_invite:
            raise DuplicateCollaboratorInviteError(
                f"A invite already exists for {invite_data.email}, kindly verify the email."
            )

        # Generate invitation token
        invitation_token = generate_verification_token(
            "collaborate", invite_data.email, timedelta(hours=24)
        )

        # Create new invite
        invite = Collaborator(
            inviter_id=str(inviter_id),
            invitee_id=str(existing_user.id),
            invitation_token=invitation_token,
        )

        await invite.save()

        # Send invitation email
        registration_link = (
            f"{settings.WEB_URL}/collaborate/register"
            f"?token={invitation_token}"
            f"&email={existing_user.email}"
        )
        email_sent = await self.email_service.send_collaborator_invite_email(
            to_email=existing_user.email,
            inviter_name=inviter.full_name or inviter.email,
            registration_link=registration_link,
        )

        if not email_sent:
            raise EmailDeliveryError(
                f"Failed to send invite to {existing_user.email}, please check the email or try again later"
            )
        return invite

    async def complete_registration(
        self, registration_data: CollaboratorRegistrationRequest
    ) -> User:
        """
        Complete registration for an invited collaborator with enhanced security checks

        :param registration_data: Registration details
        :return: Updated User instance or error message
        """
        # Check if user exists by email
        existing_user = await self.user_crud.get_user_by_email(registration_data.email)

        # If user doesn't exist, return early
        if not existing_user:
            raise ValueError("Collaborator could not be found")

        # Check if user is disabled
        if existing_user.disabled:
            raise AccountDisabledError(
                admin_email=settings.ADMIN_EMAIL,
                message="Please contact system administration to activate your account",
            )

        # Verify token with email (double security check)
        token_details = verify_token(
            registration_data.token, "collaborate", registration_data.email
        )

        if not token_details:
            raise ValueError("Invalid or expired token")

        # Find and validate invite with both token and email
        invite = await Collaborator.find_one(
            Collaborator.invitation_token == registration_data.token,
            Collaborator.invitee_id == str(existing_user.id),
        )

        # Validate invite
        if not invite:
            raise ValueError("Invalid invitation token or email")

        # Check if invite is already completed
        if invite.status == "accepted":
            raise DuplicateCollaboratorInviteError(
                message="You are already in the system. If you forgot your password, use the forgot password link to reset."
            )

        # Check invite expiration
        if Collaborator.is_invite_expired(invite):
            invite.status = "rejected"
            await invite.save()
            raise ValueError("Invitation has expired")

        # Ensure invite is still pending
        if invite.status != "pending":
            raise DuplicateCollaboratorInviteError(
                message="This invitation has already been processed. If you need access, contact the inviter."
            )

        # Update user details
        existing_user.full_name = registration_data.name
        existing_user.user_type = registration_data.user_type
        existing_user.hashed_password = get_password_hash(registration_data.password)
        existing_user.is_email_verified = True
        existing_user.is_collaborator = True

        # Save updated user
        await existing_user.save()

        # Update invite status
        invite.status = "accepted"
        await invite.save()

        return existing_user

    async def get_collaborator_invites(
        self, user_id: str, status: Optional[str] = None
    ) -> CollaboratorResponse:
        """
        Retrieve collaborator invites for a user

        :param user_id: ID of the user
        :param status: Optional status filter
        :return: List of collaborator invites with additional details
        """
        # Query for invites where user is either inviter or invitee
        query = {"$or": [{"inviter_id": user_id}, {"invitee_id": user_id}]}

        if status:
            query["status"] = status

        invites = await Collaborator.find(query).to_list()

        # Fetch collaborator details
        collaborator_details = []
        for invite in invites:
            # Determine collaborator email based on user's role in invite
            if str(invite.inviter_id) == user_id:
                # User is inviter, so collaborator is the invitee
                collaborator = await User.get(invite.invitee_id)
            else:
                # User is invitee, so collaborator is the inviter
                collaborator = await User.get(invite.inviter_id)

            collaborator_details.append(
                CollaboratorResponse(
                    id=str(invite.id),
                    inviter_id=str(invite.inviter_id),
                    collaborator_email=collaborator.email,
                    invitee_id=invite.invitee_id,
                    status=invite.status,
                    invited_at=invite.invited_at,
                    expires_at=invite.expires_at,
                )
            )

        return collaborator_details

    async def delete_collaborator_invite(self, invite_id: str, current_user_id: str):
        """
        Delete a collaborator invite

        :param invite_id: ID of the invite to delete
        :param current_user_id: ID of the user attempting to delete
        """
        invite = await Collaborator.get(invite_id)

        if not invite:
            raise ValueError("Invite not found")

        if str(invite.inviter_id) != current_user_id:
            raise ValueError("Unauthorized to delete this invite")

    async def update_document_collaborator(
        self, invite_requests: List[DocumentAccessCreate], user_id: str
    ) -> List[DocumentAccessResponse]:

        add_document_user_ids = []
        remove_document_user_ids = []
        document_access_response = []
        for invite_request in invite_requests:
            print("===========invite request==============")
            print(invite_request)
            # Create collaborator record
            collaborator = (
                await self.collaborator_crud.update_document_access_to_collaborator(
                    invite_request.collaborator_id,
                    invite_request.document_id,
                    invite_request.auth_role,
                )
            )

            for access in collaborator.document_access:
                document_id = access.document_id
                auth_role = access.auth_role
                if document_id == invite_request.document_id:
                    # Determine collaborator email based on user's role in invite
                    if str(collaborator.inviter_id) == user_id:
                        # User is inviter, so collaborator is the invitee
                        user = await User.get(collaborator.invitee_id)
                    else:
                        # User is invitee, so collaborator is the inviter
                        user = await User.get(collaborator.inviter_id)
                    print("authrole==============")
                    print(auth_role)
                    if auth_role != DocumentAccessEnum.NONE:
                        # Send invitation email
                        # await self.email_service.send_collaboration_invite(
                        #     to_email=user.email,
                        #     document_name=invite_request.document_id,
                        #     auth_role=invite_request.auth_role,
                        # )
                        add_document_user_ids.append(str(user.id))
                        document_access_response.append(
                            DocumentAccessResponse(
                                document_id=document_id,
                                auth_role=auth_role,
                                message="Document is successfully shared !",
                            )
                        )
                    else:
                        remove_document_user_ids.append(str(user.id))

                        document_access_response.append(
                            DocumentAccessResponse(
                                document_id=document_id,
                                auth_role=auth_role,
                                message="Document is successfully removed !",
                            )
                        )

        await self.rag_service.update_document_access(
            doc_id=invite_request.document_id,
            add_user_ids=add_document_user_ids,
            remove_user_ids=remove_document_user_ids,
        )
        logger.debug(
            f"user_ids {add_document_user_ids} ADDED and user_ids {remove_document_user_ids} REMOVED to access file_id {invite_request.document_id}"
        )

        return document_access_response

    async def get_document_collaborators(
        self, document_id: str, user_id: str
    ) -> List[CollaboratorResponse]:
        available_collaborators = (
            await self.collaborator_crud.get_document_collaborators(
                document_id, user_id
            )
        )

        document_collaborators = []
        for collaborator in available_collaborators:
            # Determine collaborator email based on user's role in invite
            if str(collaborator.inviter_id) == user_id:
                # User is inviter, so collaborator is the invitee
                user = await User.get(collaborator.invitee_id)
            else:
                # User is invitee, so collaborator is the inviter
                user = await User.get(collaborator.inviter_id)
            # Find auth role for this document
            auth_role = DocumentAccessEnum.NONE
            for access in collaborator.document_access:
                if str(access.document_id) == document_id:
                    auth_role = access.auth_role
                    break

            document_collaborators.append(
                CollaboratorResponse(
                    id=str(collaborator.id),
                    inviter_id=str(collaborator.inviter_id),
                    collaborator_email=user.email,
                    invitee_id=collaborator.invitee_id,
                    status=collaborator.status,
                    invited_at=collaborator.invited_at,
                    expires_at=collaborator.expires_at,
                    auth_role=auth_role,
                )
            )

        return document_collaborators

    async def remove_document_collaborator(
        self, remove_request: DocumentAccessRemove, user_id: str
    ) -> None:
        return await self.collaborator_crud.remove_document_access(
            remove_request.collaborator_ids, remove_request.document_id
        )

    # def update_collaborator_role(
    #     self, collaborator_id: str, update_request: CollaboratorUpdateRequest
    # ) -> DocumentAccessResponse:
    #     updated_collaborator = self.collaborator_crud.update_collaborator_role(
    #         self.db, collaborator_id, update_request.auth_role
    #     )

    #     return DocumentAccessResponse.from_orm(updated_collaborator)

    # def accept_invitation(
    #     self, collaborator_id: str, user_id: str
    # ) -> DocumentAccessResponse:
    #     accepted_collaborator = self.collaborator_crud.accept_invitation(
    #         self.db, collaborator_id, user_id
    #     )

    #     return DocumentAccessResponse.from_orm(accepted_collaborator)
