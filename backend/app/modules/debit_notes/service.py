from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from decimal import Decimal, ROUND_HALF_UP
import datetime
from typing import Optional, List

from app.modules.debit_notes.model import DebitNote, DebitNoteItem, DebitNoteStatus
from app.modules.vendors.model import Vendor
from app.modules.products.model import Product
from app.modules.inventory.model import Inventory


def _round2(val: Decimal) -> Decimal:
    return Decimal(val).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _calc_round_off(amount: Decimal) -> Decimal:
    floored = amount.quantize(Decimal("1"), rounding="ROUND_FLOOR")
    decimal_part = amount - floored
    if decimal_part >= Decimal("0.50"):
        return _round2(Decimal("1") - decimal_part)
    else:
        return _round2(-decimal_part)


def _next_debit_note_no(db: Session) -> str:
    """Generate next sequential debit note number: DN-2026-0001"""
    year = datetime.date.today().year
    prefix = f"DN-{year}-"

    last = (
        db.query(DebitNote)
        .filter(DebitNote.debit_note_no.like(f"{prefix}%"))
        .order_by(desc(DebitNote.id))
        .first()
    )
    if last:
        try:
            last_num = int(last.debit_note_no.split("-")[-1])
            return f"{prefix}{last_num + 1:04d}"
        except Exception:
            pass
    return f"{prefix}0001"


def create_debit_note(db: Session, data: dict, user_id: int) -> DebitNote:
    """
    Create a new standalone or referenced Debit Note against a Vendor.
    - Calculates GST and item totals
    - Deducts total from Vendor outstanding payable balance
    - Deducts physical & available inventory if deduct_inventory is True and product_id is set
    """
    vendor_id = data["vendor_id"]
    vendor = db.query(Vendor).filter_by(id=vendor_id).first()
    if not vendor:
        raise ValueError(f"Vendor #{vendor_id} not found")

    dn_date = data.get("date") or datetime.date.today()
    reason = data.get("reason") or "Purchase Return"

    debit_note = DebitNote(
        debit_note_no=_next_debit_note_no(db),
        vendor_id=vendor.id,
        purchase_bill_no=data.get("purchase_bill_no") or None,
        purchase_bill_date=data.get("purchase_bill_date") or None,
        date=dn_date,
        reason=reason,
        status=DebitNoteStatus.ISSUED,
        remarks=data.get("remarks"),
    )

    dn_subtotal = Decimal("0.00")
    dn_gst = Decimal("0.00")

    for item_data in data["items"]:
        product = None
        custom_name = item_data.get("custom_item_name")
        product_id = item_data.get("product_id")

        if product_id:
            product = (
                db.query(Product)
                .options(joinedload(Product.category))
                .filter_by(id=product_id)
                .first()
            )

        qty = Decimal(str(item_data["quantity"]))
        rate = Decimal(str(item_data["rate"]))

        if item_data.get("gst_rate") is not None:
            gst_rate = Decimal(str(item_data["gst_rate"]))
        elif product and product.effective_gst_rate is not None:
            gst_rate = Decimal(str(product.effective_gst_rate))
        else:
            gst_rate = Decimal("18.00")

        subtotal = _round2(rate * qty)
        gst_amt = _round2(subtotal * gst_rate / 100)
        total = _round2(subtotal + gst_amt)

        hsn = item_data.get("hsn_code") or (product.effective_hsn if product else "32089090")
        deduct_inv = bool(item_data.get("deduct_inventory", True))

        dn_item = DebitNoteItem(
            product_id=product.id if product else None,
            custom_item_name=custom_name if not product else None,
            quantity=qty,
            rate=rate,
            hsn_code=hsn,
            gst_rate=gst_rate,
            gst_amount=gst_amt,
            subtotal=subtotal,
            total=total,
            deduct_inventory=deduct_inv,
        )
        debit_note.items.append(dn_item)
        dn_subtotal += subtotal
        dn_gst += gst_amt

        # Deduct outward inventory if applicable
        if deduct_inv and product:
            inv_stock = db.query(Inventory).filter_by(product_id=product.id).first()
            if inv_stock:
                qty_int = int(qty)
                inv_stock.physical_qty = max(0, inv_stock.physical_qty - qty_int)
                inv_stock.available_qty = max(0, inv_stock.available_qty - qty_int)

    raw_total = _round2(dn_subtotal + dn_gst)
    round_off = _calc_round_off(raw_total)
    final_total = _round2(raw_total + round_off)

    debit_note.subtotal = _round2(dn_subtotal)
    debit_note.gst_amount = _round2(dn_gst)
    debit_note.round_off = round_off
    debit_note.total_amount = final_total

    # Reduce what we owe the vendor
    if vendor.outstanding_payable is not None:
        vendor.outstanding_payable = max(
            Decimal("0.00"),
            Decimal(str(vendor.outstanding_payable)) - debit_note.total_amount
        )

    db.add(debit_note)
    db.commit()
    db.refresh(debit_note)
    return debit_note


