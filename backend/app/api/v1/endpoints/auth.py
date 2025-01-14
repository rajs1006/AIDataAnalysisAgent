from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.dependencies.auth import get_current_user, get_current_user_api
from app.models.schema.user import (
    UserCreate,
    UserResponse,
    Token,
    RegistrationResponse,
    TokenValidationResponse,
)
from app.services.auth.service import AuthService
from app.models.database.users import User
from app.core.dependencies import get_auth_service
from app.models.schema.connectors.onedrive import (
    OAuthCallbackRequest,
)

router = APIRouter()


@router.post("/register", response_model=RegistrationResponse)
async def register(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        message, user = await auth_service.register_user(user_data)
        return {"message": message, "user": user}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during registration",
        )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        access_token, token_type = await auth_service.authenticate_user(
            form_data.username, form_data.password
        )
        return {"access_token": access_token, "token_type": token_type}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login",
        )


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/refresh", response_model=TokenValidationResponse)
async def validate_token(
    current_user: User = Depends(get_current_user_api),
    auth_service: AuthService = Depends(get_auth_service),
):
    return await auth_service.validate_token(current_user)


@router.post("/api", response_model=Token)
async def validate_token(
    current_user: User = Depends(get_current_user_api),
    auth_service: AuthService = Depends(get_auth_service),
):
    return await auth_service.validate_token(current_user)


@router.post("/oauth/callback")
async def oauth_callback(
    callback_data: OAuthCallbackRequest,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Handle OAuth callback from Microsoft"""
    try:
        return await auth_service.handle_oauth_callback(current_user, callback_data)
    except Exception as e:
        # logger.error(f"OAuth callback failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth callback failed: {str(e)}",
        )
