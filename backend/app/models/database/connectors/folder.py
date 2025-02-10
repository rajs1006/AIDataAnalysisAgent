from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from app.models.schema.base.connector import ConnectorTypeEnum
from app.models.schema.connectors.folder import FileMetadata
from .connector import Connector


class FolderConnector(Connector):
    connector_type: ConnectorTypeEnum = ConnectorTypeEnum.LOCAL_FOLDER
