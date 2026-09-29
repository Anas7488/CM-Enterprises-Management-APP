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
