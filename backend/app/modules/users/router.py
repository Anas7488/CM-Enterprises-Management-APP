from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.dependencies import get_db, require_role, get_current_user
from app.shared.enums.roles import UserRole
from app.modules.users.schema import UserOut, UserCreate, UserUpdate
from app.modules.users import service

router = APIRouter()


@router.get("/", response_model=List[UserOut])
def list_users(
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """List all users. Admin only."""
    return service.get_users(db, role=role)


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """Get single user by ID. Admin only."""
    user = service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """Create a new user / sales executive. Admin only."""
    try:
        return service.create_user(db, payload.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """Update user details, route assignment, or password. Admin only."""
    try:
        return service.update_user(db, user_id, payload.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    """Deactivate a user. Admin only."""
    try:
        return service.delete_user(db, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
