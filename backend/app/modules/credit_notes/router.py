from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.dependencies import get_db, get_current_user
from app.modules.credit_notes.schema import (
    CreditNoteCreate,
    CreditNoteOut,
    CreditNoteListOut,
)
from app.modules.credit_notes import service

router = APIRouter()


@router.post("/", response_model=CreditNoteOut, status_code=201)
def create_credit_note(
    payload: CreditNoteCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new credit note for an invoice."""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        cn = service.create_credit_note(
            db,
            data=payload.model_dump(),
            user_id=user_id,
        )
        return service.get_credit_note_by_id(db, cn.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create credit note: {str(e)}")


@router.get("/", response_model=List[CreditNoteListOut])
def list_credit_notes(
    search: Optional[str] = Query(None, description="Search by credit note no, invoice, customer or reason"),
    customer_id: Optional[int] = Query(None, description="Filter by customer ID"),
    route_id: Optional[int] = Query(None, description="Filter by route ID"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all credit notes. Sales executives see only their route credit notes."""
    user_route = current_user.get("assigned_route_id") if current_user.get("role") == "sales_executive" else route_id
    return service.get_credit_notes(db, search=search, customer_id=customer_id, route_id=user_route)


@router.get("/{credit_note_id}", response_model=CreditNoteOut)
def get_credit_note(
    credit_note_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get single credit note details."""
    result = service.get_credit_note_by_id(db, credit_note_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Credit Note #{credit_note_id} not found")
    return result


@router.delete("/{credit_note_id}")
def delete_credit_note(
    credit_note_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a credit note and reverse customer ledger & stock adjustments."""
    try:
        return service.delete_credit_note(db, credit_note_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
