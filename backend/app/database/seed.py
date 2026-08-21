from sqlalchemy.orm import Session
from app.models.countries import Country, Currency, PhoneCountryCode, TaxSystem, TaxRate, CountryTaxConfiguration

def seed_country_tax_configurations(db: Session):
    # Check if countries are already seeded
    if db.query(Country).count() > 0:
        return

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
        currency = Currency(code=c_data["code"], symbol=c_data["symbol"])
        db.add(currency)
        db.commit()
        currencies[c_data["code"]] = currency

    # 2. Define Tax Systems
    tax_systems_data = [
        {"name": "Goods and Services Tax", "code": "GST"},
        {"name": "Value Added Tax", "code": "VAT"},
        {"name": "Sales Tax", "code": "Sales Tax"}
    ]
    tax_systems = {}
    for ts_data in tax_systems_data:
        ts = TaxSystem(name=ts_data["name"], code=ts_data["code"])
        db.add(ts)
        db.commit()
        tax_systems[ts_data["code"]] = ts

    # 3. Define standard/default rates for Tax Systems
    rates_data = [
        {"tax_system_code": "GST", "name": "India GST Standard", "rate": 18.00},
        {"tax_system_code": "GST", "name": "Australia GST Standard", "rate": 10.00},
        {"tax_system_code": "GST", "name": "Canada GST Standard", "rate": 5.00},
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
        rate = TaxRate(tax_system_id=ts.id, name=r_data["name"], rate=r_data["rate"])
        db.add(rate)
        db.commit()
        rates[r_data["name"]] = rate

    # 4. Define Countries, Phone Codes and Country Tax Configurations
    countries_data = [
        {
            "name": "India", "code": "IN", "prefix": "+91",
            "currency": "INR", "tax_system": "GST", "tax_label": "GSTIN", "default_rate": "India GST Standard"
        },
        {
            "name": "South Africa", "code": "ZA", "prefix": "+27",
            "currency": "ZAR", "tax_system": "VAT", "tax_label": "VAT Number", "default_rate": "South Africa VAT Standard"
        },
        {
            "name": "Zimbabwe", "code": "ZW", "prefix": "+263",
            "currency": "ZWG", "tax_system": "VAT", "tax_label": "VAT Number", "default_rate": "Zimbabwe VAT Standard"
        },
        {
            "name": "United States", "code": "US", "prefix": "+1",
            "currency": "USD", "tax_system": "Sales Tax", "tax_label": "Tax ID / EIN", "default_rate": "US Sales Tax Standard"
        },
        {
            "name": "United Kingdom", "code": "GB", "prefix": "+44",
            "currency": "GBP", "tax_system": "VAT", "tax_label": "VAT Number", "default_rate": "United Kingdom VAT Standard"
        },
        {
            "name": "Canada", "code": "CA", "prefix": "+1",
            "currency": "CAD", "tax_system": "GST", "tax_label": "GST/HST Number", "default_rate": "Canada GST Standard"
        },
        {
            "name": "Australia", "code": "AU", "prefix": "+61",
            "currency": "AUD", "tax_system": "GST", "tax_label": "ABN", "default_rate": "Australia GST Standard"
        },
        {
            "name": "United Arab Emirates", "code": "AE", "prefix": "+971",
            "currency": "AED", "tax_system": "VAT", "tax_label": "TRN", "default_rate": "UAE VAT Standard"
        },
        {
            "name": "Nigeria", "code": "NG", "prefix": "+234",
            "currency": "NGN", "tax_system": "VAT", "tax_label": "TIN", "default_rate": "Nigeria VAT Standard"
        },
        {
            "name": "Kenya", "code": "KE", "prefix": "+254",
            "currency": "KES", "tax_system": "VAT", "tax_label": "PIN", "default_rate": "Kenya VAT Standard"
        }
    ]

    for c_item in countries_data:
        country = Country(name=c_item["name"], code=c_item["code"])
        db.add(country)
        db.commit()

        # Phone Code
        phone_code = PhoneCountryCode(country_id=country.id, prefix=c_item["prefix"])
        db.add(phone_code)

        # Config
        curr = currencies[c_item["currency"]]
        ts = tax_systems[c_item["tax_system"]]
        def_rate = rates[c_item["default_rate"]]
        
        config = CountryTaxConfiguration(
            country_id=country.id,
            tax_system_id=ts.id,
            currency_id=curr.id,
            tax_number_label=c_item["tax_label"],
            default_rate_id=def_rate.id
        )
        db.add(config)
        db.commit()
