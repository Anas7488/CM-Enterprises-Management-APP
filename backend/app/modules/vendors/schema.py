from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
import datetime as dt


class VendorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = None
    state_name: str = "Karnataka"
    state_code: str = "29"
    opening_balance: Decimal = Decimal("0.00")


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    state_name: Optional[str] = None
    state_code: Optional[str] = None
    outstanding_payable: Optional[Decimal] = None
    is_active: Optional[bool] = None


class VendorOut(BaseModel):
    id: int
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    address: Optional[str] = None
    state_name: str
    state_code: str
    opening_balance: Decimal
    outstanding_payable: Decimal
    is_active: bool
    created_at: dt.datetime

    class Config:
        from_attributes = True
