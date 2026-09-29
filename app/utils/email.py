"""Email utility — SMTP with console fallback. Zero external dependencies."""

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.utils.config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_EMAIL,
    SMTP_PASSWORD,
    SMTP_FROM_NAME,
    FRONTEND_URL,
)
from app.utils.logger import logger


def _smtp_configured() -> bool:
    return bool(SMTP_EMAIL and SMTP_PASSWORD)


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email. Returns True on success. Falls back to console logging."""
    if not _smtp_configured():
        logger.warning(
            f"SMTP not configured — email logged to console.\n"
            f"  To: {to_email}\n"
            f"  Subject: {subject}\n"
            f"  Body preview: {html_body}"
        )
        return True  # Don't block functionality if SMTP isn't set up

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Email sent to {to_email}: {subject}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


# ── Email Templates ───────────────────────────────────────────

def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send a password reset link."""
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    html = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #6366f1; font-size: 28px; margin: 0;">Exam<span style="color: #8b5cf6;">SIDE</span></h1>
        </div>
        <div style="background: #1e1b4b; border-radius: 16px; padding: 32px; color: #e2e8f0;">
            <h2 style="color: white; margin-top: 0;">Reset Your Password</h2>
            <p>We received a request to reset your password. Click below to set a new one:</p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="{reset_url}"
                   style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
                          color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px;">
                    Reset Password
                </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
        </div>
        <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px;">
            © ExamSIDE — India's premier exam preparation platform
        </p>
    </div>
    """
    return send_email(to_email, "Reset Your ExamSIDE Password", html)


def send_verification_email(to_email: str, verification_token: str) -> bool:
    """Send an email verification link."""
    verify_url = f"{FRONTEND_URL}/verify-email?token={verification_token}"
    html = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #6366f1; font-size: 28px; margin: 0;">Exam<span style="color: #8b5cf6;">SIDE</span></h1>
        </div>
        <div style="background: #1e1b4b; border-radius: 16px; padding: 32px; color: #e2e8f0;">
            <h2 style="color: white; margin-top: 0;">Verify Your Email</h2>
            <p>Welcome to ExamSIDE! Please verify your email address to activate your account:</p>
            <div style="text-align: center; margin: 28px 0;">
                <a href="{verify_url}"
                   style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981, #059669);
                          color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px;">
                    Verify Email
                </a>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">This link expires in 24 hours.</p>
        </div>
        <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px;">
            © ExamSIDE — India's premier exam preparation platform
        </p>
    </div>
    """
    return send_email(to_email, "Verify Your ExamSIDE Email", html)


def send_welcome_email(to_email: str, name: str) -> bool:
    """Send a welcome email after signup."""
    html = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #6366f1; font-size: 28px; margin: 0;">Exam<span style="color: #8b5cf6;">SIDE</span></h1>
        </div>
        <div style="background: #1e1b4b; border-radius: 16px; padding: 32px; color: #e2e8f0;">
            <h2 style="color: white; margin-top: 0;">Welcome, {name}! 🎉</h2>
            <p>You've joined India's premier exam preparation platform. Here's what you can do:</p>
            <ul style="color: #cbd5e1; line-height: 2;">
                <li>📚 Access 12,000+ past year questions</li>
                <li>📝 Take chapter-wise practice tests</li>
                <li>🏆 Compete on leaderboards</li>
                <li>📊 Track your performance analytics</li>
            </ul>
            <div style="text-align: center; margin: 28px 0;">
                <a href="{FRONTEND_URL}/dashboard"
                   style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
                          color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px;">
                    Start Preparing
                </a>
            </div>
        </div>
    </div>
    """
    return send_email(to_email, f"Welcome to ExamSIDE, {name}!", html)
