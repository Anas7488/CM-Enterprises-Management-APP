from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SALES_EXECUTIVE = "sales_executive"
    DELIVERY_EXECUTIVE = "delivery_executive"
    ACCOUNTANT = "accountant"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False, index=True)
    phone = Column(String(15), unique=True, nullable=True)

    hashed_password = Column(String(255), nullable=False)

    role = Column(Enum(UserRole), nullable=False, default=UserRole.SALES_EXECUTIVE)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<User {self.name} ({self.role})>"