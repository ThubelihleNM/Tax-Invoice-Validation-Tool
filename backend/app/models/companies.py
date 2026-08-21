from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    registration_number = Column(String(100), nullable=False)
    tax_number = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    tax_system = Column(String(50), nullable=False)
    currency = Column(String(10), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    members = relationship("User", back_populates="company", foreign_keys="User.company_id")
    owner = relationship("User", foreign_keys=[owner_id])
