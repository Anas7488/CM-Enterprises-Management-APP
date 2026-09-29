from pydantic import BaseModel
from typing import Optional


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str
    role: str = "sales_executive"
