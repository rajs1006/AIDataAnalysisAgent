from datetime import datetime
from typing import Optional, List, Literal
from beanie import Document, Indexed
from pydantic import Field


class EmailLog(Document):
    # Core email fields
    recipient_email: str
    subject: str
    body: str
    html_body: Optional[str]

    # Status tracking
    status: Literal["pending", "sent", "failed"] = "pending"
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = Field(default=0)
    last_retry: Optional[datetime] = None

    # Email type/purpose tracking
    email_type: Literal[
        "collaboration_document",
        "collaboration_invite",
        "registration",
        "reset-password",
    ] = ""

    # Metadata
    triggered_by_user_id: str
    sender_email: str = Field(default="default@yourdomain.com")

    # Additional context
    related_entity_id: Optional[str] = None  # e.g., document_id for collaborations
    related_entity_type: Optional[str] = None

    # Tracking
    opened_at: Optional[datetime] = None
    clicked_links: List[dict] = Field(default_factory=list)

    class Settings:
        name = "email_logs"
        indexes = [
            "recipient_email",
            "status",
            "sent_at",
            "triggered_by_user_id",
            "email_type",
            "related_entity_id",
        ]

    @classmethod
    async def create_email_log(
        cls,
        recipient_email: str,
        subject: str,
        body: str,
        html_body: Optional[str],
        email_type: str,
        triggered_by_user_id: str,
        related_entity_id: Optional[str] = None,
        related_entity_type: Optional[str] = None,
        sender_email: Optional[str] = None,
    ) -> "EmailLog":
        """Create a new email log entry"""
        log = cls(
            recipient_email=recipient_email,
            subject=subject,
            body=body,
            html_body=html_body,
            email_type=email_type,
            triggered_by_user_id=triggered_by_user_id,
            related_entity_id=related_entity_id,
            related_entity_type=related_entity_type,
            sender_email=sender_email,  # Using your email settings
        )
        await log.insert()
        return log

    async def mark_as_sent(self):
        """Mark email as successfully sent"""
        self.status = "sent"
        self.sent_at = datetime.utcnow()
        await self.save()

    async def mark_as_failed(self, error_message: str):
        """Mark email as failed with error message"""
        self.status = "failed"
        self.error_message = error_message
        self.retry_count += 1
        self.last_retry = datetime.utcnow()
        await self.save()

    @classmethod
    async def get_failed_emails(cls, max_retries: int = 3):
        """Get failed emails that haven't exceeded max retry attempts"""
        return await cls.find(
            {"status": "failed", "retry_count": {"$lt": max_retries}}
        ).to_list()

    @classmethod
    async def get_user_sent_emails(cls, user_id: str):
        """Get all emails sent by a specific user"""
        return (
            await cls.find({"triggered_by_user_id": user_id})
            .sort(-cls.sent_at)
            .to_list()
        )
