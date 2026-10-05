from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.dependencies import get_db, get_current_user
from app.modules.customers.schema import CustomerOut, CustomerCreate, CustomerUpdate
from app.modules.customers import service

router = APIRouter()


@router.get("/", response_model=List[CustomerOut])
def get_customers(
    search: Optional[str] = Query(None),
    route_id: Optional[int] = Query(None),
    area_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get list of active customers.
    If current user is sales_executive with assigned route, automatically scopes to their route.
    """
    user_route = None
    if current_user.get("role") == "sales_executive":
        user_route = current_user.get("assigned_route_id")
    elif route_id:
        user_route = route_id

    return service.get_customers(db, search=search, route_id=user_route, area_id=area_id)


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get single customer by ID."""
    customer = service.get_customer_by_id(db, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Scope check
    if current_user.get("role") == "sales_executive":
        assigned = current_user.get("assigned_route_id")
        if assigned and customer.area and customer.area.route_id != assigned:
            raise HTTPException(status_code=403, detail="Customer not in your assigned route")

    return customer


@router.post("/", response_model=CustomerOut, status_code=201)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new customer."""
    try:
        user_route = current_user.get("assigned_route_id") if current_user.get("role") == "sales_executive" else None
        return service.create_customer(db, payload.model_dump(), user_route_id=user_route)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create customer: {str(e)}")


@router.put("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update customer details."""
    try:
        user_route = current_user.get("assigned_route_id") if current_user.get("role") == "sales_executive" else None
        return service.update_customer(db, customer_id, payload.model_dump(exclude_unset=True), user_route_id=user_route)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
