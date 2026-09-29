from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_user
from app.modules.inventory.schema import InventoryOut
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
