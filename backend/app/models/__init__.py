# app/models/__init__.py

from app.models.database.users import User
from app.models.database.connectors.folder import FolderConnector
from app.models.database.connectors.onedrive import OneDriveConnector
from app.models.database.connectors.connector import Connector, FileDocument
from app.models.database.conversation import Conversation, Message
from app.models.database.context.image import ImageContext
from app.models.database.billing import ModelPricing
from app.models.database.collaborators import Collaborator, DocumentAccess  # New import
from app.models.database.email import EmailLog

# List of all document models to be registered with Beanie
document_models = [
    User,
    Connector,
    FileDocument,
    FolderConnector,
    OneDriveConnector,
    ImageContext,
    Conversation,
    Message,
    ModelPricing,
    Collaborator,  # Add CollaboratorInvite to document models
    DocumentAccess,
    EmailLog,
]
