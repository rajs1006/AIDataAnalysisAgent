from app.crud.onedrive import OneDriveCRUD
from app.core.security.oauth import OneDriveOAuth


async def get_onedrive_oauth() -> OneDriveOAuth:
    """Get OneDriveOAuth instance."""
    return OneDriveOAuth()
