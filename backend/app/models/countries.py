from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Country(Base):
    __tablename__ = "countries"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(5), unique=True, nullable=False)  # e.g., "IN", "ZA", "ZW"

    phone_code = relationship("PhoneCountryCode", uselist=False, back_populates="country", cascade="all, delete-orphan")
    tax_config = relationship("CountryTaxConfiguration", uselist=False, back_populates="country", cascade="all, delete-orphan")


class Currency(Base):
    __tablename__ = "currencies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)  # e.g., "INR", "ZAR", "USD"
    symbol = Column(String(10), nullable=False)  # e.g., "₹", "R", "$"


class PhoneCountryCode(Base):
    __tablename__ = "phone_country_codes"

    id = Column(Integer, primary_key=True, index=True)
    country_id = Column(Integer, ForeignKey("countries.id", ondelete="CASCADE"), nullable=False)
    prefix = Column(String(10), nullable=False)  # e.g., "+91", "+27"

    country = relationship("Country", back_populates="phone_code")


class TaxSystem(Base):
    __tablename__ = "tax_systems"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # e.g., "Goods and Services Tax"
    code = Column(String(20), unique=True, nullable=False)  # e.g., "GST", "VAT"

    rates = relationship("TaxRate", back_populates="tax_system", cascade="all, delete-orphan")


class TaxRate(Base):
    __tablename__ = "tax_rates"

    id = Column(Integer, primary_key=True, index=True)
    tax_system_id = Column(Integer, ForeignKey("tax_systems.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)  # e.g., "Standard Rate", "Reduced Rate"
    rate = Column(Numeric(5, 2), nullable=False)  # e.g., 15.00, 18.00

    tax_system = relationship("TaxSystem", back_populates="rates")


class CountryTaxConfiguration(Base):
    __tablename__ = "country_tax_configurations"

    id = Column(Integer, primary_key=True, index=True)
    country_id = Column(Integer, ForeignKey("countries.id", ondelete="CASCADE"), unique=True, nullable=False)
    tax_system_id = Column(Integer, ForeignKey("tax_systems.id", ondelete="RESTRICT"), nullable=False)
    currency_id = Column(Integer, ForeignKey("currencies.id", ondelete="RESTRICT"), nullable=False)
    tax_number_label = Column(String(50), nullable=False)  # e.g., "GSTIN", "VAT Number"
    default_rate_id = Column(Integer, ForeignKey("tax_rates.id", ondelete="SET NULL"), nullable=True)

    country = relationship("Country", back_populates="tax_config")
    tax_system = relationship("TaxSystem")
    currency = relationship("Currency")
    default_rate = relationship("TaxRate")
