from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.dependencies import get_db, get_current_user
from app.modules.orders.schema import (
    OrderCreate,
    OrderStatusUpdate,
    OrderBulkDelete,
    OrderOut,
    OrderListOut,
)
from app.modules.orders import service

router = APIRouter()


@router.post("/", response_model=OrderOut, status_code=201)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new order with line items.
    Auto-calculates GST, discounts, and totals.
    Requires authentication.
    """
    try:
        user_route = current_user.get("assigned_route_id") if current_user.get("role") == "sales_executive" else None
        order = service.create_order(
            db,
            data=payload.model_dump(),
            user_id=current_user["id"],
            user_route_id=user_route,
        )
        return service.get_order_by_id(db, order.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[OrderListOut])
def list_orders(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by order no or customer"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    route_id: Optional[int] = Query(None, description="Filter by route ID"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all orders with optional filters. Requires authentication."""
    user_route = current_user.get("assigned_route_id") if current_user.get("role") == "sales_executive" else route_id
    return service.get_orders(db, status=status, search=search, customer_id=customer_id, route_id=user_route)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single order with full item details. Requires authentication."""
    result = service.get_order_by_id(db, order_id)
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    return result


@router.patch("/{order_id}/status")
def update_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update order status. Valid transitions:
    pending → approved → preparing → dispatched → delivered
    Cancellation allowed from pending/approved/preparing.
    
    Stock operations:
    - approved: reserves inventory
    - dispatched: deducts physical stock
    - cancelled: releases reserved stock
    """
    try:
        order = service.update_order_status(
            db,
            order_id=order_id,
            new_status=payload.status,
            user_id=current_user["id"],
        )
        return {
            "message": f"Order {order.order_no} status updated to '{order.status.value}'",
            "order_no": order.order_no,
            "status": order.status.value,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete an order. Requires authentication."""
    try:
        return service.delete_order(db, order_id=order_id, user_role=current_user.get("role"))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/bulk-delete")
def bulk_delete(
    payload: OrderBulkDelete,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Bulk delete multiple orders. Requires authentication."""
    return service.bulk_delete_orders(db, order_ids=payload.order_ids)
