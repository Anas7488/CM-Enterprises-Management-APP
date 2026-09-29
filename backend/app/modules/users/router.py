from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, require_role
from app.shared.enums.roles import UserRole
from app.modules.users.model import User, UserRole as UserRoleEnum
from app.modules.users.schema import UserOut, UserCreate
from app.core.security import hash_password

router = APIRouter()


@router.get("/", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _: dict = Depends(require_role(UserRole.ADMIN)),
):
    """List all users. Admin only."""
    return db.query(User).all()


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role(UserRole.ADMIN)),
):
    """Create a new user. Admin only."""
    # Check email uniqueness
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{payload.email}' is already registered.",
        )

    user = User(
        name=payload.name,
        email=payload.email.strip().lower(),
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=UserRoleEnum(payload.role),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
