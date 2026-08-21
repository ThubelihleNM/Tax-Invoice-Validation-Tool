from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional, Tuple
from app.models.users import User, UserRole, UserStatus
from app.schemas.users import UserCreate, UserUpdate
from app.authentication.jwt import get_password_hash

class UserRepository:
    def get_by_id(self, db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email).first()

    def get_by_reset_token(self, db: Session, token: str) -> Optional[User]:
        return db.query(User).filter(User.password_reset_token == token).first()

    def get_multi(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 10,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None
    ) -> Tuple[List[User], int]:
        query = db.query(User)
        
        # Filtering
        if role:
            query = query.filter(User.role == role)
        if status:
            query = query.filter(User.status == status)
            
        # Searching
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    User.first_name.ilike(search_filter),
                    User.last_name.ilike(search_filter),
                    User.email.ilike(search_filter),
                    User.phone.ilike(search_filter)
                )
            )
            
        total = query.count()
        results = query.order_by(User.id.desc()).offset(skip).limit(limit).all()
        return results, total

    def create(self, db: Session, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            phone=obj_in.phone,
            password_hash=get_password_hash(obj_in.password),
            role=obj_in.role,
            status=obj_in.status
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(self, db: Session, db_obj: User, obj_in: UserUpdate) -> User:
        update_data = obj_in.model_dump(exclude_unset=True)
        if "password" in update_data and update_data["password"]:
            password_hash = get_password_hash(update_data["password"])
            db_obj.password_hash = password_hash
            del update_data["password"]
            
        for field, value in update_data.items():
            setattr(db_obj, field, value)
            
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def delete(self, db: Session, user_id: int) -> bool:
        db_obj = db.query(User).filter(User.id == user_id).first()
        if db_obj:
            db.delete(db_obj)
            db.commit()
            return True
        return False

user_repository = UserRepository()
