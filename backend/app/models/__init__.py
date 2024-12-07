# app/models/__init__.py

from app.models.database.users import User
from app.models.database.connectors.folder import FolderConnector
from app.models.database.connectors.onedrive import OneDriveConnector
from app.models.database.connectors import BaseConnector

# Import any other models here

# List of all document models to be registered with Beanie
document_models = [
    User,
    BaseConnector,
    FolderConnector,
    OneDriveConnector,
    # Add other models here
]
