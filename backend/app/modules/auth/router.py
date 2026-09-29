from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.modules.auth.schema import LoginRequest, TokenResponse, UserOut, RefreshRequest, RefreshResponse
from app.modules.auth import service

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate with email + password.
    Returns access_token, refresh_token, and user info.
    """
    return service.login(request, db)


@router.post("/refresh", response_model=RefreshResponse)
def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    """
    Exchange refresh token for a new access token.
    """
    new_token = service.refresh(request.refresh_token, db)
    return RefreshResponse(access_token=new_token)



@router.get("/me", response_model=UserOut)
def me(current_user: dict = Depends(get_current_user)):
    """
    Returns the currently authenticated user's info from the JWT payload.
    No DB hit required — reads directly from the token.
    """
    return UserOut(
        id=current_user["id"],
        name=current_user["name"],
        email=current_user["sub"],
        role=current_user["role"],
    )
