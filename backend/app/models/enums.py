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
