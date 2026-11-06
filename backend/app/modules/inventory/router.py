from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_user
from app.modules.inventory.schema import InventoryOut, StockAdjustIn
from app.modules.inventory import service

router = APIRouter()


@router.get("/", response_model=List[InventoryOut])
def get_inventory(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get live inventory levels for all products. Requires authentication.
    """
    return service.get_inventory(db)


@router.patch("/{inventory_id}/adjust", response_model=InventoryOut)
def adjust_stock(
    inventory_id: int,
    body: StockAdjustIn,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Adjust stock for an inventory record by its ID. Use positive adjustment_qty to add stock,
    negative to remove. Recalculates available_qty automatically.
    """
    try:
        return service.adjust_stock(db, inventory_id, body.adjustment_qty)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
