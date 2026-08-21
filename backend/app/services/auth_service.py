import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.config.config import settings
from app.models.users import User, UserStatus
from app.repositories.user_repository import user_repository
from app.repositories.audit_repository import audit_repository
from app.authentication.jwt import (
    verify_password,
    get_password_hash,
    create_access_token
)

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
            # Audit failed attempt with dummy/no user ID
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
                detail="Invalid email or password"
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
                detail="Account is suspended. Please contact the administrator."
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
                    detail="Account suspended due to too many failed attempts."
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
                detail="Invalid email or password"
            )

        # Success: reset failed attempts, update logins and sessions
        user.failed_login_attempts = 0
        user.last_login = datetime.utcnow()
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

    def request_password_reset(self, db: Session, email: str) -> str:
        """Create and store password reset token for the given email, returning the reset token."""
        user = user_repository.get_by_email(db, email)
        if not user:
            # Throw generic success to prevent email enumeration, but we return a stub for client
            return "dummy-token"

        reset_token = secrets.token_urlsafe(32)
        user.password_reset_token = reset_token
        db.commit()

        audit_repository.create(
            db,
            user_id=user.id,
            action="PASSWORD_RESET_REQUEST",
            description="Password reset token generated",
        )
        return reset_token

    def reset_password(self, db: Session, token: str, new_password: str) -> bool:
        """Verify the reset token and apply the new password."""
        user = user_repository.get_by_reset_token(db, token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        user.password_hash = get_password_hash(new_password)
        user.password_reset_token = None
        user.failed_login_attempts = 0
        if user.status == UserStatus.SUSPENDED:
            user.status = UserStatus.ACTIVE
            
        db.commit()

        audit_repository.create(
            db,
            user_id=user.id,
            action="PASSWORD_RESET_COMPLETE",
            description="Password reset completed successfully using token"
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
        db.commit()

        audit_repository.create(
            db,
            user_id=user.id,
            action="PASSWORD_CHANGE",
            description="Password changed successfully"
        )
        return True

auth_service = AuthService()
