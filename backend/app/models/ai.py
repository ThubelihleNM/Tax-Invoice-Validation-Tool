from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_title = Column(String(255), default="New Chat session", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")


class AIMessage(Base):
    __tablename__ = "ai_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id"), nullable=False)
    sender = Column(String(50), nullable=False)  # "user" or "ai"
    message_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversation = relationship("AIConversation", back_populates="messages")


class FavoritePrompt(Base):
    __tablename__ = "ai_favorite_prompts"

    id = Column(Integer, primary_key=True, index=True)
    prompt_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    insight_type = Column(String(100), nullable=False)  # "predictive", "executive", "supplier"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
