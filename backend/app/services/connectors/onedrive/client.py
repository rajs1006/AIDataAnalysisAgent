from app.core.logging_config import get_logger
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import aiohttp
from fastapi import HTTPException
import tempfile
from pathlib import Path
import os

from app.core.config import settings
from app.models.schema.connectors.onedrive import (
    OneDriveAuth,
    OneDriveFileMetadata,
)
from app.models.schema.base.connector import FileStatusEnum
from app.core.security.oauth import OneDriveOAuth
from app.core.files.processor import DocumentProcessor


logger = get_logger(__name__)


class OneDriveClient:
    """Microsoft Graph API client for OneDrive operations"""

    def __init__(self, auth: OneDriveAuth):
        self.auth = auth
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.session = None
        self.oauth_handler = OneDriveOAuth(settings.ONEDRIVE_REDIRECT_URI)

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def _refresh_token(self) -> None:
        """Refresh OAuth token if expired"""
        if datetime.utcnow() >= self.auth.token_expiry - timedelta(minutes=5):
            try:
                data = await self.oauth_handler.refresh_access_token(
                    self.auth.refresh_token
                )
                self.auth.access_token = data["access_token"]
                self.auth.refresh_token = data["refresh_token"]
                self.auth.token_expiry = datetime.utcnow() + timedelta(
                    seconds=data["expires_in"]
                )

            except Exception as e:
                logger.error(
                    "Token refresh failed: {str(e)}",
                )
                raise HTTPException(
                    status_code=401, detail="Authentication failed during token refresh"
                )

    async def _make_request(
        self, method: str, endpoint: str, **kwargs
    ) -> Dict[str, Any]:
        """Make authenticated request to Microsoft Graph API"""
        await self._refresh_token()

        if not self.session:
            self.session = aiohttp.ClientSession()

        headers = {
            "Authorization": f"Bearer {self.auth.access_token}",
            "Content-Type": "application/json",
        }

        try:
            async with self.session.request(
                method,
                f"{self.base_url}{endpoint}",
                headers=headers,
                **kwargs,
            ) as response:
                if response.status == 401:
                    await self._refresh_token()
                    return await self._make_request(method, endpoint, **kwargs)

                if response.status not in (200, 201, 204):
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"OneDrive API error: {error_text}",
                    )

                if response.status == 204:
                    return {}

                return await response.json()

        except Exception as e:
            logger.error(
                "OneDrive API request failed: {str(e)}",
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to communicate with OneDrive: {str(e)}",
            )

    async def list_folder_contents(
        self, drive_id: str, folder_id: str, recursive: bool = True
    ) -> List[Dict[str, Any]]:
        """List contents of a folder"""
        items = []
        next_link = f"/drives/{drive_id}/items/{folder_id}/children"

        while next_link:
            data = await self._make_request("GET", next_link)
            items.extend(data.get("value", []))
            next_link = data.get("@odata.nextLink", "").replace(self.base_url, "")

            if recursive:
                for item in data.get("value", []):
                    if item.get("folder"):
                        sub_items = await self.list_folder_contents(
                            drive_id, item["id"], recursive=True
                        )
                        items.extend(sub_items)

        return items

    async def get_file_content(self, drive_id: str, file_id: str) -> str:
        """Extract text content from OneDrive files using DocumentProcessor"""
        try:
            # Get file metadata
            file_info = await self._make_request(
                "GET", f"/drives/{drive_id}/items/{file_id}"
            )

            # Download file content
            async with self.session.get(
                f"{self.base_url}/drives/{drive_id}/items/{file_id}/content",
                headers={"Authorization": f"Bearer {self.auth.access_token}"},
            ) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=response.status, detail="Download failed"
                    )
                content_bytes = await response.read()

            # Save to temporary file for DocumentProcessor
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=Path(file_info["name"]).suffix
            ) as temp_file:
                temp_file.write(content_bytes)
                temp_path = temp_file.name

            try:
                # Process with DocumentProcessor
                processor = DocumentProcessor()
                result = await processor.process_file(temp_path)

                if result.error:
                    raise HTTPException(status_code=500, detail=result.error)

                return result.content

            finally:
                # Clean up temp file
                os.unlink(temp_path)

        except Exception as e:
            logger.error(
                "File content extraction failed: {str(e)}",
            )
            raise HTTPException(status_code=500, detail=str(e))

    async def create_subscription(
        self, drive_id: str, folder_id: str, notification_url: str
    ) -> Dict[str, Any]:
        """Create change notification subscription"""
        payload = {
            "changeType": "created,updated,deleted",
            "notificationUrl": notification_url,
            "resource": f"/drives/{drive_id}/items/{folder_id}",
            "expirationDateTime": (datetime.utcnow() + timedelta(days=2)).isoformat()
            + "Z",
            "clientState": "OneDriveConnectorSubscription",
        }

        return await self._make_request("POST", "/subscriptions", json=payload)

    async def renew_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Renew an existing subscription"""
        payload = {
            "expirationDateTime": (datetime.utcnow() + timedelta(days=2)).isoformat()
            + "Z"
        }

        return await self._make_request(
            "PATCH", f"/subscriptions/{subscription_id}", json=payload
        )

    async def delete_subscription(self, subscription_id: str) -> None:
        """Delete a subscription"""
        await self._make_request("DELETE", f"/subscriptions/{subscription_id}")

    async def get_drive_info(self) -> Dict[str, Any]:
        """Get current user's drive information"""
        return await self._make_request("GET", "/me/drive")

    async def convert_to_file_metadata(
        self, item: Dict[str, Any]
    ) -> OneDriveFileMetadata:
        """Convert OneDrive item to FileMetadata"""
        return OneDriveFileMetadata(
            file_id=item["id"],
            filename=item["name"],
            extension=Path(item["name"]).suffix,
            file_path=item.get("parentReference", {}).get("path", ""),
            drive_id=item["parentReference"]["driveId"],
            size=item.get("size", 0),
            last_modified=int(
                datetime.fromisoformat(
                    item["createdDateTime"].replace("Z", "")
                ).timestamp()
            ),
            created_at=int(
                datetime.fromisoformat(
                    item["createdDateTime"].replace("Z", "")
                ).timestamp()
            ),
            content_hash=item.get("file", {}).get("hashes", {}).get("sha1Hash", ""),
            web_url=item["webUrl"],
            status=FileStatusEnum.PROCESSING,
        )
