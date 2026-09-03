import secrets
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.config.config import settings
from app.models.users import User, UserStatus
from app.models.password_reset import PasswordResetToken
from app.repositories.user_repository import user_repository
from app.repositories.audit_repository import audit_repository
from app.authentication.jwt import (
    verify_password,
    get_password_hash,
    create_access_token
)

def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Dispatches password reset email via SMTP if configured, otherwise logs safely in development."""
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME:
        # Development mode fallback: Log safely to server output
        print(f"[AUTH DEV] Password reset token for {to_email}: {reset_token}")
        print(f"[AUTH DEV] Direct reset link: {reset_link}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset your TaxAudit password"
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = to_email

        text_body = (
            f"Hello,\n\n"
            f"You requested a password reset for your TaxAudit account.\n"
            f"Please visit the following link to set a new password:\n"
            f"{reset_link}\n\n"
            f"Your reset code is: {reset_token}\n\n"
            f"This link is valid for 30 minutes.\n"
            f"If you did not request this, you can safely ignore this email.\n"
        )
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5;">TaxAudit Password Recovery</h2>
          <p>You requested a password reset for your TaxAudit account.</p>
          <p style="margin: 24px 0;">
            <a href="{reset_link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="color: #64748b; font-size: 13px;">Or copy and paste your reset token manually into the form:<br>
          <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 14px; color: #1e293b;">{reset_token}</code></p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This link will expire in 30 minutes. If you did not make this request, please disregard this email.</p>
        </div>
        """
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Error dispatching password recovery email to {to_email}: {e}")
        return False

class AuthService:
    def authenticate_user(
        self,
        db: Session,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        browser: Optional[str] = None
    ) -> User:
        """Authenticate user email/password, handling failed attempts and status checks."""
        user = user_repository.get_by_email(db, email)
        if not user:
            # Audit failed attempt with no user ID
            audit_repository.create(
                db,
                user_id=None,
                action="FAILED_LOGIN",
                description=f"Login failed: No user found with email {email}",
                ip_address=ip_address,
                browser=browser
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )

        if user.status == UserStatus.SUSPENDED:
            audit_repository.create(
                db,
                user_id=user.id,
                action="FAILED_LOGIN",
                description="Login failed: Account is suspended",
                ip_address=ip_address,
                browser=browser
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended. Please contact your system administrator."
            )

        if user.status == UserStatus.INACTIVE:
            audit_repository.create(
                db,
                user_id=user.id,
                action="FAILED_LOGIN",
                description="Login failed: Account is inactive",
                ip_address=ip_address,
                browser=browser
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive."
            )

        # Verify password
        if not verify_password(password, user.password_hash):
            # Increment failed attempts
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.status = UserStatus.SUSPENDED
                audit_repository.create(
                    db,
                    user_id=user.id,
                    action="ACCOUNT_SUSPENDED",
                    description="Account suspended due to 5+ failed login attempts",
                    ip_address=ip_address,
                    browser=browser
                )
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account suspended due to too many failed attempts. Please contact support."
                )
            
            db.commit()
            audit_repository.create(
                db,
                user_id=user.id,
                action="FAILED_LOGIN",
                description=f"Login failed: Incorrect password. Attempt {user.failed_login_attempts}/5",
                ip_address=ip_address,
                browser=browser
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )

        # Success: reset failed attempts, update logins and sessions
        user.failed_login_attempts = 0
        user.last_login = datetime.now(timezone.utc)
        user.session_status = "Active"
        
        # Generate new refresh token
        user.refresh_token = secrets.token_urlsafe(64)
        db.commit()

        audit_repository.create(
            db,
            user_id=user.id,
            action="LOGIN",
            description="User successfully logged in",
            ip_address=ip_address,
            browser=browser
        )

        return user

    def logout_user(self, db: Session, user: User, ip_address: Optional[str] = None, browser: Optional[str] = None):
        """Perform a clean logout by terminating user session status."""
        user.session_status = "Inactive"
        user.refresh_token = None
        db.commit()
        audit_repository.create(
            db,
            user_id=user.id,
            action="LOGOUT",
            description="User logged out securely",
            ip_address=ip_address,
            browser=browser
        )

    def refresh_tokens(self, db: Session, refresh_token: str) -> Tuple[str, str]:
        """Validate refresh token and issue a rotated access/refresh token pair."""
        user = db.query(User).filter(User.refresh_token == refresh_token).first()
        if not user or user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )

        # Rotate refresh token
        new_refresh = secrets.token_urlsafe(64)
        user.refresh_token = new_refresh
        db.commit()

        access_token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        return access_token, new_refresh

    def request_password_reset(self, db: Session, email: str) -> Optional[str]:
        """
        Generates a secure, time-limited password reset token.
        Hashes token using SHA-256 for secure database persistence with a 30-minute expiration.
        """
        user = user_repository.get_by_email(db, email)
        if not user:
            # Generic return to prevent email enumeration
            return None

        # Invalidate any prior unused reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False
        ).update({"used": True})
        db.commit()

        # Generate secure random token
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)

        # Persist hashed token record
        reset_rec = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            used=False
        )
        db.add(reset_rec)

        # Also store backward-compatible field
        user.password_reset_token = token_hash
        db.commit()

        # Dispatch email or log for development
        send_password_reset_email(user.email, raw_token)

        audit_repository.create(
            db,
            user_id=user.id,
            action="PASSWORD_RESET_REQUEST",
            description="Password reset token generated (30-minute expiry)",
        )
        return raw_token

    def reset_password(self, db: Session, token: str, new_password: str) -> bool:
        """
        Verifies the reset token hash against the database, checks expiration,
        ensures single-use, and applies the securely hashed new password.
        """
        if not token or not token.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token is required."
            )

        clean_token = token.strip()
        token_hash = hashlib.sha256(clean_token.encode("utf-8")).hexdigest()
        now_utc = datetime.now(timezone.utc)

        # 1. Search in dedicated PasswordResetToken table
        reset_entry = db.query(PasswordResetToken).filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used == False
        ).first()

        user = None
        if reset_entry:
            # Check expiration
            expires_at = reset_entry.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
                
            if expires_at < now_utc:
                reset_entry.used = True
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password reset token has expired. Please request a new one."
                )
            user = db.query(User).filter(User.id == reset_entry.user_id).first()
            reset_entry.used = True
        else:
            # Fallback for plain legacy token check
            user = db.query(User).filter(
                (User.password_reset_token == clean_token) | (User.password_reset_token == token_hash)
            ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired password reset token."
            )

        # Securely hash new password
        user.password_hash = get_password_hash(new_password)
        user.password_reset_token = None
        user.failed_login_attempts = 0
        user.last_password_change = datetime.now(timezone.utc)
        
        # Invalidate any other active reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False
        ).update({"used": True})

        if user.status == UserStatus.SUSPENDED:
            user.status = UserStatus.ACTIVE
            
        db.commit()

        audit_repository.create(
            db,
            user_id=user.id,
            action="PASSWORD_RESET_COMPLETE",
            description="Password reset completed successfully"
        )
        return True

    def change_password(self, db: Session, user: User, current_pw: str, new_pw: str) -> bool:
        """Authenticated password change checking the current password."""
        if not verify_password(current_pw, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password"
            )

        user.password_hash = get_password_hash(new_pw)
        user.last_password_change = datetime.now(timezone.utc)
        db.commit()

        audit_repository.create(
            db,
            user_id=user.id,
            action="PASSWORD_CHANGE",
            description="Password changed successfully"
        )
        return True

auth_service = AuthService()
