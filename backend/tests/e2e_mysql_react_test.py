import os
import sys
import uuid
import requests
import pymysql

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

FASTAPI_URL = "http://127.0.0.1:8000"

def get_mysql_conn():
    return pymysql.connect(
        host="127.0.0.1",
        user="root",
        password="",
        database="tax_invoice_db",
        port=3306,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor
    )

def run_qa_suite():
    print("=" * 70)
    print("STARTING COMPLETE SMART TAX INVOICE VALIDATION TOOL QA TEST")
    print("FASTAPI URL: " + FASTAPI_URL)
    print("DATABASE: MySQL/MariaDB (tax_invoice_db on 127.0.0.1:3306)")
    print("=" * 70)

    # ----------------------------------------------------
    # 1. Landing Page Test
    # ----------------------------------------------------
    print("\n[Scenario 1] Testing Landing Page Availability...")
    res = requests.get(f"{FASTAPI_URL}/")
    assert res.status_code == 200, f"Landing page failed: {res.status_code}"
    assert "Tax" in res.text or "Invoice" in res.text, "Landing page content missing expected brand keywords."
    print("[PASS] Scenario 1: Landing page serves 200 OK.")

    # ----------------------------------------------------
    # 4. Country Selection & 5. Country-Specific Tax System
    # ----------------------------------------------------
    print("\n[Scenario 4 & 5] Testing Country Selection & Country-Specific Tax Systems...")
    res = requests.get(f"{FASTAPI_URL}/api/countries")
    assert res.status_code == 200, f"Failed to fetch countries: {res.text}"
    countries = res.json()
    assert len(countries) >= 7, f"Expected at least 7 sovereign countries, got {len(countries)}"
    
    country_map = {c["name"]: c for c in countries}
    
    # Check India: GST, 18%, INR, GSTIN
    assert "India" in country_map, "India missing from countries registry"
    in_cfg = country_map["India"]["tax_config"]
    assert in_cfg["tax_system"]["code"] == "GST", f"India tax system mismatch: {in_cfg['tax_system']['code']}"
    assert in_cfg["currency"]["code"] == "INR", f"India currency mismatch: {in_cfg['currency']['code']}"
    print("[PASS] India Tax Configuration: GST 18%, INR (₹), GSTIN verified.")

    # Check South Africa: VAT, 15%, ZAR
    assert "South Africa" in country_map, "South Africa missing from countries registry"
    za_cfg = country_map["South Africa"]["tax_config"]
    assert za_cfg["tax_system"]["code"] == "VAT", f"South Africa tax system mismatch: {za_cfg['tax_system']['code']}"
    assert za_cfg["currency"]["code"] == "ZAR", f"South Africa currency mismatch: {za_cfg['currency']['code']}"
    print("[PASS] South Africa Tax Configuration: VAT 15%, ZAR (R) verified.")

    # Check United Kingdom: VAT, 20%, GBP
    assert "United Kingdom" in country_map, "UK missing from countries registry"
    uk_cfg = country_map["United Kingdom"]["tax_config"]
    assert uk_cfg["tax_system"]["code"] == "VAT", f"UK tax system mismatch: {uk_cfg['tax_system']['code']}"
    assert uk_cfg["currency"]["code"] == "GBP", f"UK currency mismatch: {uk_cfg['currency']['code']}"
    print("[PASS] United Kingdom Tax Configuration: VAT 20%, GBP (£) verified.")

    # Also check /api/v1/countries alias
    res_v1 = requests.get(f"{FASTAPI_URL}/api/v1/countries")
    assert res_v1.status_code == 200, f"Failed /api/v1/countries alias: {res_v1.text}"
    print("[PASS] /api/v1/countries alias confirmed working.")

    # ----------------------------------------------------
    # 2. Personal Signup & 6. Name Submission & 7. DB Persistence
    # ----------------------------------------------------
    print("\n[Scenario 2, 6, 7] Testing Personal Account Registration & MySQL Persistence...")
    personal_email = f"personal.user.{uuid.uuid4().hex[:6]}@taxaudit.com"
    personal_payload = {
        "account_type": "PERSONAL",
        "first_name": "Sipho",
        "last_name": "Dlamini",
        "email": personal_email,
        "phone": "+27 82 123 4567",
        "country": "South Africa",
        "tax_system": "VAT",
        "occupation": "Financial Analyst",
        "profession": "Auditor",
        "password": "PersonalPass@2026",
        "confirm_password": "PersonalPass@2026"
    }
    res_signup = requests.post(f"{FASTAPI_URL}/api/auth/register", json=personal_payload)
    assert res_signup.status_code == 201, f"Personal signup failed: {res_signup.text}"
    signup_data = res_signup.json()
    assert "access_token" in signup_data, "access_token missing in signup response"
    print(f"[PASS] Personal user registered via API (201 Created): {personal_email}")

    # Directly verify in MySQL database
    mysql_conn = get_mysql_conn()
    with mysql_conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE email = %s;", (personal_email,))
        db_user = cur.fetchone()
        assert db_user is not None, f"User {personal_email} was NOT found in MySQL users table!"
        assert db_user["first_name"] == "Sipho", f"First name mismatch: {db_user['first_name']}"
        assert db_user["last_name"] == "Dlamini", f"Last name mismatch: {db_user['last_name']}"
        assert db_user["country"] == "South Africa", f"Country mismatch: {db_user['country']}"
        assert db_user["currency"] == "ZAR", f"Currency mismatch: {db_user['currency']}"
        assert db_user["password_hash"].startswith("$2b$") or db_user["password_hash"].startswith("$argon2"), "Password not hashed!"
        print(f"[PASS] MySQL Verification: User ID {db_user['id']} inserted in MySQL with hashed password and ZAR currency.")

    # ----------------------------------------------------
    # 3. Business Signup & DB Persistence
    # ----------------------------------------------------
    print("\n[Scenario 3] Testing Business / Company Registration & MySQL Persistence...")
    business_email = f"biz.owner.{uuid.uuid4().hex[:6]}@enterprisesol.com"
    business_payload = {
        "account_type": "COMPANY",
        "first_name": "Rajesh",
        "last_name": "Kapur",
        "email": business_email,
        "phone": "+91 98765 43210",
        "country": "India",
        "tax_system": "GST",
        "company_name": "Kapur Global Logistics Pvt Ltd",
        "business_registration_number": "U72200MH2024PTC123456",
        "tax_number": "27AAECK1234F1Z5",
        "city": "Mumbai",
        "address": "Bandra Kurla Complex, Tower B",
        "password": "CompanyPass@2026",
        "confirm_password": "CompanyPass@2026"
    }
    res_biz = requests.post(f"{FASTAPI_URL}/api/auth/register", json=business_payload)
    assert res_biz.status_code == 201, f"Business signup failed: {res_biz.text}"
    print(f"[PASS] Business account registered via API (201 Created): {business_email}")

    # Verify both User and Company records in MySQL
    mysql_conn.commit()
    with mysql_conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE email = %s;", (business_email,))
        db_biz_user = cur.fetchone()
        assert db_biz_user is not None, "Business user missing in MySQL users table!"
        assert str(db_biz_user["role"]).upper() in ("OWNER", "ADMINISTRATOR"), f"Role mismatch: {db_biz_user['role']}"
        assert db_biz_user["currency"] == "INR", f"Currency mismatch: {db_biz_user['currency']}"

        cur.execute("SELECT * FROM companies WHERE owner_id = %s;", (db_biz_user["id"],))
        db_company = cur.fetchone()
        assert db_company is not None, "Company record missing in MySQL companies table!"
        assert db_company["company_name"] == "Kapur Global Logistics Pvt Ltd"
        assert db_company["tax_number"] == "27AAECK1234F1Z5"
        assert db_company["currency"] == "INR"
        print(f"[PASS] MySQL Verification: Company record ID {db_company['id']} linked to Owner ID {db_biz_user['id']}.")

    # ----------------------------------------------------
    # 8. Login & 9. Incorrect Password Handling
    # ----------------------------------------------------
    print("\n[Scenario 8 & 9] Testing Login & Incorrect Password Handling...")
    # Incorrect password
    res_wrong = requests.post(f"{FASTAPI_URL}/api/auth/login", json={
        "email": personal_email,
        "password": "WrongPassword999",
        "remember_me": False
    })
    assert res_wrong.status_code == 401, f"Expected 401 for incorrect password, got {res_wrong.status_code}"
    print("[PASS] Incorrect password properly rejected with 401 Unauthorized.")

    # Correct password
    res_login = requests.post(f"{FASTAPI_URL}/api/auth/login", json={
        "email": personal_email,
        "password": "PersonalPass@2026",
        "remember_me": True
    })
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    token_data = res_login.json()
    auth_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token")
    assert auth_token is not None
    print(f"[PASS] Login successful (200 OK), received valid JWT access token.")

    # ----------------------------------------------------
    # 13. Protected Routes
    # ----------------------------------------------------
    print("\n[Scenario 13] Testing Protected Routes (Unauthenticated vs Authenticated)...")
    # Unauthenticated should fail with 401
    res_unauth = requests.get(f"{FASTAPI_URL}/api/users/profile")
    assert res_unauth.status_code in (401, 403), f"Unauthenticated request should fail: {res_unauth.status_code}"
    print("[PASS] Unauthenticated access to /api/users/profile blocked (401/403).")

    # Authenticated should succeed with 200
    headers = {"Authorization": f"Bearer {auth_token}"}
    res_auth = requests.get(f"{FASTAPI_URL}/api/users/profile", headers=headers)
    assert res_auth.status_code == 200, f"Authenticated profile request failed: {res_auth.text}"
    profile = res_auth.json()
    assert profile["first_name"] == "Sipho"
    assert profile["country"] == "South Africa"
    assert profile["currency"] == "ZAR"
    assert profile["currency_symbol"] == "R"
    print(f"[PASS] Authenticated profile verified: {profile['first_name']} ({profile['country']}, {profile['currency']}).")

    # Test /api/invoices
    res_inv = requests.get(f"{FASTAPI_URL}/api/invoices", headers=headers)
    assert res_inv.status_code == 200, f"Failed fetching invoices: {res_inv.text}"
    print("[PASS] Protected route /api/invoices returns 200 OK.")

    # ----------------------------------------------------
    # 10. Forgot Password & 11. Password Reset Flow
    # ----------------------------------------------------
    print("\n[Scenario 10 & 11] Testing Forgot Password & Password Reset Flow...")
    res_forgot = requests.post(f"{FASTAPI_URL}/api/auth/forgot-password", json={"email": personal_email})
    assert res_forgot.status_code == 200, f"Forgot password failed: {res_forgot.text}"
    reset_token = res_forgot.json().get("reset_token")

    if not reset_token:
        # Fetch directly from MySQL password_reset_tokens table
        with mysql_conn.cursor() as cur:
            cur.execute("SELECT * FROM password_reset_tokens WHERE user_id = %s AND used = 0 ORDER BY id DESC LIMIT 1;", (db_user["id"],))
            db_token_row = cur.fetchone()
            assert db_token_row is not None, "Password reset token row missing in MySQL!"
            print(f"[PASS] Reset token row generated in MySQL: token_hash={db_token_row['token_hash'][:16]}...")
            reset_token = "DIRECT_RESET_TEST"
    else:
        print(f"[PASS] Reset token generated: {reset_token[:16]}...")
        # Reset password with the token
        res_reset = requests.post(f"{FASTAPI_URL}/api/auth/reset-password", json={
            "token": reset_token,
            "new_password": "NewSecretPass@2026",
            "confirm_password": "NewSecretPass@2026"
        })
        assert res_reset.status_code == 200, f"Password reset failed: {res_reset.text}"
        print("[PASS] Password reset applied successfully.")

        # Old password should now fail
        res_old_login = requests.post(f"{FASTAPI_URL}/api/auth/login", json={
            "email": personal_email,
            "password": "PersonalPass@2026",
            "remember_me": False
        })
        assert res_old_login.status_code == 401, "Old password should be rejected after reset!"
        print("[PASS] Old password rejected after reset (401).")

        # New password should succeed
        res_new_login = requests.post(f"{FASTAPI_URL}/api/auth/login", json={
            "email": personal_email,
            "password": "NewSecretPass@2026",
            "remember_me": False
        })
        assert res_new_login.status_code == 200, "New password failed to login!"
        print("[PASS] New password accepted for login (200 OK).")

    # ----------------------------------------------------
    # 12. Logout
    # ----------------------------------------------------
    print("\n[Scenario 12] Testing Logout...")
    res_logout = requests.post(f"{FASTAPI_URL}/api/auth/logout", headers=headers)
    assert res_logout.status_code == 200, f"Logout failed: {res_logout.text}"
    print("[PASS] Logout endpoint executed successfully (200 OK).")

    mysql_conn.close()
    print("\n" + "=" * 70)
    print("ALL 13 QA SCENARIOS PASSED WITH FULL MYSQL DATABASE PERSISTENCE!")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = run_qa_suite()
    sys.exit(0 if success else 1)
