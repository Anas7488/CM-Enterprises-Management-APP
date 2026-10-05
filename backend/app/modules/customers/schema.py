from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class RouteOut(BaseModel):
    id: int
    route_number: int
    type: str

    class Config:
        from_attributes = True


class AreaOut(BaseModel):
    id: int
    name: str
    route: Optional[RouteOut] = None

    class Config:
        from_attributes = True


class CustomerOut(BaseModel):
    id: int
    shop_name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    credit_limit: Decimal
    opening_balance: Decimal
    outstanding_balance: Decimal
    is_active: bool
    area: Optional[AreaOut] = None

    class Config:
        from_attributes = True


class CustomerCreate(BaseModel):
    shop_name: str
    area_id: int
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    credit_limit: Optional[Decimal] = Decimal("0.00")
    opening_balance: Optional[Decimal] = Decimal("0.00")


class CustomerUpdate(BaseModel):
    shop_name: Optional[str] = None
    area_id: Optional[int] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    is_active: Optional[bool] = None
