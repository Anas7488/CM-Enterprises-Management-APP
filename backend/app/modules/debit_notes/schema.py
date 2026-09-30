from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
import datetime as dt


class DebitNoteItemCreate(BaseModel):
    product_id: Optional[int] = Field(None, description="Optional link to catalog product")
    custom_item_name: Optional[str] = Field(None, description="Custom name if not from catalog")
    quantity: Decimal = Field(gt=0, description="Quantity being returned to vendor")
    rate: Decimal = Field(gt=0, description="Purchase rate per unit")
    gst_rate: Optional[Decimal] = Field(default=None, description="GST rate % (0, 5, 12, 18, 28)")
    hsn_code: Optional[str] = None
    deduct_inventory: bool = Field(default=True, description="Deduct returned items from warehouse stock")


class DebitNoteCreate(BaseModel):
    vendor_id: int
    purchase_bill_no: Optional[str] = Field(None, description="Optional vendor bill reference")
    purchase_bill_date: Optional[dt.date] = None
    date: Optional[dt.date] = None
    reason: str = Field(default="Purchase Return / Damaged Goods", description="Reason for debit note")
    remarks: Optional[str] = None
    items: List[DebitNoteItemCreate] = Field(min_length=1)


class DebitNoteItemOut(BaseModel):
    id: int
    product_id: Optional[int] = None
    product_name: str
    quantity: Decimal
    rate: Decimal
    hsn_code: Optional[str] = None
    gst_rate: Decimal
    gst_amount: Decimal
    subtotal: Decimal
    total: Decimal
    deduct_inventory: bool

    class Config:
        from_attributes = True


class DebitNoteOut(BaseModel):
    id: int
    debit_note_no: str
    vendor_id: int
    vendor_name: str
    vendor_contact: Optional[str] = None
    vendor_phone: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_address: Optional[str] = None
    vendor_gstin: Optional[str] = None
    vendor_state: Optional[str] = None
    vendor_state_code: Optional[str] = None
    purchase_bill_no: Optional[str] = None
    purchase_bill_date: Optional[dt.date] = None
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
    items: List[DebitNoteItemOut] = []

    class Config:
        from_attributes = True


class DebitNoteListOut(BaseModel):
    id: int
    debit_note_no: str
    vendor_id: int
    vendor_name: str
    vendor_phone: Optional[str] = None
    purchase_bill_no: Optional[str] = None
    purchase_bill_date: Optional[dt.date] = None
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
