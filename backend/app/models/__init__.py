# app/models/__init__.py

from app.models.database.users import User
from app.models.database.connectors.folder import FolderConnector
from app.models.database.connectors.onedrive import OneDriveConnector
from app.models.database.connectors.connector import Connectors
from app.models.database.conversation import Conversation, Message
from app.models.database.context.image import ImageContext
from app.models.database.billing import ModelPricing

# Import any other models here

# List of all document models to be registered with Beanie
document_models = [
    User,
    Connectors,
    FolderConnector,
    OneDriveConnector,
    ImageContext,
    Conversation,
    Message,
    ModelPricing,
    # Add other models here
]
