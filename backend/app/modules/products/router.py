from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_user
from app.modules.products.schema import ProductOut, CategoryOut, CategoryUpdate, ProductCreate
from app.modules.products import service

router = APIRouter()


@router.get("/categories", response_model=List[CategoryOut])
def get_categories(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all product categories. Requires authentication."""
    return service.get_all_categories(db)


@router.put("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    body: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update a product category's HSN code, GST rate, or name."""
    try:
        return service.update_category(db, category_id, body.model_dump(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/", response_model=List[ProductOut])
def get_products(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all active products with stock levels. Requires authentication."""
    return service.get_all_products(db)


@router.post("/", response_model=ProductOut, status_code=201)
def create_product(
    body: ProductCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new product with stock and category association."""
    try:
        return service.create_product(db, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
