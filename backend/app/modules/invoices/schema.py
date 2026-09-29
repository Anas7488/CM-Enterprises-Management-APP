from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
import datetime as dt


# ── Request Schemas ─────────────────────────────────────────────────────────

class InvoiceItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(gt=0, description="Quantity in product unit")
    rate: Optional[Decimal] = Field(default=None, description="Selling rate (defaults to catalog dealer_price or mrp)")
    discount_pct: Decimal = Field(default=0, ge=0, le=100)
    bill_type: Optional[str] = Field(default="GST", description="'GST' or 'W.O'")
    gst_rate: Optional[Decimal] = Field(default=None, description="Custom GST rate override if applicable")


class InvoiceCreate(BaseModel):
    customer_id: int
    order_id: Optional[int] = Field(default=None, description="Optional linked Order ID")
    date: Optional[dt.date] = None
    due_date: Optional[dt.date] = None
    discount_amount: Decimal = Field(default=0, ge=0, description="Invoice-level extra discount")
    remarks: Optional[str] = None
    items: List[InvoiceItemCreate] = Field(min_length=1)


class InvoiceStatusUpdate(BaseModel):
    status: str = Field(description="New status: unpaid, partially_paid, paid, void")


# ── Response Schemas ────────────────────────────────────────────────────────

class InvoiceItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    category_code: str
    category_name: str
    unit: str
    quantity: Decimal
    rate: Decimal
    discount_pct: Decimal
    discount_amt: Decimal
    hsn_code: str
    gst_rate: Decimal
    gst_amount: Decimal
    subtotal: Decimal
    total: Decimal

    class Config:
        from_attributes = True


class InvoiceOut(BaseModel):
    id: int
    invoice_no: str
    order_id: Optional[int] = None
    order_no: Optional[str] = None
    customer_id: int
    customer_name: str
    customer_area: Optional[str] = None
    customer_area_code: Optional[str] = None
    customer_contact: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_gstin: Optional[str] = None
    date: dt.date
    due_date: dt.date
    subtotal: Decimal
    discount_amount: Decimal
    gst_amount: Decimal
    round_off: Decimal = Decimal("0.00")
    total_amount: Decimal
    paid_amount: Decimal
    status: str
    remarks: Optional[str] = None
    item_count: int
    created_at: dt.datetime
    updated_at: Optional[dt.datetime] = None
    items: List[InvoiceItemOut] = []

    class Config:
        from_attributes = True


class InvoiceListOut(BaseModel):
    id: int
    invoice_no: str
    order_id: Optional[int] = None
    order_no: Optional[str] = None
    customer_id: int
    customer_name: str
    customer_area: Optional[str] = None
    customer_area_code: Optional[str] = None
    date: dt.date
    due_date: dt.date
    subtotal: Decimal
    gst_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    status: str
    item_count: int
    remarks: Optional[str] = None
    created_at: dt.datetime

    class Config:
        from_attributes = True
