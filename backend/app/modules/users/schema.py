from pydantic import BaseModel
from typing import Optional


class AssignedRouteInfo(BaseModel):
    id: int
    route_number: int
    type: str

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    assigned_route_id: Optional[int] = None
    assigned_route: Optional[AssignedRouteInfo] = None
    is_active: bool

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str
    role: str = "sales_executive"
    assigned_route_id: Optional[int] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    assigned_route_id: Optional[int] = None
    is_active: Optional[bool] = None
