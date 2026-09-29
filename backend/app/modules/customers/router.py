from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_user
from app.modules.customers.schema import CustomerOut
from app.modules.customers import service

router = APIRouter()


@router.get("/", response_model=List[CustomerOut])
def get_customers(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of all active customers with their Area and Route info.
    Requires authentication.
    """
    return service.get_customers(db)
