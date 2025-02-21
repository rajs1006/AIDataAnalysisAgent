from enum import Enum


class DocumentAccessEnum(str, Enum):
    READ = "read"
    COMMENT = "comment"
    UPDATE = "update"
    CREATE = "create"
    NONE = "none"


class InviteStatusEnum(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class UserTypeEnum(str, Enum):
    BUSINESS = "business"
    INDIVIDUAL = "individual"


class ConnectorTypeEnum(str, Enum):
    LOCAL_FOLDER = "local_folder"
    ONEDRIVE = "onedrive"
    GOOGLE_DRIVE = "google_drive"
    S3 = "s3"
    IMAGE = "image"


class ConnectorStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


class ExtensionEnum(str, Enum):
    EXT = [".pdf", ".doc", ".docx", ".txt", ".csv"]


class FileStatusEnum(str, Enum):
    ACTIVE = "active"
    DELETED = "deleted"
    PROCESSING = "processing"
    ERROR = "error"
