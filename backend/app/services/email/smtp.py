from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

from app.core.config.config import settings
from app.models.database.email import EmailLog

logger = logging.getLogger(__name__)


class EmailService:
    smtp_server = settings.SMTP_SERVER
    smtp_port = settings.SMTP_PORT
    smtp_password = settings.EMAIL_PASSWORD
    sender_email = settings.EMAIL_FROM

    @classmethod
    async def send_email(
        from_email: str,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        triggered_by_user_id: str = "system",
        email_type: str = "general",
        related_entity_id: Optional[str] = None,
        related_entity_type: Optional[str] = None,
    ) -> bool:
        """
        Send an email using SMTP

        :param to_email: Recipient email address
        :param subject: Email subject
        :param body: Plain text email body
        :param html_body: Optional HTML email body
        :return: Boolean indicating email send success
        """
        email_log = None
        try:
            email_log = await EmailLog.create_email_log(
                recipient_email=to_email,
                subject=subject,
                body=body,
                html_body=html_body,
                email_type=email_type,
                triggered_by_user_id=triggered_by_user_id,
                related_entity_id=related_entity_id,
                related_entity_type=related_entity_type,
                sender_email=EmailService.sender_email,
            )

            # Create message container
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = EmailService.sender_email
            msg["To"] = to_email

            # Create plain text and HTML versions of the message
            plain_text_part = MIMEText(body, "plain")
            msg.attach(plain_text_part)

            # Add HTML part if provided
            if html_body:
                html_part = MIMEText(html_body, "html")
                msg.attach(html_part)

            # Establish SMTP connection
            with smtplib.SMTP(
                EmailService.smtp_server, EmailService.smtp_port
            ) as server:
                server.starttls()
                server.login(EmailService.sender_email, EmailService.smtp_password)

                # Send email
                server.sendmail(EmailService.sender_email, to_email, msg.as_string())

            # Mark as sent in logs
            await email_log.mark_as_sent()
            logger.info(
                "Email sent successfully to {to_email}",
            )
            return True

        except Exception as e:
            if email_log:
                await email_log.mark_as_failed(str(e))
            logger.exception("Failed to send email to {to_email}: {e}")
            return False

    async def send_verification_email(
        self, to_email: str, verification_link: str, purpose: str = "registration"
    ) -> bool:
        """
        Send a verification email

        :param to_email: Recipient email address
        :param verification_link: Verification link
        :param purpose: Purpose of verification (registration or reset-password)
        :return: Boolean indicating email send success
        """
        subject_map = {
            "registration": "Complete Your Registration",
            "reset-password": "Password Reset Request",
        }

        body_map = {
            "registration": (
                "Welcome! Please complete your registration by clicking the link below:\n\n"
                "{link}\n\n"
                "If you did not request this registration, please ignore this email."
            ),
            "reset-password": (
                "You have requested to reset your password. Click the link below:\n\n"
                "{link}\n\n"
                "If you did not request a password reset, please ignore this email."
            ),
        }

        html_map = {
            "registration": (
                "<html><body>"
                "<h2>Complete Your Registration</h2>"
                "<p>Please click the button below to complete your registration:</p>"
                '<a href="{link}" style="background-color:#4CAF50;border:none;color:white;'
                "padding:15px 32px;text-align:center;text-decoration:none;display:inline-block;"
                'font-size:16px;margin:4px 2px;cursor:pointer;">Verify Email</a>'
                "</body></html>"
            ),
            "reset-password": (
                "<html><body>"
                "<h2>Password Reset Request</h2>"
                "<p>Click the button below to reset your password:</p>"
                '<a href="{link}" style="background-color:#4CAF50;border:none;color:white;'
                "padding:15px 32px;text-align:center;text-decoration:none;display:inline-block;"
                'font-size:16px;margin:4px 2px;cursor:pointer;">Reset Password</a>'
                "</body></html>"
            ),
        }

        # Validate purpose
        if purpose not in subject_map:
            logger.error(
                "Invalid email purpose: {purpose}",
            )
            return False

        # Format messages
        body = body_map[purpose].format(link=verification_link)
        html_body = html_map[purpose].format(link=verification_link)

        return await self.send_email(
            to_email=to_email,
            subject=subject_map[purpose],
            body=body,
            html_body=html_body,
            email_type=purpose,
        )

    async def send_collaborator_invite_email(
        self, to_email: str, inviter_name: str, registration_link: str
    ) -> bool:
        """
        Send a collaborator invite email

        :param to_email: Recipient email address
        :param inviter_name: Name of the user who sent the invite
        :param registration_link: Registration link for the collaborator
        :return: Boolean indicating email send success
        """
        subject = f"{inviter_name} has invited you to collaborate"

        body = (
            f"{inviter_name} has invited you to join their workspace.\n\n"
            "Click the link below to complete your registration:\n\n"
            f"{registration_link}\n\n"
            "If you did not expect this invitation, please ignore this email."
        )

        html_body = (
            "<html><body>"
            f"<h2>{inviter_name} has invited you to collaborate</h2>"
            "<p>Click the button below to complete your registration:</p>"
            '<a href="{link}" style="background-color:#4CAF50;border:none;color:white;'
            "padding:15px 32px;text-align:center;text-decoration:none;display:inline-block;"
            'font-size:16px;margin:4px 2px;cursor:pointer;">Accept Invitation</a>'
            "</body></html>"
        ).format(link=registration_link)

        return await self.send_email(
            to_email=to_email,
            subject=subject,
            body=body,
            html_body=html_body,
            email_type="collaboration_invite",
        )

    async def send_collaboration_invite(
        self, to_email: str, document_name: str, auth_role: str
    ) -> None:
        """
        Send a collaboration invitation email
        """
        # Create message container
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Document Collaboration Invitation"
        msg["From"] = self.sender_email
        msg["To"] = to_email

        # Create the email body
        text_body = f"""
        You have been invited to collaborate on a document.

        Document ID: {document_name}
        Collaboration Role: {auth_role}

        Please log in to accept or decline this invitation.
        """

        html_body = f"""
        <html>
        <body>
            <h2>Document Collaboration Invitation</h2>
            <p>You have been invited to collaborate on a document.</p>
            <ul>
                <li><strong>Document ID:</strong> {document_name}</li>
                <li><strong>Collaboration Role:</strong> {auth_role}</li>
            </ul>
            <p>Please log in to start collaborating.</p>
        </body>
        </html>
        """

        return await self.send_email(
            to_email=to_email,
            subject="Document Collaboration Invitation",
            body=text_body,
            html_body=html_body,
            email_type="collaboration_document",
        )
