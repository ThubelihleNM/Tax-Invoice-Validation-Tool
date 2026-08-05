from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from app.database.connection import Base
import enum

class SupplierStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"

class Supplier(Base):
    __tablename__ = "suppliers"

    supplier_id = Column(Integer, primary_key=True, index=True)
    supplier_name = Column(String(255), nullable=False)
    tax_number = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    status = Column(Enum(SupplierStatus), default=SupplierStatus.ACTIVE, nullable=False)

    # Relationships
    invoices = relationship("Invoice", back_populates="supplier")
