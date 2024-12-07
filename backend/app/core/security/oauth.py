from datetime import datetime, timedelta
import aiohttp
from fastapi import HTTPException
from typing import Dict, Any
import logging
from urllib.parse import urlencode

from app.core.config import settings
from app.models.schema.connectors.onedrive import OneDriveAuth

logger = logging.getLogger(__name__)


class OneDriveOAuth:
    """Handle OneDrive OAuth flow"""

    TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
    SCOPE = "Files.Read.All offline_access"

    def __init__(self, redirect_uri: str):
        self.client_id = settings.ONEDRIVE_CLIENT_ID
        self.client_secret = settings.ONEDRIVE_CLIENT_SECRET
        self.redirect_uri = redirect_uri

    def get_authorization_url(self) -> str:
        """Generate OAuth authorization URL"""
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "scope": self.SCOPE,
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    async def exchange_code_for_tokens(
        self, code: str, code_verifier: str
    ) -> OneDriveAuth:
        """Exchange authorization code for tokens using PKCE"""
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "code_verifier": code_verifier,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                    "scope": self.SCOPE,
                }
                headers = {"Content-Type": "application/x-www-form-urlencoded"}

                async with session.post(
                    self.TOKEN_URL, data=data, headers=headers
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"Failed to get access token: {error_text}",
                        )

                    data = await response.json()
                    return OneDriveAuth(
                        access_token=data["access_token"],
                        refresh_token=data["refresh_token"],
                        token_expiry=datetime.utcnow()
                        + timedelta(seconds=data["expires_in"]),
                        scope=data["scope"].split(" "),
                    )

        except Exception as e:
            logger.error(f"Token exchange failed: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Failed to exchange code for tokens: {str(e)}"
            )

    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh expired access token"""
        try:
            async with aiohttp.ClientSession() as session:
                data = {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                    "scope": self.SCOPE,
                }
                headers = {"Content-Type": "application/x-www-form-urlencoded"}

                async with session.post(
                    self.TOKEN_URL, data=data, headers=headers
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"Failed to refresh token: {error_text}",
                        )

                    return await response.json()

        except Exception as e:
            logger.error(f"Token refresh failed: {str(e)}")
            raise HTTPException(
                status_code=500, detail=f"Failed to refresh token: {str(e)}"
            )
