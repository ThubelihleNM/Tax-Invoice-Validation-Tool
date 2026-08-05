from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.database.connection import get_db
from app.repositories.audit_repository import audit_repository
from app.authentication.jwt import require_admin
from app.models.users import User

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("")
def get_audit_logs(
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    status: Optional[str] = None,
    ip_address: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Retrieve audit logs with advanced query filters (Admin only)."""
    logs, total = audit_repository.get_multi(
        db,
        skip=skip,
        limit=limit,
        user_id=user_id,
        action=action,
        status=status,
        ip_address=ip_address,
        role=role,
        search=search
    )
    
    # Format response fields
    formatted = []
    for log in logs:
        user_lbl = f"{log.user.first_name} {log.user.last_name}" if log.user else "System"
        role_lbl = log.user.role.value if log.user else "System"
        formatted.append({
            "log_id": log.log_id,
            "created_at": log.created_at,
            "user": user_lbl,
            "role": role_lbl,
            "action": log.action,
            "description": log.description,
            "ip_address": log.ip_address or "N/A",
            "browser": log.browser or "N/A",
            "device": log.device or "Desktop",
            "os": log.os or "Windows",
            "status": log.status
        })
        
    return {"logs": formatted, "total": total}
