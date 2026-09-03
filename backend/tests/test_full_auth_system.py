import unittest
import uuid
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.connection import SessionLocal
from app.models.users import User, AccountType, UserRole
from app.models.companies import Company
from app.models.countries import Country
from app.models.password_reset import PasswordResetToken

class TestFullAuthSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def setUp(self):
        self.db: Session = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_countries_and_tax_systems_api(self):
        """Test dynamic country and tax system endpoints."""
        # 1. Retrieve all countries
        res = self.client.get("/api/countries")
        self.assertEqual(res.status_code, 200)
        countries = res.json()
        self.assertGreaterEqual(len(countries), 10)
        codes = [c["code"] for c in countries]
        self.assertIn("IN", codes)
        self.assertIn("ZA", codes)
        self.assertIn("CA", codes)
        self.assertIn("GB", codes)

        # 2. Canada multi-tax systems
        res_ca = self.client.get("/api/countries/CA/tax-systems")
        self.assertEqual(res_ca.status_code, 200)
        ca_tax_codes = [t["tax_system_code"] for t in res_ca.json()]
        self.assertIn("GST", ca_tax_codes)
        self.assertIn("HST", ca_tax_codes)
        self.assertIn("PST", ca_tax_codes)

        # 3. India configuration
        res_in = self.client.get("/api/countries/India/configuration")
        self.assertEqual(res_in.status_code, 200)
        in_cfg = res_in.json()
        self.assertEqual(in_cfg["tax_system"], "GST")
        self.assertEqual(in_cfg["phone_code"], "+91")
        self.assertEqual(in_cfg["tax_number_label"], "GSTIN")

        # 4. South Africa configuration
        res_za = self.client.get("/api/countries/ZA/configuration")
        self.assertEqual(res_za.status_code, 200)
        za_cfg = res_za.json()
        self.assertEqual(za_cfg["tax_system"], "VAT")
        self.assertEqual(za_cfg["phone_code"], "+27")
        self.assertEqual(za_cfg["tax_number_label"], "VAT Number")

    def test_02_personal_user_registration_and_db_persistence(self):
        """Test personal account registration, tax system determination, and DB persistence."""
        test_email = f"personal.{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "account_type": "PERSONAL",
            "first_name": "Alexander",
            "last_name": "Hamilton",
            "email": test_email,
            "phone": "+919876543210",
            "country": "India",
            "password": "SecurePassword@2026",
            "confirm_password": "SecurePassword@2026",
            "occupation": "Tax Consultant",
            "profession": "Certified Auditor"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data["message"], "Registration Successful!")
        
        # Verify persistence in database
        user = self.db.query(User).filter(User.email == test_email).first()
        self.assertIsNotNone(user)
        self.assertEqual(user.first_name, "Alexander")
        self.assertEqual(user.last_name, "Hamilton")
        self.assertEqual(user.account_type, AccountType.PERSONAL)
        self.assertEqual(user.country, "India")
        self.assertEqual(user.country_code, "IN")
        self.assertEqual(user.tax_system, "GST")
        self.assertNotEqual(user.password_hash, "SecurePassword@2026")
        self.assertTrue(user.password_hash.startswith("$2b$") or user.password_hash.startswith("$argon2"))

    def test_03_duplicate_email_registration_rejection(self):
        """Test duplicate registration returns 409 Conflict."""
        test_email = f"dup.{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "account_type": "PERSONAL",
            "first_name": "Thomas",
            "last_name": "Jefferson",
            "email": test_email,
            "phone": "+27821234567",
            "country": "South Africa",
            "password": "Password@123456",
            "confirm_password": "Password@123456"
        }
        # First registration succeeds
        res1 = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res1.status_code, 201)

        # Duplicate registration fails with 409
        res2 = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res2.status_code, 409)
        self.assertIn("already exists", res2.json()["detail"].lower())

    def test_04_company_registration_and_db_linking(self):
        """Test company account registration, company creation, and linking to owner."""
        test_email = f"business.{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "account_type": "COMPANY",
            "first_name": "Elizabeth",
            "last_name": "Schuyler",
            "company_name": "Schuyler Industries Corp",
            "business_registration_number": "REG-CAN-9988",
            "tax_number": "GST-HST-7766",
            "email": test_email,
            "phone": "+14165550199",
            "country": "Canada",
            "tax_system": "HST",
            "city": "Toronto",
            "address": "100 Bay Street",
            "password": "CompanySecret@2026",
            "confirm_password": "CompanySecret@2026"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)

        # Verify DB records
        user = self.db.query(User).filter(User.email == test_email).first()
        self.assertIsNotNone(user)
        self.assertEqual(user.account_type, AccountType.COMPANY)
        self.assertEqual(user.role, UserRole.OWNER)
        self.assertEqual(user.tax_system, "HST")
        self.assertIsNotNone(user.company_id)

        company = self.db.query(Company).filter(Company.id == user.company_id).first()
        self.assertIsNotNone(company)
        self.assertEqual(company.company_name, "Schuyler Industries Corp")
        self.assertEqual(company.tax_system, "HST")
        self.assertEqual(company.registration_number, "REG-CAN-9988")
        self.assertEqual(company.tax_number, "GST-HST-7766")
        self.assertEqual(company.owner_id, user.id)

    def test_05_login_success_and_wrong_password_handling(self):
        """Test login with wrong password returns 401 and valid login succeeds with token."""
        test_email = f"login.test.{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = {
            "account_type": "PERSONAL",
            "first_name": "James",
            "last_name": "Madison",
            "email": test_email,
            "country": "United Kingdom",
            "password": "CorrectPassword@123",
            "confirm_password": "CorrectPassword@123"
        }
        self.client.post("/api/auth/register", json=reg_payload)

        # 1. Wrong password attempt
        bad_res = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "WrongPassword@999"
        })
        self.assertEqual(bad_res.status_code, 401)
        self.assertEqual(bad_res.json()["detail"], "Incorrect email or password.")

        # 2. Correct password attempt
        good_res = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "CorrectPassword@123"
        })
        self.assertEqual(good_res.status_code, 200)
        login_data = good_res.json()
        self.assertIn("access_token", login_data)
        token = login_data["access_token"]

        # 3. Authenticated /me verification
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.json()
        self.assertEqual(me_data["email"], test_email)
        self.assertEqual(me_data["tax_system"], "VAT")

    def test_06_password_recovery_and_reset_token_expiration(self):
        """Test secure password reset token generation, hashing, expiration, and invalidation."""
        test_email = f"recovery.{uuid.uuid4().hex[:8]}@example.com"
        reg_payload = {
            "account_type": "PERSONAL",
            "first_name": "Benjamin",
            "last_name": "Franklin",
            "email": test_email,
            "country": "United States",
            "password": "OldPassword@123",
            "confirm_password": "OldPassword@123"
        }
        self.client.post("/api/auth/register", json=reg_payload)

        # 1. Request password reset
        forgot_res = self.client.post("/api/auth/forgot-password", json={"email": test_email})
        self.assertEqual(forgot_res.status_code, 200)
        dev_token = forgot_res.json().get("reset_token")
        self.assertIsNotNone(dev_token)

        # Verify token is hashed in DB
        reset_entry = self.db.query(PasswordResetToken).filter(PasswordResetToken.used == False).all()
        token_hashes = [entry.token_hash for entry in reset_entry]
        self.assertNotIn(dev_token, token_hashes)  # Raw token must NOT be stored in plaintext!

        # 2. Reset password using valid token
        reset_res = self.client.post("/api/auth/reset-password", json={
            "token": dev_token,
            "new_password": "BrandNewPassword@2026"
        })
        self.assertEqual(reset_res.status_code, 200)

        # 3. Token cannot be reused (single-use check)
        reused_res = self.client.post("/api/auth/reset-password", json={
            "token": dev_token,
            "new_password": "AnotherPassword@999"
        })
        self.assertEqual(reused_res.status_code, 400)

        # 4. Old password fails
        old_login = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "OldPassword@123"
        })
        self.assertEqual(old_login.status_code, 401)

        # 5. New password succeeds
        new_login = self.client.post("/api/auth/login", json={
            "email": test_email,
            "password": "BrandNewPassword@2026"
        })
        self.assertEqual(new_login.status_code, 200)

    def test_07_data_isolation_between_personal_and_business(self):
        """Test that Personal users and Business accounts are properly data isolated."""
        # 1. Register Personal user A
        email_a = f"person.a.{uuid.uuid4().hex[:6]}@example.com"
        reg_a = self.client.post("/api/auth/register", json={
            "account_type": "PERSONAL",
            "first_name": "User",
            "last_name": "A",
            "email": email_a,
            "country": "India",
            "password": "Password@123",
            "confirm_password": "Password@123"
        })
        token_a = reg_a.json()["access_token"]

        # 2. Register Personal user B
        email_b = f"person.b.{uuid.uuid4().hex[:6]}@example.com"
        reg_b = self.client.post("/api/auth/register", json={
            "account_type": "PERSONAL",
            "first_name": "User",
            "last_name": "B",
            "email": email_b,
            "country": "South Africa",
            "password": "Password@123",
            "confirm_password": "Password@123"
        })
        token_b = reg_b.json()["access_token"]

        # 3. User A and User B query invoices
        inv_a = self.client.get("/api/invoices", headers={"Authorization": f"Bearer {token_a}"})
        inv_b = self.client.get("/api/invoices", headers={"Authorization": f"Bearer {token_b}"})
        self.assertEqual(inv_a.status_code, 200)
        self.assertEqual(inv_b.status_code, 200)
        self.assertEqual(len(inv_a.json()), 0)
        self.assertEqual(len(inv_b.json()), 0)

        # 4. Check analytics summary isolation
        stat_a = self.client.get("/api/analytics/summary", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(stat_a.status_code, 200)
        self.assertEqual(stat_a.json()["total_invoices"], 0)

if __name__ == "__main__":
    unittest.main()
