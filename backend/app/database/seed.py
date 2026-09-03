from sqlalchemy.orm import Session
from app.models.countries import Country, Currency, PhoneCountryCode, TaxSystem, TaxRate, CountryTaxConfiguration

def seed_country_tax_configurations(db: Session):
    """
    Idempotently seeds currencies, tax systems, tax rates, countries, phone codes,
    and multi-system country tax configurations (including Canada's GST/HST/PST).
    """

    # 1. Define Currencies
    currencies_data = [
        {"code": "INR", "symbol": "₹"},
        {"code": "ZAR", "symbol": "R"},
        {"code": "USD", "symbol": "$"},
        {"code": "GBP", "symbol": "£"},
        {"code": "AUD", "symbol": "A$"},
        {"code": "CAD", "symbol": "C$"},
        {"code": "AED", "symbol": "د.إ"},
        {"code": "ZWG", "symbol": "ZiG"},
        {"code": "NGN", "symbol": "₦"},
        {"code": "KES", "symbol": "KSh"}
    ]
    currencies = {}
    for c_data in currencies_data:
        curr = db.query(Currency).filter(Currency.code == c_data["code"]).first()
        if not curr:
            curr = Currency(code=c_data["code"], symbol=c_data["symbol"])
            db.add(curr)
            db.commit()
            db.refresh(curr)
        currencies[c_data["code"]] = curr

    # 2. Define Tax Systems
    tax_systems_data = [
        {"name": "Goods and Services Tax", "code": "GST"},
        {"name": "Value Added Tax", "code": "VAT"},
        {"name": "Sales Tax", "code": "Sales Tax"},
        {"name": "Harmonized Sales Tax", "code": "HST"},
        {"name": "Provincial Sales Tax", "code": "PST"}
    ]
    tax_systems = {}
    for ts_data in tax_systems_data:
        ts = db.query(TaxSystem).filter(TaxSystem.code == ts_data["code"]).first()
        if not ts:
            ts = TaxSystem(name=ts_data["name"], code=ts_data["code"])
            db.add(ts)
            db.commit()
            db.refresh(ts)
        tax_systems[ts_data["code"]] = ts

    # 3. Define Standard Rates for Tax Systems
    rates_data = [
        {"tax_system_code": "GST", "name": "India GST Standard", "rate": 18.00},
        {"tax_system_code": "GST", "name": "Australia GST Standard", "rate": 10.00},
        {"tax_system_code": "GST", "name": "Canada GST Standard", "rate": 5.00},
        {"tax_system_code": "HST", "name": "Canada HST Standard", "rate": 13.00},
        {"tax_system_code": "PST", "name": "Canada PST Standard", "rate": 7.00},
        {"tax_system_code": "VAT", "name": "South Africa VAT Standard", "rate": 15.00},
        {"tax_system_code": "VAT", "name": "Zimbabwe VAT Standard", "rate": 15.00},
        {"tax_system_code": "VAT", "name": "United Kingdom VAT Standard", "rate": 20.00},
        {"tax_system_code": "VAT", "name": "UAE VAT Standard", "rate": 5.00},
        {"tax_system_code": "VAT", "name": "Nigeria VAT Standard", "rate": 7.50},
        {"tax_system_code": "VAT", "name": "Kenya VAT Standard", "rate": 16.00},
        {"tax_system_code": "Sales Tax", "name": "US Sales Tax Standard", "rate": 0.00}
    ]
    rates = {}
    for r_data in rates_data:
        ts = tax_systems[r_data["tax_system_code"]]
        rate = db.query(TaxRate).filter(TaxRate.name == r_data["name"]).first()
        if not rate:
            rate = TaxRate(tax_system_id=ts.id, name=r_data["name"], rate=r_data["rate"])
            db.add(rate)
            db.commit()
            db.refresh(rate)
        rates[r_data["name"]] = rate

    # 4. Define Countries and Configurations
    countries_data = [
        {
            "name": "India", "code": "IN", "prefix": "+91",
            "configs": [
                {"currency": "INR", "tax_system": "GST", "tax_label": "GSTIN", "default_rate": "India GST Standard", "is_primary": True, "description": "Goods and Services Tax (GST)"}
            ]
        },
        {
            "name": "South Africa", "code": "ZA", "prefix": "+27",
            "configs": [
                {"currency": "ZAR", "tax_system": "VAT", "tax_label": "VAT Number", "default_rate": "South Africa VAT Standard", "is_primary": True, "description": "Value Added Tax (VAT)"}
            ]
        },
        {
            "name": "Zimbabwe", "code": "ZW", "prefix": "+263",
            "configs": [
                {"currency": "ZWG", "tax_system": "VAT", "tax_label": "VAT Number", "default_rate": "Zimbabwe VAT Standard", "is_primary": True, "description": "Value Added Tax (VAT)"}
            ]
        },
        {
            "name": "United States", "code": "US", "prefix": "+1",
            "configs": [
                {"currency": "USD", "tax_system": "Sales Tax", "tax_label": "Tax ID / EIN", "default_rate": "US Sales Tax Standard", "is_primary": True, "description": "State/Local Sales Tax"}
            ]
        },
        {
            "name": "United Kingdom", "code": "GB", "prefix": "+44",
            "configs": [
                {"currency": "GBP", "tax_system": "VAT", "tax_label": "VAT Number", "default_rate": "United Kingdom VAT Standard", "is_primary": True, "description": "HM Revenue & Customs VAT"}
            ]
        },
        {
            "name": "Canada", "code": "CA", "prefix": "+1",
            "configs": [
                {"currency": "CAD", "tax_system": "GST", "tax_label": "GST/HST Number", "default_rate": "Canada GST Standard", "is_primary": True, "description": "Federal GST (5%)"},
                {"currency": "CAD", "tax_system": "HST", "tax_label": "GST/HST Number", "default_rate": "Canada HST Standard", "is_primary": False, "description": "Harmonized Sales Tax (HST 13-15%)"},
                {"currency": "CAD", "tax_system": "PST", "tax_label": "PST/QST Number", "default_rate": "Canada PST Standard", "is_primary": False, "description": "Provincial Sales Tax (PST 6-9.975%)"}
            ]
        },
        {
            "name": "Australia", "code": "AU", "prefix": "+61",
            "configs": [
                {"currency": "AUD", "tax_system": "GST", "tax_label": "ABN", "default_rate": "Australia GST Standard", "is_primary": True, "description": "Australian Goods and Services Tax (GST)"}
            ]
        },
        {
            "name": "United Arab Emirates", "code": "AE", "prefix": "+971",
            "configs": [
                {"currency": "AED", "tax_system": "VAT", "tax_label": "TRN", "default_rate": "UAE VAT Standard", "is_primary": True, "description": "Federal Tax Authority VAT (5%)"}
            ]
        },
        {
            "name": "Nigeria", "code": "NG", "prefix": "+234",
            "configs": [
                {"currency": "NGN", "tax_system": "VAT", "tax_label": "TIN", "default_rate": "Nigeria VAT Standard", "is_primary": True, "description": "FIRS Value Added Tax (VAT 7.5%)"}
            ]
        },
        {
            "name": "Kenya", "code": "KE", "prefix": "+254",
            "configs": [
                {"currency": "KES", "tax_system": "VAT", "tax_label": "PIN", "default_rate": "Kenya VAT Standard", "is_primary": True, "description": "KRA Value Added Tax (VAT 16%)"}
            ]
        }
    ]

    for c_item in countries_data:
        country = db.query(Country).filter(Country.code == c_item["code"]).first()
        if not country:
            country = Country(name=c_item["name"], code=c_item["code"])
            db.add(country)
            db.commit()
            db.refresh(country)

        # Phone Code
        phone_code = db.query(PhoneCountryCode).filter(PhoneCountryCode.country_id == country.id).first()
        if not phone_code:
            phone_code = PhoneCountryCode(country_id=country.id, prefix=c_item["prefix"])
            db.add(phone_code)
            db.commit()
        else:
            phone_code.prefix = c_item["prefix"]
            db.commit()

        # Seed/Update configs
        for cfg_item in c_item["configs"]:
            curr = currencies[cfg_item["currency"]]
            ts = tax_systems[cfg_item["tax_system"]]
            def_rate = rates.get(cfg_item["default_rate"])
            
            existing_cfg = db.query(CountryTaxConfiguration).filter(
                CountryTaxConfiguration.country_id == country.id,
                CountryTaxConfiguration.tax_system_id == ts.id
            ).first()

            if not existing_cfg:
                new_cfg = CountryTaxConfiguration(
                    country_id=country.id,
                    tax_system_id=ts.id,
                    currency_id=curr.id,
                    tax_number_label=cfg_item["tax_label"],
                    default_rate_id=def_rate.id if def_rate else None,
                    is_primary=cfg_item["is_primary"],
                    description=cfg_item["description"]
                )
                db.add(new_cfg)
                db.commit()
            else:
                existing_cfg.tax_number_label = cfg_item["tax_label"]
                existing_cfg.currency_id = curr.id
                existing_cfg.default_rate_id = def_rate.id if def_rate else None
                existing_cfg.is_primary = cfg_item["is_primary"]
                existing_cfg.description = cfg_item["description"]
                db.commit()
