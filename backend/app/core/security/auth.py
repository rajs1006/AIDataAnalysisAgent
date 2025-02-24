from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import jwt
from passlib.context import CryptContext
from app.core.config.config import settings
from datetime import timedelta
from fastapi.security import OAuth2PasswordBearer
import secrets

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def generate_verification_token(purpose: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a secure, single-use verification token for registration or password reset.
    
    :param purpose: 'registration' or 'reset-password'
    :param email: Email address associated with the token
    :param expires_delta: Optional expiration time (defaults to 24 hours)
    :return: Cryptographically secure token
    """
    # Generate a cryptographically secure token
    token = secrets.token_urlsafe(32)
    
    # Set expiration
    if expires_delta is None:
        expires_delta = timedelta(hours=24)
    
    # Create a payload with the token, purpose, email, and expiration
    expire = datetime.utcnow() + expires_delta
    to_encode = {
        "sub": token,
        "purpose": purpose,
        "email": email,
        "exp": expire
    }
    
    # Encode the token with a secret key
    encoded_token = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    
    return encoded_token


def verify_token(token: str, expected_purpose: str, expected_email: Optional[str] = None) -> Optional[Dict[str, str]]:
    """
    Verify a token's validity, purpose, and optionally email.
    
    :param token: Token to verify
    :param expected_purpose: Expected purpose of the token ('registration' or 'reset-password')
    :param expected_email: Optional email to verify against the token
    :return: Dictionary with token details if valid, None otherwise
    """
    try:
        # Decode the token
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        # Check purpose
        if payload.get("purpose") != expected_purpose:
            return None
        
        # Check email if provided
        if expected_email and payload.get("email") != expected_email:
            return None
        
        # Token is valid, return token details
        return {
            "sub": payload.get("sub"),
            "email": payload.get("email")
        }
    except jwt.ExpiredSignatureError:
        # Token has expired
        return None
    except jwt.JWTError:
        # Invalid token
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {"exp": expire, "sub": subject}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def create_api_key(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.API_KEY_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": subject}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.API_ALGORITHM
    )
    return encoded_jwt
