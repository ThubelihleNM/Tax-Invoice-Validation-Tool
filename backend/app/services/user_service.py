import os
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import Optional
from app.repositories.user_repository import user_repository
from app.repositories.audit_repository import audit_repository
from app.models.users import User, UserStatus
from app.schemas.users import UserCreate, UserUpdate
from app.config.config import settings

class UserService:
    def create_user(self, db: Session, creator_id: int, user_in: UserCreate) -> User:
        """Create a user (Admin only), check for duplicates, and log audit log."""
        existing_user = user_repository.get_by_email(db, user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists"
            )
            
        user = user_repository.create(db, user_in)
        audit_repository.create(
            db,
            user_id=creator_id,
            action="CREATE_USER",
            description=f"Created user: {user.email} with role {user.role.value}"
        )
        return user

    def update_user(self, db: Session, updater_id: int, user_id: int, user_in: UserUpdate) -> User:
        """Update user properties (Admin only) ensuring unique emails."""
        user = user_repository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        if user_in.email and user_in.email != user.email:
            existing = user_repository.get_by_email(db, user_in.email)
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A user with this email already exists"
                )
                
        updated_user = user_repository.update(db, user, user_in)
        audit_repository.create(
            db,
            user_id=updater_id,
            action="UPDATE_USER",
            description=f"Updated details for user: {updated_user.email}"
        )
        return updated_user

    def deactivate_user(self, db: Session, updater_id: int, user_id: int) -> User:
        """Set user status to INACTIVE."""
        user = user_repository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        user.status = UserStatus.INACTIVE
        user.session_status = "Inactive"
        user.refresh_token = None
        db.commit()
        
        audit_repository.create(
            db,
            user_id=updater_id,
            action="DEACTIVATE_USER",
            description=f"Deactivated user: {user.email}"
        )
        return user

    def delete_user(self, db: Session, deleter_id: int, user_id: int) -> bool:
        """Delete user completely from the database."""
        user = user_repository.get_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        email = user.email
        success = user_repository.delete(db, user_id)
        if success:
            audit_repository.create(
                db,
                user_id=deleter_id,
                action="DELETE_USER",
                description=f"Deleted user account: {email}"
            )
        return success

    def save_profile_photo(self, db: Session, user: User, file: UploadFile) -> User:
        """Validate and save user profile picture (max 5MB, PNG/JPG/JPEG)."""
        # Validate file size (max 5MB)
        max_bytes = 5 * 1024 * 1024
        file_size = 0
        
        # Read contents chunkwise to verify size
        content = bytearray()
        chunk_size = 8192
        while True:
            chunk = file.file.read(chunk_size)
            if not chunk:
                break
            content.extend(chunk)
            file_size += len(chunk)
            if file_size > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Profile photo size exceeds limit of 5MB"
                )
                
        # Validate format
        extension = os.path.splitext(file.filename)[1].lower()
        if extension not in [".png", ".jpg", ".jpeg"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile photo format must be PNG, JPG, or JPEG"
            )

        # Create folders if not existing
        profile_photos_dir = os.path.join(settings.UPLOAD_DIR, "profiles")
        os.makedirs(profile_photos_dir, exist_ok=True)
        
        # Write file
        filename = f"user_{user.id}_profile{extension}"
        file_path = os.path.join(profile_photos_dir, filename)
        
        with open(file_path, "wb") as f:
            f.write(content)
            
        # Update user record with file link relative or absolute
        user.profile_photo = f"/uploads/profiles/{filename}"
        db.commit()
        
        audit_repository.create(
            db,
            user_id=user.id,
            action="UPDATE_PROFILE_PHOTO",
            description=f"Uploaded profile photo: {filename}"
        )
        return user

user_service = UserService()
