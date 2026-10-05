from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.modules.users.model import User, UserRole
from app.core.security import hash_password


def get_users(db: Session, role: Optional[str] = None) -> List[User]:
    query = db.query(User).options(joinedload(User.assigned_route)).order_by(User.name)
    if role:
        query = query.filter(User.role == UserRole(role))
    return query.all()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).options(joinedload(User.assigned_route)).filter_by(id=user_id).first()


def create_user(db: Session, data: dict) -> User:
    email_clean = data["email"].strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise ValueError(f"Email '{email_clean}' is already registered.")

    user = User(
        name=data["name"].strip(),
        email=email_clean,
        phone=data.get("phone") or None,
        hashed_password=hash_password(data["password"]),
        role=UserRole(data.get("role", "sales_executive")),
        assigned_route_id=data.get("assigned_route_id") or None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, data: dict) -> User:
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise ValueError(f"User #{user_id} not found")

    if "email" in data and data["email"]:
        new_email = data["email"].strip().lower()
        if new_email != user.email:
            existing = db.query(User).filter(User.email == new_email).first()
            if existing:
                raise ValueError(f"Email '{new_email}' is already in use.")
            user.email = new_email

    if "name" in data and data["name"] is not None:
        user.name = data["name"].strip()
    if "phone" in data:
        user.phone = data["phone"] or None
    if "role" in data and data["role"] is not None:
        user.role = UserRole(data["role"])
    if "assigned_route_id" in data:
        user.assigned_route_id = data["assigned_route_id"] or None
    if "is_active" in data and data["is_active"] is not None:
        user.is_active = bool(data["is_active"])
    if "password" in data and data["password"]:
        user.hashed_password = hash_password(data["password"])

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> dict:
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise ValueError(f"User #{user_id} not found")
    user.is_active = False
    db.commit()
    return {"message": f"User {user.name} deactivated successfully", "id": user_id}
