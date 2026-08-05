from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.config.config import settings
from app.database.connection import engine, Base, SessionLocal
from app.api import auth, users, audit, invoices, validation, reports, analytics, settings as api_settings, system, ai

# Database startup seeding
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Seed default users
    db = SessionLocal()
    try:
        from app.models.users import User, UserRole, UserStatus
        from app.authentication.jwt import get_password_hash
        
        users_seed = [
            {
                "email": "admin@enterprise.com",
                "password": "Admin@123",
                "first_name": "System",
                "last_name": "Admin",
                "role": UserRole.ADMINISTRATOR
            },
            {
                "email": "accountant@enterprise.com",
                "password": "Accountant@123",
                "first_name": "Sarah",
                "last_name": "Accountant",
                "role": UserRole.ACCOUNTANT
            },
            {
                "email": "auditor@enterprise.com",
                "password": "Auditor@123",
                "first_name": "Mark",
                "last_name": "Auditor",
                "role": UserRole.AUDITOR
            }
        ]
        
        for u in users_seed:
            exists = db.query(User).filter(User.email == u["email"]).first()
            if not exists:
                new_user = User(
                    email=u["email"],
                    first_name=u["first_name"],
                    last_name=u["last_name"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                    status=UserStatus.ACTIVE
                )
                db.add(new_user)
        db.commit()
        
        # Seed default system settings & rules engine configuration (Module 5)
        from app.models.settings import SystemSettings
        settings_exists = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
        if not settings_exists:
            default_rules = {
                "rule_invoice_number_required": True,
                "rule_invoice_number_unique": True,
                "rule_supplier_name_required": True,
                "rule_supplier_exists": True,
                "rule_supplier_tax_number_required": True,
                "rule_supplier_tax_number_format": True,
                "rule_invoice_date_required": True,
                "rule_invoice_date_past": True,
                "rule_due_date_after_invoice": True,
                "rule_subtotal_positive": True,
                "rule_vat_recalculate": True,
                "rule_grand_total_calculate": True,
                "rule_currency_supported": True,
                "rule_po_required": False,
                "vat_tolerance": 0.05,
                "max_invoice_age_days": 365
            }
            new_settings = SystemSettings(
                id=1,
                company_name="Enterprise Solutions Ltd",
                default_vat_rate=15.00,
                currency="USD",
                theme="light",
                rules_config=default_rules
            )
            db.add(new_settings)
            db.commit()
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()
        
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(HTTPException := Exception)
async def global_exception_handler(request: Request, exc: Exception):
    status_code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", "Internal server error occurred")
    return JSONResponse(
        status_code=status_code,
        content={"detail": detail}
    )

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(invoices.router, prefix=settings.API_V1_STR)
app.include_router(validation.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(api_settings.router, prefix=settings.API_V1_STR)
app.include_router(system.router, prefix=settings.API_V1_STR)
app.include_router(ai.router, prefix=settings.API_V1_STR)

# Serve uploaded profile photos dynamically
os.makedirs(os.path.join(settings.UPLOAD_DIR, "profiles"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Tax Invoice Validation API"}
