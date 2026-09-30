from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.dependencies import get_db, get_current_user
from app.modules.debit_notes.schema import (
    DebitNoteCreate,
    DebitNoteOut,
    DebitNoteListOut,
)
from app.modules.debit_notes import service

router = APIRouter()


@router.post("/", response_model=DebitNoteOut, status_code=201)
def create_debit_note(
    payload: DebitNoteCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Create a new direct or referenced debit note for a vendor."""
    try:
        user_id = current_user.get("id") or current_user.get("sub")
        dn = service.create_debit_note(
            db,
            data=payload.model_dump(),
            user_id=user_id,
        )
        return service.get_debit_note_by_id(db, dn.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create debit note: {str(e)}")


@router.get("/", response_model=List[DebitNoteListOut])
def list_debit_notes(
    search: Optional[str] = Query(None, description="Search by debit note no, vendor, or reason"),
    vendor_id: Optional[int] = Query(None, description="Filter by vendor ID"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all debit notes."""
    return service.get_debit_notes(db, search=search, vendor_id=vendor_id)


@router.get("/{debit_note_id}", response_model=DebitNoteOut)
def get_debit_note(
    debit_note_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get single debit note details."""
    result = service.get_debit_note_by_id(db, debit_note_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Debit Note #{debit_note_id} not found")
    return result


@router.delete("/{debit_note_id}")
def delete_debit_note(
    debit_note_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a debit note and reverse vendor payable balance & inventory adjustments."""
    try:
        return service.delete_debit_note(db, debit_note_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
