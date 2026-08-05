from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum, func
from sqlalchemy.orm import relationship
from app.database.connection import Base
import enum

class NotificationStatus(str, enum.Enum):
    UNREAD = "Unread"
    READ = "Read"

class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.UNREAD, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notifications")
