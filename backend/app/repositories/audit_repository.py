from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List, Tuple, Optional
from app.models.audit import AuditLog
from app.models.users import User

class AuditRepository:
    def create(
        self,
        db: Session,
        user_id: Optional[int],
        action: str,
        description: Optional[str] = None,
        ip_address: Optional[str] = None,
        browser: Optional[str] = None,
        device: Optional[str] = None,
        os: Optional[str] = None,
        status: str = "Success"
    ) -> AuditLog:
        db_obj = AuditLog(
            user_id=user_id,
            action=action,
            description=description,
            ip_address=ip_address,
            browser=browser,
            device=device,
            os=os,
            status=status
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_multi(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 50,
        user_id: Optional[int] = None,
        action: Optional[str] = None,
        status: Optional[str] = None,
        ip_address: Optional[str] = None,
        role: Optional[str] = None,
        search: Optional[str] = None
    ) -> Tuple[List[AuditLog], int]:
        query = db.query(AuditLog)
        
        # Apply filters
        if user_id is not None:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)
        if status:
            query = query.filter(AuditLog.status == status)
        if ip_address:
            query = query.filter(AuditLog.ip_address == ip_address)
            
        if role:
            query = query.join(User).filter(User.role == role)
            
        if search:
            search_filter = f"%{search}%"
            # Join user to search first/last names or descriptions
            query = query.outerjoin(User).filter(
                or_(
                    AuditLog.description.ilike(search_filter),
                    AuditLog.action.ilike(search_filter),
                    User.first_name.ilike(search_filter),
                    User.last_name.ilike(search_filter)
                )
            )
            
        total = query.count()
        results = query.order_by(AuditLog.log_id.desc()).offset(skip).limit(limit).all()
        return results, total

audit_repository = AuditRepository()
