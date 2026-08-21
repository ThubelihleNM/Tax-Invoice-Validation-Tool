import unittest
import sys
import os

# Adjust path to import app modules correctly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.connection import SessionLocal, engine, Base
from app.api.auth import RegisterRequest, register
from app.models.users import User
from app.main import upgrade_db_schema
from fastapi import HTTPException

class TestAuthRedesign(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create database tables if they do not exist
        Base.metadata.create_all(bind=engine)
        # Execute Alter table schema upgrades
        upgrade_db_schema()

    def setUp(self):
        self.db = SessionLocal()
        # Clean up any leftover test users if they exist
        self.db.query(User).filter(User.email.in_([
            "personal.test@example.com", 
            "company.test@example.com", 
            "invalid.test@example.com"
        ])).delete()
        self.db.commit()

    def tearDown(self):
        # Rollback and clean up after each test runs
        self.db.query(User).filter(User.email.in_([
            "personal.test@example.com", 
            "company.test@example.com", 
            "invalid.test@example.com"
        ])).delete()
        self.db.commit()
        self.db.close()

    def test_personal_registration_success(self):
        """Verify registering a Personal account succeeds and populates personal fields."""
        data = RegisterRequest(
            account_type="PERSONAL",
            first_name="Jane",
            last_name="Doe",
            email="personal.test@example.com",
            phone="+123456789",
            password="securePassword123",
            occupation="Independent Auditor",
            country="Germany"
        )
        
        response = register(data, db=self.db)
        self.assertIn("access_token", response)
        self.assertEqual(response["user"].account_type.value, "PERSONAL")
        self.assertEqual(response["user"].occupation, "Independent Auditor")
        self.assertEqual(response["user"].country, "Germany")
        self.assertIsNone(response["user"].company_name)

        # Check DB directly
        db_user = self.db.query(User).filter(User.email == "personal.test@example.com").first()
        self.assertIsNotNone(db_user)
        self.assertEqual(db_user.account_type.value, "PERSONAL")
        self.assertEqual(db_user.occupation, "Independent Auditor")

    def test_company_registration_success(self):
        """Verify registering a Company account succeeds and populates company fields."""
        data = RegisterRequest(
            account_type="COMPANY",
            first_name="John",
            last_name="Smith",
            email="company.test@example.com",
            phone="+987654321",
            password="anotherSecurePassword",
            company_name="Acme Solutions Ltd",
            business_registration_number="REG-991823",
            tax_number="VAT-9918234",
            country="France",
            city="Paris",
            address="15 Rue de Rivoli"
        )
        
        response = register(data, db=self.db)
        self.assertIn("access_token", response)
        self.assertEqual(response["user"].account_type.value, "COMPANY")
        self.assertEqual(response["user"].company_name, "Acme Solutions Ltd")
        self.assertEqual(response["user"].business_registration_number, "REG-991823")
        self.assertEqual(response["user"].tax_number, "VAT-9918234")
        self.assertEqual(response["user"].city, "Paris")
        self.assertIsNone(response["user"].occupation)

        # Check DB directly
        db_user = self.db.query(User).filter(User.email == "company.test@example.com").first()
        self.assertIsNotNone(db_user)
        self.assertEqual(db_user.account_type.value, "COMPANY")
        self.assertEqual(db_user.company_name, "Acme Solutions Ltd")

    def test_company_registration_validation_fails(self):
        """Verify registering a Company account fails if required company details are missing."""
        data = RegisterRequest(
            account_type="COMPANY",
            first_name="Invalid",
            last_name="Tester",
            email="invalid.test@example.com",
            phone="+987654321",
            password="password12345",
            company_name="", # Missing company details
            business_registration_number="",
            tax_number=""
        )
        
        with self.assertRaises(HTTPException) as context:
            register(data, db=self.db)
            
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Company name is required", context.exception.detail)

if __name__ == "__main__":
    unittest.main()
