from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime


class CategoryOut(BaseModel):
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True


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
    reorder_level: int
    display_name: str
    category: Optional[CategoryOut] = None

    class Config:
        from_attributes = True


class InventoryOut(BaseModel):
    id: int
    product_id: int
    physical_qty: int
    reserved_qty: int
    available_qty: int
    updated_at: datetime
    product: ProductOut

    class Config:
        from_attributes = True
