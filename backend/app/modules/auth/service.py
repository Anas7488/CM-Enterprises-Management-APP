from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.users.model import User
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.modules.auth.schema import LoginRequest, TokenResponse, UserOut


def login(request: LoginRequest, db: Session) -> TokenResponse:
    from sqlalchemy.orm import joinedload
    # 1. Find user by email (case-insensitive)
    user: User | None = (
        db.query(User)
        .options(joinedload(User.assigned_route))
        .filter(User.email == request.email.strip().lower())
        .first()
    )

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

    route_no = user.assigned_route.route_number if user.assigned_route else None

    # 4. Build token payload
    token_data = {
        "sub": user.email,
        "id": user.id,
        "name": user.name,
        "role": user.role.value,
        "assigned_route_id": user.assigned_route_id,
        "assigned_route_number": route_no,
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
            assigned_route_id=user.assigned_route_id,
            assigned_route_number=route_no,
        ),
    )


def refresh(refresh_token_str: str, db: Session) -> str:
    from app.core.security import decode_token
    from sqlalchemy.orm import joinedload
    payload = decode_token(refresh_token_str)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user: User | None = (
        db.query(User)
        .options(joinedload(User.assigned_route))
        .filter(User.email == payload["sub"].strip().lower())
        .first()
    )

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    route_no = user.assigned_route.route_number if user.assigned_route else None

    token_data = {
        "sub": user.email,
        "id": user.id,
        "name": user.name,
        "role": user.role.value,
        "assigned_route_id": user.assigned_route_id,
        "assigned_route_number": route_no,
    }
    return create_access_token(token_data)

