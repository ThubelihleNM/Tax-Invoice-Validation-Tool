from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.database.connection import get_db
from app.models.countries import Country, CountryTaxConfiguration, PhoneCountryCode
from app.schemas.countries import (
    CountryResponse,
    CountryTaxConfigResponse,
    PhoneCodeResponse,
    CountryTaxSystemOption,
    CountryConfigurationResponse
)

router = APIRouter(prefix="/countries", tags=["Countries"])

def resolve_country(identifier: str, db: Session) -> Country:
    """Resolve a country by numeric ID, ISO code (e.g. IN, CA, ZA), or country name."""
    clean_id = str(identifier).strip()
    
    # Check if numeric id
    if clean_id.isdigit():
        c = db.query(Country).filter(Country.id == int(clean_id)).first()
        if c:
            return c
            
    # Check ISO code (case-insensitive)
    c = db.query(Country).filter(func.upper(Country.code) == clean_id.upper()).first()
    if c:
        return c

    # Check Name (case-insensitive)
    c = db.query(Country).filter(func.lower(Country.name) == clean_id.lower()).first()
    if c:
        return c

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Country '{identifier}' not found."
    )

@router.get("", response_model=List[CountryResponse])
def get_countries(db: Session = Depends(get_db)):
    """Retrieve all countries along with their currencies, phone codes, and tax systems."""
    return db.query(Country).order_by(Country.name.asc()).all()

@router.get("/{identifier}", response_model=CountryResponse)
def get_country(identifier: str, db: Session = Depends(get_db)):
    """Retrieve a single country configuration by its ID, ISO code, or name."""
    return resolve_country(identifier, db)

@router.get("/{identifier}/tax-systems", response_model=List[CountryTaxSystemOption])
def get_country_tax_systems(identifier: str, db: Session = Depends(get_db)):
    """
    Retrieve all applicable tax system options (GST, VAT, HST, PST, etc.) for a specific country.
    Supports multiple tax systems per country where applicable (e.g., Canada GST/HST/PST).
    """
    country = resolve_country(identifier, db)
    options = []
    
    for cfg in country.tax_configs:
        def_rate_val = cfg.default_rate.rate if cfg.default_rate else None
        def_rate_name = cfg.default_rate.name if cfg.default_rate else None
        
        options.append(CountryTaxSystemOption(
            tax_system_id=cfg.tax_system.id,
            tax_system_code=cfg.tax_system.code,
            tax_system_name=cfg.tax_system.name,
            tax_number_label=cfg.tax_number_label,
            currency_code=cfg.currency.code,
            currency_symbol=cfg.currency.symbol,
            default_rate=def_rate_val,
            default_rate_name=def_rate_name,
            is_primary=getattr(cfg, "is_primary", True),
            description=getattr(cfg, "description", None)
        ))

    return options

@router.get("/{identifier}/configuration", response_model=CountryConfigurationResponse)
def get_country_configuration(identifier: str, db: Session = Depends(get_db)):
    """
    Retrieve full country tax configuration profile including dialing code,
    primary tax system, all available tax systems, currency, and tax number label.
    """
    country = resolve_country(identifier, db)
    primary_cfg = country.tax_config
    
    phone_prefix = country.phone_code.prefix if country.phone_code else None
    
    currency_code = primary_cfg.currency.code if primary_cfg else None
    currency_symbol = primary_cfg.currency.symbol if primary_cfg else None
    tax_sys_code = primary_cfg.tax_system.code if primary_cfg else None
    tax_sys_name = primary_cfg.tax_system.name if primary_cfg else None
    tax_label = primary_cfg.tax_number_label if primary_cfg else None
    default_rate_val = primary_cfg.default_rate.rate if (primary_cfg and primary_cfg.default_rate) else None

    tax_options = []
    for cfg in country.tax_configs:
        tax_options.append(CountryTaxSystemOption(
            tax_system_id=cfg.tax_system.id,
            tax_system_code=cfg.tax_system.code,
            tax_system_name=cfg.tax_system.name,
            tax_number_label=cfg.tax_number_label,
            currency_code=cfg.currency.code,
            currency_symbol=cfg.currency.symbol,
            default_rate=cfg.default_rate.rate if cfg.default_rate else None,
            default_rate_name=cfg.default_rate.name if cfg.default_rate else None,
            is_primary=getattr(cfg, "is_primary", True),
            description=getattr(cfg, "description", None)
        ))

    return CountryConfigurationResponse(
        id=country.id,
        name=country.name,
        code=country.code,
        phone_code=phone_prefix,
        currency_code=currency_code,
        currency_symbol=currency_symbol,
        tax_system=tax_sys_code,
        tax_system_name=tax_sys_name,
        tax_number_label=tax_label,
        default_rate=default_rate_val,
        tax_systems=tax_options
    )

@router.get("/{identifier}/tax-config", response_model=CountryTaxConfigResponse)
def get_country_tax_config(identifier: str, db: Session = Depends(get_db)):
    """Retrieve primary tax profile configuration for a specific country."""
    country = resolve_country(identifier, db)
    if not country.tax_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax configuration for this country not found."
        )
    return country.tax_config

@router.get("/{identifier}/phone-code", response_model=PhoneCodeResponse)
def get_country_phone_code(identifier: str, db: Session = Depends(get_db)):
    """Retrieve country-specific international dialing prefix code."""
    country = resolve_country(identifier, db)
    if not country.phone_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Phone dialing code for this country not found."
        )
    return country.phone_code
