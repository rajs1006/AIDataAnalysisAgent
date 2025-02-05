from app.core.logging_config import get_logger
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from app.core.config.config import settings
from app.core.security.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    verify_token,
    generate_verification_token,
)
from app.models.database.users import User
from app.models.schema.user import (
    UserRegistrationRequest,
    UserVerificationRequest,
    ForgotPasswordRequest,
)
from app.services.email.smtp import send_verification_email
from app.crud.user import UserCRUD
from typing import Optional, Tuple
from app.models.schema.user import TokenValidationResponse
from app.models.schema.connectors.onedrive import (
    OAuthCallbackRequest,
)
from app.core.exceptions.auth_exceptions import (
    AuthenticationError,
    TokenError,
    EmailDeliveryError,
    OAuthError,
    AccountDisabledError,
)

logger = get_logger(__name__)


class AuthService:
    def __init__(self, user_crud: UserCRUD):
        self.user_crud = user_crud

    async def register_user(
        self, registration_data: UserRegistrationRequest
    ) -> Dict[str, Any]:
        """
        Register a new user with enhanced flow:
        1. If user not in system, create and send verification email
        2. If user exists and not verified, resend verification email
        3. If user exists and disabled, ask to contact administration
        4. Handle email sending failures

        :param registration_data: User registration details
        :return: Registration response
        """
        # Check if user already exists
        existing_user = await self.user_crud.get_user_by_email(registration_data.email)

        if existing_user:
            # If user exists but is disabled
            if existing_user.disabled:
                raise AccountDisabledError(
                    admin_email=settings.ADMIN_EMAIL,
                    message="Please contact system administration to activate your account",
                )

            # If user exists and not verified, regenerate verification token
            verification_token = generate_verification_token(
                "registration", registration_data.email, timedelta(hours=24)
            )

            # Attempt to send verification email
            try:
                verification_link = (
                    f"{settings.WEB_URL}/auth/verify"
                    f"?token={verification_token}"
                    f"&email={existing_user.email}"
                    f"&type=registration"
                )
                email_sent = send_verification_email(
                    existing_user.email,
                    verification_link,
                    "registration",
                )
            except Exception:
                email_sent = False

            # If email sending fails
            if not email_sent:
                raise EmailDeliveryError(
                    "Failed to send verification email. Please try again later."
                )

            # Update user with new verification token
            existing_user.verification_token = verification_token
            await self.user_crud.update(existing_user)

            return {"message": "Verification email resent"}

        # Create new user if not exists
        new_user = User(
            email=registration_data.email,
            full_name=registration_data.name,
            user_type=registration_data.userType,
            is_email_verified=False,
            disabled=False,
        )

        # Save user
        await self.user_crud.create(new_user)

        # Generate verification token
        verification_token = generate_verification_token(
            "registration", registration_data.email, timedelta(hours=24)
        )

        # Update user with verification token
        new_user.verification_token = verification_token
        await self.user_crud.update(new_user)

        # Send verification email
        try:
            verification_link = (
                f"{settings.WEB_URL}/auth/verify"
                f"?token={verification_token}"
                f"&email={new_user.email}"
                f"&type=registration"
            )
            email_sent = send_verification_email(
                new_user.email,
                verification_link,
                "registration",
            )
        except Exception:
            email_sent = False

        # If email sending fails
        if not email_sent:
            raise EmailDeliveryError(
                "Failed to send verification email. Please try again later."
            )

        return {"message": "Registration link sent"}

    async def verify_user(
        self, verification_data: UserVerificationRequest
    ) -> Dict[str, Any]:
        """
        Verify user email or reset password with enhanced security

        :param verification_data: Verification details
        :return: Verification response
        """
        # Validate that both token and email are provided
        if not verification_data.token or not verification_data.email:
            raise TokenError("Both token and email are required for verification")

        # Find user by email first
        user = await self.user_crud.get_user_by_email(verification_data.email)

        if not user:
            raise TokenError("User not found")

        # Determine the correct token field based on verification type
        token_field = (
            "verification_token"
            if verification_data.type == "registration"
            else "reset_password_token"
        )

        # Check if the token matches the stored token for this user
        stored_token = getattr(user, token_field, None)
        if not stored_token or stored_token != verification_data.token:
            raise TokenError("Invalid token for this user")

        # Verify token with email (double security check)
        token_details = verify_token(
            verification_data.token, verification_data.type, verification_data.email
        )

        if not token_details:
            raise TokenError("Invalid or expired token")

        # Prepare update data
        if verification_data.type == "registration":
            user.is_email_verified = True
            user.verification_token_used = True
            user.hashed_password = get_password_hash(verification_data.password)
            user.disabled = False
        else:
            user.hashed_password = get_password_hash(verification_data.password)
            user.reset_password_token_used = True

        # Update user
        updated_user = await self.user_crud.update(user)

        return {
            "id": str(updated_user.id),
            "email": updated_user.email,
            "isEmailVerified": updated_user.is_email_verified,
            "message": "Verification successful",
        }

    async def forgot_password(
        self, forgot_password_data: ForgotPasswordRequest
    ) -> Dict[str, str]:
        """
        Initiate password reset process

        :param forgot_password_data: Forgot password request details
        :return: Password reset response
        """
        # Find user by email
        user = await self.user_crud.get_enabled_user_by_email(
            forgot_password_data.email
        )

        if not user:
            raise TokenError("Email not found")

        # Generate reset password token
        reset_token = generate_verification_token(
            "reset-password", forgot_password_data.email, timedelta(hours=24)
        )

        # Update user with reset token
        user.reset_password_token = reset_token
        user.reset_password_token_expires_at = datetime.utcnow() + timedelta(hours=24)
        user.reset_password_token_used = False
        await self.user_crud.update(user)

        # Send reset password email with token and email
        verification_link = (
            f"{settings.WEB_URL}/auth/verify"
            f"?token={reset_token}"
            f"&email={user.email}"
            f"&type=reset-password"
        )
        email_sent = send_verification_email(
            user.email,
            verification_link,
            "reset-password",
        )

        if not email_sent:
            raise EmailDeliveryError("Failed to send password reset email")

        return {"message": "Password reset link sent"}

    async def authenticate_user(self, email: str, password: str) -> Tuple[str, str]:
        """Authenticate user and return access token"""
        user = await self.user_crud.get_enabled_user_by_email(email)
        if not user:
            raise AuthenticationError("No active account found with this email")
        
        if not verify_password(password, user.hashed_password):
            raise AuthenticationError("Incorrect password")

        access_token = create_access_token(str(user.id))
        return access_token, "bearer"

    async def validate_token(self, user: Optional[User]) -> TokenValidationResponse:
        """Validate token and return validation response"""
        if not user:
            return self._create_invalid_token_response()

        if user.disabled:
            return self._create_invalid_token_response()

        return TokenValidationResponse(
            valid=True,
            access_token=None,
            expiry_time=datetime.now() + timedelta(days=30),
        )

    @staticmethod
    def _validate_password(password: str) -> None:
        """Validate password strength"""
        if len(password) < 6:
            raise AuthenticationError("Password must be at least 6 characters long")

    @staticmethod
    def _create_invalid_token_response() -> TokenValidationResponse:
        """Create response for invalid token"""
        return TokenValidationResponse(
            valid=False,
            access_token=None,
            expiry_time=datetime.now() + timedelta(minutes=15),
        )

    async def handle_oauth_callback(
        self, user: User, callback_data: OAuthCallbackRequest
    ):
        """Handle OAuth callback after authorization"""
        try:
            try:
                user.onedriveOauth = callback_data.token
            except ValueError as ve:
                raise OAuthError(f"Invalid OAuth token data: {str(ve)}")
            except Exception as e:
                raise OAuthError(f"Invalid OAuth token data: {str(e)}")

            try:
                await user.save_changes()
            except Exception as e:
                # logger.error(f"Database update failed for user {user_id}: {str(e)}")
                raise OAuthError(f"Failed to update user data {str(e)}")

            return "OAuth update successful", user

        except OAuthError:
            raise
        except Exception as e:
            logger.error(f"OAuth callback failed for user {user.email}: {str(e)}")
            raise OAuthError(
                f"Internal server error during OAuth callback processing {str(e)}"
            )