def get_debit_notes(
    db: Session,
    search: Optional[str] = None,
    vendor_id: Optional[int] = None,
) -> list:
    """List all debit notes."""
    query = (
        db.query(DebitNote)
        .options(
            joinedload(DebitNote.vendor),
            joinedload(DebitNote.items).joinedload(DebitNoteItem.product),
        )
        .order_by(desc(DebitNote.created_at))
    )

    if vendor_id:
        query = query.filter(DebitNote.vendor_id == vendor_id)

    if search:
        s = f"%{search}%"
        query = query.join(Vendor).filter(
            (DebitNote.debit_note_no.ilike(s))
            | (Vendor.name.ilike(s))
            | (DebitNote.purchase_bill_no.ilike(s))
            | (DebitNote.reason.ilike(s))
        )

    dns = query.all()
    result = []
    for dn in dns:
        v = dn.vendor
        result.append({
            "id": dn.id,
            "debit_note_no": dn.debit_note_no,
            "vendor_id": dn.vendor_id,
            "vendor_name": v.name if v else "Unknown",
            "vendor_phone": v.phone if v else None,
            "purchase_bill_no": dn.purchase_bill_no,
            "purchase_bill_date": dn.purchase_bill_date,
            "date": dn.date,
            "reason": dn.reason,
            "subtotal": dn.subtotal,
            "gst_amount": dn.gst_amount,
            "total_amount": dn.total_amount,
            "status": dn.status.value if hasattr(dn.status, "value") else str(dn.status),
            "item_count": len(dn.items),
            "created_at": dn.created_at,
        })
    return result


def get_debit_note_by_id(db: Session, debit_note_id: int) -> Optional[dict]:
    """Get single debit note details for preview and printing."""
    dn = (
        db.query(DebitNote)
        .options(
            joinedload(DebitNote.vendor),
            joinedload(DebitNote.items).joinedload(DebitNoteItem.product),
        )
        .filter_by(id=debit_note_id)
        .first()
    )
    if not dn:
        return None

    v = dn.vendor
    items = []
    for item in dn.items:
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.item_display_name,
            "quantity": item.quantity,
            "rate": item.rate,
            "hsn_code": item.hsn_code,
            "gst_rate": item.gst_rate,
            "gst_amount": item.gst_amount,
            "subtotal": item.subtotal,
            "total": item.total,
            "deduct_inventory": item.deduct_inventory,
        })

    return {
        "id": dn.id,
        "debit_note_no": dn.debit_note_no,
        "vendor_id": dn.vendor_id,
        "vendor_name": v.name if v else "Unknown",
        "vendor_contact": v.contact_person if v else None,
        "vendor_phone": v.phone if v else None,
        "vendor_email": v.email if v else None,
        "vendor_address": v.address if v else None,
        "vendor_gstin": v.gstin if v else None,
        "vendor_state": v.state_name if v else None,
        "vendor_state_code": v.state_code if v else None,
        "purchase_bill_no": dn.purchase_bill_no,
        "purchase_bill_date": dn.purchase_bill_date,
        "date": dn.date,
        "reason": dn.reason,
        "subtotal": dn.subtotal,
        "gst_amount": dn.gst_amount,
        "round_off": dn.round_off or Decimal("0.00"),
        "total_amount": dn.total_amount,
        "status": dn.status.value if hasattr(dn.status, "value") else str(dn.status),
        "remarks": dn.remarks,
        "item_count": len(dn.items),
        "created_at": dn.created_at,
        "items": items,
    }


def delete_debit_note(db: Session, debit_note_id: int) -> dict:
    """Delete debit note, restore vendor payable balance and restore stock."""
    dn = (
        db.query(DebitNote)
        .options(joinedload(DebitNote.items), joinedload(DebitNote.vendor))
        .filter_by(id=debit_note_id)
        .first()
    )
    if not dn:
        raise ValueError(f"Debit Note #{debit_note_id} not found")

    # Restore vendor balance
    if dn.vendor and dn.status != DebitNoteStatus.CANCELLED:
        dn.vendor.outstanding_payable = (
            Decimal(str(dn.vendor.outstanding_payable or 0)) + dn.total_amount
        )

    # Revert inventory deduction
    for item in dn.items:
        if item.deduct_inventory and item.product_id:
            inv = db.query(Inventory).filter_by(product_id=item.product_id).first()
            if inv:
                qty_int = int(item.quantity)
                inv.physical_qty += qty_int
                inv.available_qty += qty_int

    dn_no = dn.debit_note_no
    db.delete(dn)
    db.commit()
    return {"message": f"Debit Note {dn_no} deleted successfully", "debit_note_id": debit_note_id}
