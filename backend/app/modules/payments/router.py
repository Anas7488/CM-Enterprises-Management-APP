from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.dependencies import get_db, get_current_user
from app.modules.payments.schema import PaymentCreate, PaymentOut, PaymentSummary
from app.modules.payments import service

router = APIRouter()


@router.get("/summary", response_model=PaymentSummary)
def payment_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return service.get_payment_summary(db)


@router.get("/", response_model=List[PaymentOut])
def list_payments(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    route_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_route = current_user.get("assigned_route_id") if current_user.get("role") == "sales_executive" else route_id
    return service.get_payments(
        db,
        start_date=start_date,
        end_date=end_date,
        status=status,
        method=method,
        search=search,
        customer_id=customer_id,
        route_id=user_route,
    )


@router.post("/", response_model=PaymentOut, status_code=201)
def create_payment(
    body: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        user_route = current_user.get("assigned_route_id") if current_user.get("role") == "sales_executive" else None
        payment = service.create_payment(db, body.model_dump(), user_route_id=user_route)
        # Re-fetch with relationships for response
        return service.get_payments(db, search=payment.receipt_no)[0]
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.delete("/{payment_id}", status_code=204)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        service.delete_payment(db, payment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
