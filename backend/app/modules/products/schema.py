from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal


class CategoryOut(BaseModel):
    id: int
    code: str
    name: str
    group: str
    size_range: Optional[str] = None
    gst_rate: Optional[Decimal] = None
    hsn_code: Optional[str] = None

    class Config:
        from_attributes = True


class CategoryUpdate(BaseModel):
    hsn_code: Optional[str] = Field(None, max_length=10, description="HSN code (e.g. 32081010)")
    gst_rate: Optional[Decimal] = Field(None, ge=0, le=28, description="GST rate (0, 5, 12, 18, or 28)")
    name: Optional[str] = Field(None, max_length=100)


class ProductCreate(BaseModel):
    category_id: int
    product_type: Optional[str] = None
    shade_name: Optional[str] = None
    shade_code: Optional[str] = None
    variant_name: Optional[str] = None
    variant_code: Optional[str] = None
    size: str
    unit: str = "PCS"
    mrp: Decimal
    dealer_price: Optional[Decimal] = None
    pcs_per_carton: Optional[int] = None
    reorder_level: int = 10
    hsn_code: Optional[str] = None
    gst_rate: Optional[Decimal] = None
    initial_stock: Optional[int] = 0


class ProductOut(BaseModel):
    id: int
    product_type: str
    shade_name: Optional[str] = None
    shade_code: Optional[str] = None
    variant_name: Optional[str] = None
    variant_code: Optional[str] = None
    size: str
    unit: str
    mrp: Decimal
    dealer_price: Optional[Decimal] = None
    reorder_level: int
    display_name: str

    # Per-product HSN/GST overrides
    hsn_code: Optional[str] = None
    gst_rate: Optional[Decimal] = None

    # Effective (resolved) values — product-level or category fallback
    effective_hsn: Optional[str] = None
    effective_gst_rate: Optional[Decimal] = None

    category: Optional[CategoryOut] = None
    stock: Optional[int] = 0  # from inventory join

    class Config:
        from_attributes = True
