from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database.connection import get_db
from app.authentication.jwt import get_current_user
from app.models.users import User
from app.models.notifications import Notification, NotificationStatus

router = APIRouter(prefix="/notifications", tags=["Notifications"])

class NotificationItem(BaseModel):
    notification_id: int
    user_id: int
    title: str
    message: str
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    notifications: List[NotificationItem]
    unread_count: int

@router.get("", response_model=NotificationListResponse)
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all notifications for the authenticated user."""
    items = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).limit(50).all()

    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.status == NotificationStatus.UNREAD
    ).count()

    return {
        "notifications": [
            NotificationItem(
                notification_id=n.notification_id,
                user_id=n.user_id,
                title=n.title,
                message=n.message,
                status=n.status.value if hasattr(n.status, "value") else str(n.status),
                created_at=n.created_at
            ) for n in items
        ],
        "unread_count": unread_count
    }

@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a specific notification as read."""
    notif = db.query(Notification).filter(
        Notification.notification_id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notif.status = NotificationStatus.READ
    db.commit()
    return {"message": "Notification marked as read"}

@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all user notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.status == NotificationStatus.UNREAD
    ).update({"status": NotificationStatus.READ})
    db.commit()
    return {"message": "All notifications marked as read"}
