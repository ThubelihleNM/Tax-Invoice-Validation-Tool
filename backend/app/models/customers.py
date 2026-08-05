from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(255), nullable=False)
    tax_number = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)

    # Relationships
    invoices = relationship("Invoice", back_populates="customer")
