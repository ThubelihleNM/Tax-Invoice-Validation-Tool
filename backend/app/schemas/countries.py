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

    class Config:
        from_attributes = True

class CountryResponse(BaseModel):
    id: int
    name: str
    code: str
    phone_code: Optional[PhoneCodeResponse] = None
    tax_config: Optional[CountryTaxConfigResponse] = None

    class Config:
        from_attributes = True
