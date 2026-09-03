from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal

class CurrencyResponse(BaseModel):
    id: int
    code: str
    symbol: str

    class Config:
        from_attributes = True

class PhoneCodeResponse(BaseModel):
    id: int
    prefix: str

    class Config:
        from_attributes = True

class TaxRateResponse(BaseModel):
    id: int
    name: str
    rate: Decimal

    class Config:
        from_attributes = True

class TaxSystemResponse(BaseModel):
    id: int
    name: str
    code: str
    rates: List[TaxRateResponse] = []

    class Config:
        from_attributes = True

class CountryTaxConfigResponse(BaseModel):
    id: int
    tax_system: TaxSystemResponse
    currency: CurrencyResponse
    tax_number_label: str
    default_rate: Optional[TaxRateResponse] = None
    is_primary: bool = True
    description: Optional[str] = None

    class Config:
        from_attributes = True

class CountryResponse(BaseModel):
    id: int
    name: str
    code: str
    phone_code: Optional[PhoneCodeResponse] = None
    tax_config: Optional[CountryTaxConfigResponse] = None
    tax_configs: List[CountryTaxConfigResponse] = []

    class Config:
        from_attributes = True

class CountryTaxSystemOption(BaseModel):
    tax_system_id: int
    tax_system_code: str
    tax_system_name: str
    tax_number_label: str
    currency_code: str
    currency_symbol: str
    default_rate: Optional[Decimal] = None
    default_rate_name: Optional[str] = None
    is_primary: bool = True
    description: Optional[str] = None

class CountryConfigurationResponse(BaseModel):
    id: int
    name: str
    code: str
    phone_code: Optional[str] = None
    currency_code: Optional[str] = None
    currency_symbol: Optional[str] = None
    tax_system: Optional[str] = None
    tax_system_name: Optional[str] = None
    tax_number_label: Optional[str] = None
    default_rate: Optional[Decimal] = None
    tax_systems: List[CountryTaxSystemOption] = []
