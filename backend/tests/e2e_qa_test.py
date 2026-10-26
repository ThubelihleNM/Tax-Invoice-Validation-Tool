import os
import sys
import uuid
import requests
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.connection import SessionLocal
from app.models.users import User, AccountType, UserRole
from app.models.companies import Company
from app.models.countries import Country
from app.models.password_reset import PasswordResetToken
import bcrypt

BASE_URL = "http://127.0.0.1:8000"

def run_qa_verification():
    print("=================================================================")
    print("STARTING COMPREHENSIVE END-TO-END QA SUITE")
    print("=================================================================")
    
    db = SessionLocal()
    results = {}

    try:
        # Scenario 6 & 7: Country and tax system verification
        print("\n--- Testing Country & Tax System Endpoints (Scenarios 6, 7, 35-40) ---")
        res_countries = requests.get(f"{BASE_URL}/api/countries")
        assert res_countries.status_code == 200, "Countries API failed"
        countries = res_countries.json()
        print(f"[PASS] Retrieved {len(countries)} configured countries")

        country_checks = {
            "India": {"code": "IN", "prefix": "+91", "tax": "GST", "label": "GSTIN", "currency": "INR"},
            "South Africa": {"code": "ZA", "prefix": "+27", "tax": "VAT", "label": "VAT Number", "currency": "ZAR"},
            "United Kingdom": {"code": "GB", "prefix": "+44", "tax": "VAT", "label": "VAT Number", "currency": "GBP"},
            "Australia": {"code": "AU", "prefix": "+61", "tax": "GST", "label": "ABN", "currency": "AUD"},
            "United Arab Emirates": {"code": "AE", "prefix": "+971", "tax": "VAT", "label": "TRN", "currency": "AED"},
            "Nigeria": {"code": "NG", "prefix": "+234", "tax": "VAT", "label": "TIN", "currency": "NGN"},
            "Canada": {"code": "CA", "prefix": "+1", "tax": "GST", "label": "GST/HST Number", "currency": "CAD"}
        }

        for c_name, expected in country_checks.items():
            res_cfg = requests.get(f"{BASE_URL}/api/countries/{expected['code']}/configuration")
            assert res_cfg.status_code == 200, f"Failed config for {c_name}"
            cfg = res_cfg.json()
            assert cfg["phone_code"] == expected["prefix"], f"Phone prefix mismatch for {c_name}"
            assert cfg["tax_system"] == expected["tax"], f"Tax system mismatch for {c_name}"
            assert cfg["tax_number_label"] == expected["label"], f"Tax label mismatch for {c_name}"
            assert cfg["currency_code"] == expected["currency"], f"Currency mismatch for {c_name}"
            print(f"[PASS] {c_name} verified: prefix={cfg['phone_code']}, tax={cfg['tax_system']}, label={cfg['tax_number_label']}, currency={cfg['currency_code']}")

        # Scenario 40: Canada Multi-Tax Systems
        res_ca_systems = requests.get(f"{BASE_URL}/api/countries/CA/tax-systems")
        assert res_ca_systems.status_code == 200
        ca_systems = [s["tax_system_code"] for s in res_ca_systems.json()]
        assert "GST" in ca_systems and "HST" in ca_systems and "PST" in ca_systems
        print(f"[PASS] Canada multi-tax systems confirmed: {ca_systems}")

        # Scenario 4-16: Personal User Registration, FastAPI receipt, Database insertion, Password Hashing
        print("\n--- Testing Personal Registration & DB Persistence (Scenarios 4-16) ---")
        personal_email = f"real.qa.personal.{uuid.uuid4().hex[:6]}@taxaudit.com"
        raw_pw = "SecureQA@Pass2026!"
        reg_payload = {
            "account_type": "PERSONAL",
            "first_name": "Rohan",
            "last_name": "Sharma",
            "email": personal_email,
            "phone": "+919876543210",
            "country": "India",
            "tax_system": "GST",
            "occupation": "Chartered Accountant",
            "password": raw_pw,
            "confirm_password": raw_pw
        }
        res_reg = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
        assert res_reg.status_code == 201, f"Personal registration failed: {res_reg.text}"
        reg_data = res_reg.json()
        assert reg_data.get("message") == "Registration Successful!"
        print(f"[PASS] Registration API returned 201 Created with message: '{reg_data.get('message')}'")

        # Direct Database Verification (Scenarios 13, 14, 15)
        user_in_db = db.query(User).filter(User.email == personal_email).first()
        assert user_in_db is not None, "User not found in database!"
        print(f"[PASS] User record found in database with ID: {user_in_db.id}")
        assert user_in_db.first_name == "Rohan", "first_name mismatch"
        assert user_in_db.last_name == "Sharma", "last_name mismatch"
        assert user_in_db.email == personal_email, "email mismatch"
        assert user_in_db.phone == "+919876543210", "phone mismatch"
        assert user_in_db.country == "India", "country mismatch"
        assert user_in_db.country_code == "IN", "country_code mismatch"
        assert user_in_db.tax_system == "GST", "tax_system mismatch"
        assert user_in_db.account_type == AccountType.PERSONAL, "account_type mismatch"
        
        # Verify Password Hashing (Scenario 14)
        assert user_in_db.password_hash != raw_pw, "Password is stored in plaintext!"
        assert bcrypt.checkpw(raw_pw.encode('utf-8'), user_in_db.password_hash.encode('utf-8')), "Bcrypt hash verification failed"
        print(f"[PASS] Password securely hashed with bcrypt: {user_in_db.password_hash[:15]}...")

        # Scenario 17-20: Sign in using created account & Dashboard / Profile
        print("\n--- Testing Sign In & Profile Validation (Scenarios 17-20) ---")
        res_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": personal_email,
            "password": raw_pw
        })
        assert res_login.status_code == 200, f"Login failed: {res_login.text}"
        login_data = res_login.json()
        token = login_data.get("access_token")
        assert token is not None, "access_token missing"
        print("[PASS] Login succeeded with JWT token")

        # Verify /me authoritative profile
        res_me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert res_me.status_code == 200
        me = res_me.json()
        assert me["first_name"] == "Rohan"
        assert me["last_name"] == "Sharma"
        assert me["email"] == personal_email
        assert me["country"] == "India"
        assert me["tax_system"] == "GST"
        assert me["account_type"] == "PERSONAL"
        print(f"[PASS] Profile contains verified user info: {me['first_name']} {me['last_name']} ({me['country']} - {me['tax_system']})")

        # Scenario 22-24: Wrong password handling
        print("\n--- Testing Wrong Password Handling (Scenarios 22-24) ---")
        res_bad_pw = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": personal_email,
            "password": "IncorrectPassword123"
        })
        assert res_bad_pw.status_code == 401, f"Expected 401, got {res_bad_pw.status_code}"
        assert res_bad_pw.json()["detail"] == "Incorrect email or password."
        print(f"[PASS] Wrong password rejected with 401: '{res_bad_pw.json()['detail']}'")

        # Scenario 25-26: Duplicate registration rejection
        print("\n--- Testing Duplicate Registration (Scenarios 25-26) ---")
        res_dup = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
        assert res_dup.status_code == 409, f"Expected 409 Conflict, got {res_dup.status_code}"
        assert "already exists" in res_dup.json()["detail"].lower()
        print(f"[PASS] Duplicate email registration rejected with 409 Conflict: '{res_dup.json()['detail']}'")

        # Scenario 27-31: Password Reset Flow
        print("\n--- Testing Password Reset Flow (Scenarios 27-31) ---")
        res_forgot = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": personal_email})
        assert res_forgot.status_code == 200
        reset_token = res_forgot.json().get("reset_token")
        assert reset_token is not None, "Reset token missing in response"
        print(f"[PASS] Password recovery requested, reset token generated")

        # Verify token in DB is hashed and not plaintext
        db.rollback()
        token_entry = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_in_db.id).order_by(PasswordResetToken.id.desc()).first()
        assert token_entry is not None
        assert token_entry.token_hash != reset_token, "Token stored in plaintext in DB!"
        assert not token_entry.used, "Token prematurely marked as used"
        print(f"[PASS] Token hashed with SHA-256 in database: {token_entry.token_hash[:16]}...")

        # Reset password to new value
        new_pw = "BrandNewSecret2026!"
        res_reset = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": new_pw
        })
        assert res_reset.status_code == 200, f"Reset failed: {res_reset.text}"
        print("[PASS] Password successfully reset with new password")

        # Verify old password no longer works (Scenario 30)
        res_old_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": personal_email,
            "password": raw_pw
        })
        assert res_old_login.status_code == 401
        print("[PASS] Old password no longer works (401 Unauthorized)")

        # Verify new password works (Scenario 31)
        res_new_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": personal_email,
            "password": new_pw
        })
        assert res_new_login.status_code == 200
        print("[PASS] New password authenticated successfully (200 OK)")

        # Scenario 32-34: Business Account Registration, Company and Owner records in DB
        print("\n--- Testing Business Account Registration & Company Linking (Scenarios 32-34) ---")
        company_email = f"owner.{uuid.uuid4().hex[:6]}@aurora.ca"
        comp_payload = {
            "account_type": "COMPANY",
            "first_name": "Catherine",
            "last_name": "Tremblay",
            "company_name": "Aurora Analytics Corp",
            "business_registration_number": "BN-8833-CA",
            "tax_number": "HST-8833-CAN",
            "email": company_email,
            "phone": "+14165550188",
            "country": "Canada",
            "tax_system": "HST",
            "city": "Montreal",
            "address": "450 Saint-Jacques Street",
            "password": "BusinessPass@2026",
            "confirm_password": "BusinessPass@2026"
        }
        res_comp_reg = requests.post(f"{BASE_URL}/api/auth/register", json=comp_payload)
        assert res_comp_reg.status_code == 201, f"Company registration failed: {res_comp_reg.text}"
        print("[PASS] Business account registered with 201 Created")

        # Verify Database records for Company and Owner
        db.rollback()
        comp_user = db.query(User).filter(User.email == company_email).first()
        assert comp_user is not None
        assert comp_user.account_type == AccountType.COMPANY
        assert comp_user.role == UserRole.OWNER
        assert comp_user.tax_system == "HST"
        assert comp_user.company_id is not None
        print(f"[PASS] Business owner user created with ID {comp_user.id} and linked company_id {comp_user.company_id}")

        company_record = db.query(Company).filter(Company.id == comp_user.company_id).first()
        assert company_record is not None
        assert company_record.company_name == "Aurora Analytics Corp"
        assert company_record.registration_number == "BN-8833-CA"
        assert company_record.tax_number == "HST-8833-CAN"
        assert company_record.tax_system == "HST"
        assert company_record.owner_id == comp_user.id
        print(f"[PASS] Company record verified in database: '{company_record.company_name}' (Tax System: {company_record.tax_system})")

        # Verify Business user login and Dashboard
        res_comp_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": company_email,
            "password": "BusinessPass@2026"
        })
        assert res_comp_login.status_code == 200
        comp_token = res_comp_login.json()["access_token"]
        res_comp_me = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {comp_token}"})
        assert res_comp_me.status_code == 200
        comp_me = res_comp_me.json()
        assert comp_me["account_type"] == "COMPANY"
        assert comp_me["role"] == "Owner"
        print(f"[PASS] Business dashboard access verified for: {comp_me['first_name']} {comp_me['last_name']} (Role: {comp_me['role']})")

        # Scenario 44: Protected Routes & Auth Token Guard
        print("\n--- Testing Protected Routes & Guard (Scenario 44) ---")
        res_unauth = requests.get(f"{BASE_URL}/api/auth/me")
        assert res_unauth.status_code == 401, "Protected route allowed unauthenticated request!"
        
        res_bad_token = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer fake.tampered.token"})
        assert res_bad_token.status_code == 401, "Protected route allowed invalid token!"
        print("[PASS] Protected routes strictly enforced: unauthenticated and invalid tokens return 401")

        # Scenario 43: Logout
        print("\n--- Testing Logout Endpoint (Scenario 43) ---")
        res_logout = requests.post(f"{BASE_URL}/api/auth/logout", headers={"Authorization": f"Bearer {comp_token}"})
        assert res_logout.status_code == 200
        print(f"[PASS] Logout endpoint responded with: {res_logout.json()}")

        print("\n=================================================================")
        print("ALL BACKEND & DATABASE QA CHECKS COMPLETED WITH 100% SUCCESS!")
        print("=================================================================")
        return True

    except Exception as e:
        print(f"\n[FAIL] QA TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = run_qa_verification()
    sys.exit(0 if success else 1)
