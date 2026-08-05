from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from app.database.connection import get_db
from app.authentication.jwt import require_admin, require_any_role
from app.models.users import User
from app.models.settings import SystemSettings
from app.repositories.audit_repository import audit_repository

router = APIRouter(prefix="/settings", tags=["System Settings"])

class RulesConfigRequest(BaseModel):
    rules_config: Dict[str, Any]

class SettingsUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    default_vat_rate: Optional[float] = None
    currency: Optional[str] = None
    theme: Optional[str] = None

@router.get("")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Retrieve site settings from database."""
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings record not found.")
    return settings

@router.put("")
def update_settings(
    data: SettingsUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Update settings (Admin only)."""
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings record not found.")
        
    if data.company_name is not None:
        settings.company_name = data.company_name
    if data.default_vat_rate is not None:
        settings.default_vat_rate = data.default_vat_rate
    if data.currency is not None:
        settings.currency = data.currency
    if data.theme is not None:
        settings.theme = data.theme
        
    db.commit()
    db.refresh(settings)

    audit_repository.create(
        db,
        user_id=admin_user.id,
        action="SETTINGS_UPDATE",
        description="Modified basic company settings."
    )

    return settings

@router.get("/rules")
def get_rules_configuration(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Retrieve business validation rules configurations."""
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings record not found.")
    return settings.rules_config or {}

@router.put("/rules")
def update_rules_configuration(
    req: RulesConfigRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Update rules configurations and tolerances (Admin only)."""
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings record not found.")
        
    settings.rules_config = req.rules_config
    db.commit()
    db.refresh(settings)

    audit_repository.create(
        db,
        user_id=admin_user.id,
        action="RULES_ENGINE_UPDATE",
        description="Modified invoice validation business rules parameters and tolerances."
    )

    return settings.rules_config
