from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime


# ── Request Schemas ─────────────────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    product_id: int
    quantity: Decimal = Field(gt=0, description="Qty in product's unit (PCS/KG/LTR)")
    rate: Optional[Decimal] = Field(default=None, description="Selling rate per unit (defaults to product price if omitted)")
    discount_pct: Decimal = Field(default=0, ge=0, le=100)
    bill_type: Optional[str] = Field(default="GST", description="Billing type: 'GST' or 'W.O'")


class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(min_length=1)
    discount_amount: Decimal = Field(default=0, ge=0, description="Order-level discount")
    remarks: Optional[str] = None
    delivery_date: Optional[date] = None


class OrderStatusUpdate(BaseModel):
    status: str = Field(description="New status: approved, preparing, dispatched, delivered, cancelled")


class OrderBulkDelete(BaseModel):
    order_ids: List[int] = Field(min_length=1, description="List of order IDs to delete")


# ── Response Schemas ────────────────────────────────────────────────────────

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    category_code: str
    category_name: str
    quantity: Decimal
    unit: str
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


class OrderOut(BaseModel):
    id: int
    order_no: str
    customer_id: int
    customer_name: str
    customer_area: Optional[str] = None
    customer_area_code: Optional[str] = None
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    gst_amount: Decimal
    total_amount: Decimal
    remarks: Optional[str] = None
    delivery_date: Optional[date] = None
    item_count: int
    created_by: str
    approved_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


class OrderListOut(BaseModel):
    """Lightweight version for list view (no items)."""
    id: int
    order_no: str
    customer_id: int
    customer_name: str
    customer_area: Optional[str] = None
    customer_area_code: Optional[str] = None
    status: str
    total_amount: Decimal
    item_count: int
    remarks: Optional[str] = None
    delivery_date: Optional[date] = None
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True
