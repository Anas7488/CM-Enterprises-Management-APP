from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.users.model import User
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.modules.auth.schema import LoginRequest, TokenResponse, UserOut


def login(request: LoginRequest, db: Session) -> TokenResponse:
    # 1. Find user by email (case-insensitive)
    user: User | None = db.query(User).filter(
        User.email == request.email.strip().lower()
    ).first()

    # 2. Validate credentials
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact admin.",
        )

    # 4. Build token payload
    token_data = {
        "sub": user.email,
        "id": user.id,
        "name": user.name,
        "role": user.role.value,
    }

    # 5. Issue tokens
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": user.email})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role.value,
            phone=user.phone,
        ),
    )


def refresh(refresh_token_str: str, db: Session) -> str:
    from app.core.security import decode_token
    payload = decode_token(refresh_token_str)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user: User | None = db.query(User).filter(
        User.email == payload["sub"].strip().lower()
    ).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    token_data = {
        "sub": user.email,
        "id": user.id,
        "name": user.name,
        "role": user.role.value,
    }
    return create_access_token(token_data)

