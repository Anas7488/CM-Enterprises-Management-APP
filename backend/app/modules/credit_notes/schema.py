from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
import datetime as dt


class CreditNoteItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(gt=0, description="Quantity being returned or credited")
    rate: Decimal = Field(gt=0, description="Unit rate")
    gst_rate: Optional[Decimal] = Field(default=None, description="GST rate percentage")
    hsn_code: Optional[str] = None
    restock_inventory: bool = Field(default=True, description="Add returned items back to warehouse stock")


class CreditNoteCreate(BaseModel):
    invoice_id: int
    date: Optional[dt.date] = None
    reason: str = Field(default="Sales Return", description="Reason for issuing credit note")
    remarks: Optional[str] = None
    items: List[CreditNoteItemCreate] = Field(min_length=1)


class CreditNoteItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: Decimal
    rate: Decimal
    hsn_code: Optional[str] = None
    gst_rate: Decimal
    gst_amount: Decimal
    subtotal: Decimal
    total: Decimal
    restock_inventory: bool

    class Config:
        from_attributes = True


class CreditNoteOut(BaseModel):
    id: int
    credit_note_no: str
    invoice_id: int
    invoice_no: str
    invoice_date: Optional[dt.date] = None
    customer_id: int
    customer_name: str
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_gstin: Optional[str] = None
    customer_area: Optional[str] = None
    customer_area_code: Optional[str] = None
    date: dt.date
    reason: str
    subtotal: Decimal
    gst_amount: Decimal
    round_off: Decimal = Decimal("0.00")
    total_amount: Decimal
    status: str
    remarks: Optional[str] = None
    item_count: int
    created_at: dt.datetime
    items: List[CreditNoteItemOut] = []

    class Config:
        from_attributes = True


class CreditNoteListOut(BaseModel):
    id: int
    credit_note_no: str
    invoice_id: int
    invoice_no: str
    customer_id: int
    customer_name: str
    customer_area: Optional[str] = None
    customer_area_code: Optional[str] = None
    date: dt.date
    reason: str
    subtotal: Decimal
    gst_amount: Decimal
    total_amount: Decimal
    status: str
    item_count: int
    created_at: dt.datetime

    class Config:
        from_attributes = True
