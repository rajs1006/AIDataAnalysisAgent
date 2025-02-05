from app.core.logging_config import get_logger
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config.config import settings


logger = get_logger(__name__)


def send_email(
    to_email: str, subject: str, body: str, html_body: Optional[str] = None
) -> bool:
    """
    Send an email using SMTP

    :param to_email: Recipient email address
    :param subject: Email subject
    :param body: Plain text email body
    :param html_body: Optional HTML email body
    :return: Boolean indicating email send success
    """
    try:
        # Create message container
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email

        # Create plain text and HTML versions of the message
        plain_text_part = MIMEText(body, "plain")
        msg.attach(plain_text_part)

        # Add HTML part if provided
        if html_body:
            html_part = MIMEText(html_body, "html")
            msg.attach(html_part)

        # Establish SMTP connection
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.EMAIL_FROM, settings.EMAIL_PASSWORD)

            # Send email
            server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())

        logger.info(
            "Email sent successfully to {to_email}",
        )
        return True

    except Exception as e:
        logger.error("Failed to send email to {to_email}: {str(e)}", e)
        return False


def send_verification_email(
    to_email: str, verification_link: str, purpose: str = "registration"
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

    return send_email(
        to_email=to_email, subject=subject_map[purpose], body=body, html_body=html_body
    )


def send_collaborator_invite_email(
    to_email: str, inviter_name: str, registration_link: str
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

    return send_email(
        to_email=to_email, subject=subject, body=body, html_body=html_body
    )
