from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.countries import Country, CountryTaxConfiguration, PhoneCountryCode
from app.schemas.countries import CountryResponse, CountryTaxConfigResponse, PhoneCodeResponse

router = APIRouter(prefix="/countries", tags=["Countries"])

@router.get("", response_model=List[CountryResponse])
def get_countries(db: Session = Depends(get_db)):
    """Retrieve all countries along with their currencies, phone codes, and tax systems."""
    return db.query(Country).all()

@router.get("/{country_id}", response_model=CountryResponse)
def get_country(country_id: int, db: Session = Depends(get_db)):
    """Retrieve a single country configuration by its ID."""
    country = db.query(Country).filter(Country.id == country_id).first()
    if not country:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Country configuration not found."
        )
    return country

@router.get("/{country_id}/tax-config", response_model=CountryTaxConfigResponse)
def get_country_tax_config(country_id: int, db: Session = Depends(get_db)):
    """Retrieve tax profile configurations (GST, VAT, etc.) for a specific country."""
    config = db.query(CountryTaxConfiguration).filter(CountryTaxConfiguration.country_id == country_id).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax configuration for this country not found."
        )
    return config

@router.get("/{country_id}/phone-code", response_model=PhoneCodeResponse)
def get_country_phone_code(country_id: int, db: Session = Depends(get_db)):
    """Retrieve country-specific international dialing prefix code."""
    phone_code = db.query(PhoneCountryCode).filter(PhoneCountryCode.country_id == country_id).first()
    if not phone_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone dialing code for this country not found."
        )
    return phone_code
