from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.dependencies import get_db, get_current_user
from app.modules.invoices.schema import (
    InvoiceCreate,
    InvoiceStatusUpdate,
    InvoiceOut,
    InvoiceListOut,
)
from app.modules.invoices import service

router = APIRouter()


@router.post("/", response_model=InvoiceOut, status_code=201)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Create a new invoice (from an order or standalone).
    Calculates taxes, line totals, adjusts customer balance,
    deducts physical inventory, and links to order if provided.
    """
    try:
        invoice = service.create_invoice(
            db,
            data=payload.model_dump(),
            user_id=current_user["id"],
        )
        return service.get_invoice_by_id(db, invoice.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create invoice: {str(e)}")


@router.get("/", response_model=List[InvoiceListOut])
def list_invoices(
    status: Optional[str] = Query(None, description="Filter by status (unpaid, partially_paid, paid, void)"),
    search: Optional[str] = Query(None, description="Search by invoice no or customer"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all invoices with optional filters."""
    return service.get_invoices(db, status=status, search=search, customer_id=customer_id)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get single invoice with full line items and customer details for preview & print."""
    result = service.get_invoice_by_id(db, invoice_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Invoice #{invoice_id} not found")
    return result


@router.patch("/{invoice_id}/status")
def update_invoice_status(
    invoice_id: int,
    payload: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Update invoice payment status."""
    try:
        return service.update_invoice_status(db, invoice_id, payload.status)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete an invoice and revert customer balance & stock."""
    try:
        return service.delete_invoice(db, invoice_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
