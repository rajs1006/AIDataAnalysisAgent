# app/services/auth_service.py
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from typing import Optional, Tuple
from app.core.security.auth import (
    create_access_token,
    verify_password,
)
from app.models.schema.user import UserCreate, TokenValidationResponse, Token
from app.crud.user import UserCRUD
from app.models.database.users import User
from app.models.schema.connectors.onedrive import (
    OAuthCallbackRequest,
)
from app.core.security.auth import create_api_key
import logging

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, user_crud: UserCRUD):
        self.user_crud = user_crud

    async def register_user(self, user_data: UserCreate) -> Tuple[dict, User]:
        """Handle user registration logic"""
        # Validate if user exists
        if await self.user_crud.get_by_email(user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists",
            )

        # Validate password strength
        self._validate_password(user_data.password)

        # Create user
        user = await self.user_crud.create(user_data)
        return "Registration successful", user

    async def authenticate_user(self, email: str, password: str) -> Tuple[str, str]:
        """Authenticate user and return access token"""
        user = await self.user_crud.get_by_email(email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No active account found with this email",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
                headers={"WWW-Authenticate": "Bearer"},
            )

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

    async def create_api_token(self, user: User) -> Token:
        """Validate token and return validation response"""
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No active account found with this email",
                headers={"WWW-Authenticate": "Bearer"},
            )

        api_key = create_api_key(str(user.id))

        user.api_keys.append(api_key)
        try:
            await user.save_changes()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update user data {str(e)}",
            )

        return Token(access_token=api_key, token_type="api_key")

    @staticmethod
    def _validate_password(password: str) -> None:
        """Validate password strength"""
        if len(password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long",
            )

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
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid OAuth token data: {str(ve)}",
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid OAuth token data: {str(e)}",
                )
            try:
                await user.save_changes()
            except Exception as e:
                # logger.error(f"Database update failed for user {user_id}: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to update user data {str(e)}",
                )
            return "OAuth update successful", user

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"OAuth callback failed for user {user.email}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal server error during OAuth callback processing {str(e)}",
            )
