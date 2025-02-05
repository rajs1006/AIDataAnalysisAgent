from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.dependencies.auth import get_current_user
from app.models.database.users import User
from app.models.schema.user import (
    UserRegistrationRequest,
    UserRegistrationResponse,
    UserVerificationRequest,
    UserVerificationResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
)
from app.services.auth.service import AuthService
from app.core.dependencies.service import get_auth_service

from app.core.dependencies.auth import get_current_user, get_current_user_api
from app.models.schema.user import (
    UserResponse,
    Token,
    TokenValidationResponse,
)
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

router = APIRouter()


@router.post("/register", response_model=UserRegistrationResponse)
async def register_user(
    registration_data: UserRegistrationRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserRegistrationResponse:
    """
    Register a new user

    :param registration_data: User registration details
    :return: Registration response
    """
    try:
        response = await auth_service.register_user(registration_data)
        return UserRegistrationResponse(**response)
    except AccountDisabledError as e:
        raise HTTPException(
            status_code=e.status_code, 
            detail={
                "code": e.error_code, 
                "message": str(e),
                "admin_email": getattr(e, 'admin_email', None)
            }
        )
    except EmailDeliveryError as e:
        raise HTTPException(
            status_code=e.status_code, 
            detail={
                "code": e.error_code,
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )


@router.post("/verify", response_model=UserVerificationResponse)
async def verify_user(
    verification_data: UserVerificationRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserVerificationResponse:
    """
    Verify user email or reset password

    :param verification_data: Verification details
    :return: Verification response
    """
    try:
        response = await auth_service.verify_user(verification_data)
        return UserVerificationResponse(**response)
    except TokenError as e:
        raise HTTPException(
            status_code=e.status_code, 
            detail={
                "code": e.error_code,
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
        )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    forgot_password_data: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> ForgotPasswordResponse:
    """
    Initiate password reset process

    :param forgot_password_data: Forgot password request details
    :return: Password reset response
    """
    try:
        response = await auth_service.forgot_password(forgot_password_data)
        return ForgotPasswordResponse(**response)
    except TokenError as e:
        raise HTTPException(
            status_code=e.status_code, 
            detail={
                "code": e.error_code,
                "message": str(e)
            }
        )
    except EmailDeliveryError as e:
        raise HTTPException(
            status_code=e.status_code, 
            detail={
                "code": e.error_code,
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=str(e)
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
    except AuthenticationError as e:
        raise HTTPException(
            status_code=e.status_code, 
            detail={
                "code": e.error_code,
                "message": str(e)
            }
        )
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
    except OAuthError as e:
        raise HTTPException(
            status_code=e.status_code, 
            detail={
                "code": e.error_code,
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth callback failed: {str(e)}",
        )
