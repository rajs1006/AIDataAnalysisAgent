from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from jose import JWTError, jwt
from app.core.config.config import settings
from app.core.security.auth import (
    create_access_token,
    get_password_hash,
    verify_password,
    get_current_user,
)
from app.models.schema.user import UserCreate, UserResponse, Token, RegistrationResponse
from app.models.database.users import User
from app.core.dependencies import get_user_crud
from app.models.schema.connectors.onedrive import (
    OAuthCallbackRequest,
)

router = APIRouter()


@router.post("/register", response_model=RegistrationResponse)
async def register(user_data: UserCreate):
    try:
        # Check if user exists with more specific error message
        existing_user = await User.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email already exists",
            )

        # Validate password strength
        if len(user_data.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters long",
            )

        # Create new user
        user = User(
            email=user_data.email,
            hashed_password=get_password_hash(user_data.password),
            full_name=user_data.full_name,
        )
        await user.insert()

        return {"message": "Registration successful", "user": user}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during registration",
        )


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        user = await User.find_one({"email": form_data.username})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No account found with this email",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = create_access_token(str(user.id))
        return {"access_token": access_token, "token_type": "bearer"}

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
    user_crud: UserCRUD = Depends(get_user_crud),
):
    auth_service = AuthService(user_crud)
    return await auth_service.validate_token(current_user)


@router.post("/oauth/callback")
async def oauth_callback(
    callback_data: OAuthCallbackRequest,
    current_user: User = Depends(get_current_user),
    user_crud: UserCRUD = Depends(get_user_crud),
):
    """Handle OAuth callback from Microsoft"""
    try:
        auth_service = AuthService(user_crud)
        return await auth_service.handle_oauth_callback(current_user, callback_data)
    except Exception as e:
        # logger.error(f"OAuth callback failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth callback failed: {str(e)}",
        )
