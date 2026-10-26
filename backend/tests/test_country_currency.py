import os
import sys
import uuid
import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.connection import SessionLocal
from app.models.users import User

BASE_URL = "http://127.0.0.1:8000"

def test_country_currency_assignment():
    print("Testing Country-to-Currency Assignment across multiple countries...")
    db = SessionLocal()

    test_countries = [
        {"country": "India", "expected_currency": "INR", "expected_symbol": "₹"},
        {"country": "South Africa", "expected_currency": "ZAR", "expected_symbol": "R"},
        {"country": "United Kingdom", "expected_currency": "GBP", "expected_symbol": "£"},
        {"country": "Canada", "expected_currency": "CAD", "expected_symbol": "$"},
        {"country": "Australia", "expected_currency": "AUD", "expected_symbol": "$"},
        {"country": "United Arab Emirates", "expected_currency": "AED", "expected_symbol": "AED"},
        {"country": "Nigeria", "expected_currency": "NGN", "expected_symbol": "₦"}
    ]

    try:
        for item in test_countries:
            email = f"currency.test.{uuid.uuid4().hex[:6]}@taxaudit.com"
            payload = {
                "account_type": "PERSONAL",
                "first_name": "Test",
                "last_name": item["country"].replace(" ", ""),
                "email": email,
                "country": item["country"],
                "password": "CurrencyPass@123",
                "confirm_password": "CurrencyPass@123"
            }

            res = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
            assert res.status_code == 201, f"Failed registration for {item['country']}: {res.text}"
            token = res.json()["access_token"]

            # Verify in DB
            db.rollback()
            user = db.query(User).filter(User.email == email).first()
            assert user is not None
            assert user.currency == item["expected_currency"], f"DB currency mismatch for {item['country']}: got {user.currency}, expected {item['expected_currency']}"
            assert user.currency_symbol == item["expected_symbol"], f"Currency symbol mismatch for {item['country']}: got {user.currency_symbol}, expected {item['expected_symbol']}"
            print(f"[PASS] DB Record for {item['country']}: currency={user.currency}, symbol={user.currency_symbol}")

            # Verify in GET /api/auth/me
            res_me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert res_me.status_code == 200
            me_data = res_me.json()
            assert me_data.get("currency") == item["expected_currency"]
            assert me_data.get("currency_symbol") == item["expected_symbol"]
            print(f"[PASS] GET /auth/me for {item['country']}: currency={me_data.get('currency')}, symbol={me_data.get('currency_symbol')}")

            # Verify in GET /api/users/profile
            res_prof = requests.get(f"{BASE_URL}/api/users/profile", headers={"Authorization": f"Bearer {token}"})
            assert res_prof.status_code == 200
            prof_data = res_prof.json()
            assert prof_data.get("currency") == item["expected_currency"]
            assert prof_data.get("currency_symbol") == item["expected_symbol"]
            print(f"[PASS] GET /users/profile for {item['country']}: currency={prof_data.get('currency')}, symbol={prof_data.get('currency_symbol')}")

        print("\nAll country currency tests passed successfully!")
        return True

    finally:
        db.close()

if __name__ == "__main__":
    success = test_country_currency_assignment()
    sys.exit(0 if success else 1)
