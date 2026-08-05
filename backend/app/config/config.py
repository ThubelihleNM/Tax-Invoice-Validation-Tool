import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Tax Invoice Validation Tool"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "supersecretkeythatsshouldbechangedinproduction1234567890")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./invoice_db.db")
    
    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    
    # System Defaults
    DEFAULT_VAT_RATE: float = 15.0
    DEFAULT_CURRENCY: str = "USD"
    DEFAULT_THEME: str = "light"
    COMPANY_NAME: str = "Enterprise Solutions Ltd"
    COMPANY_LOGO: str = ""

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
