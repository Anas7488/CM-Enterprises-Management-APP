from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from decimal import Decimal, ROUND_HALF_UP
import datetime
from typing import Optional

from app.modules.credit_notes.model import CreditNote, CreditNoteItem, CreditNoteStatus
from app.modules.invoices.model import Invoice, InvoiceItem
from app.modules.customers.model import Customer
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


def _next_credit_note_no(db: Session) -> str:
    """Generate next sequential credit note number: CN-2026-0001"""
    year = datetime.date.today().year
    prefix = f"CN-{year}-"

    last = (
        db.query(CreditNote)
        .filter(CreditNote.credit_note_no.like(f"{prefix}%"))
        .order_by(desc(CreditNote.id))
        .first()
    )
    if last:
        try:
            last_num = int(last.credit_note_no.split("-")[-1])
            return f"{prefix}{last_num + 1:04d}"
        except Exception:
            pass
    return f"{prefix}0001"


def create_credit_note(db: Session, data: dict, user_id: int) -> CreditNote:
    """
    Create a new Credit Note against an Invoice.
    - Calculates GST and item totals
    - Deducts total from Customer outstanding balance
    - Restocks returned physical & available inventory if restock_inventory is True
    """
    invoice_id = data["invoice_id"]
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.items), joinedload(Invoice.customer))
        .filter_by(id=invoice_id)
        .first()
    )
    if not invoice:
        raise ValueError(f"Invoice #{invoice_id} not found")

    customer = invoice.customer
    if not customer:
        raise ValueError(f"Customer for Invoice #{invoice_id} not found")

    cn_date = data.get("date") or datetime.date.today()
    reason = data.get("reason") or "Sales Return"

    credit_note = CreditNote(
        credit_note_no=_next_credit_note_no(db),
        invoice_id=invoice.id,
        customer_id=customer.id,
        date=cn_date,
        reason=reason,
        status=CreditNoteStatus.ISSUED,
        remarks=data.get("remarks"),
    )

    cn_subtotal = Decimal("0.00")
    cn_gst = Decimal("0.00")

    for item_data in data["items"]:
        product = (
            db.query(Product)
            .options(joinedload(Product.category))
            .filter_by(id=item_data["product_id"])
            .first()
        )
        if not product:
            raise ValueError(f"Product #{item_data['product_id']} not found")

        qty = Decimal(str(item_data["quantity"]))
        rate = Decimal(str(item_data["rate"]))

        if item_data.get("gst_rate") is not None:
            gst_rate = Decimal(str(item_data["gst_rate"]))
        elif product.effective_gst_rate is not None:
            gst_rate = Decimal(str(product.effective_gst_rate))
        else:
            gst_rate = Decimal("18.00")

        subtotal = _round2(rate * qty)
        gst_amt = _round2(subtotal * gst_rate / 100)
        total = _round2(subtotal + gst_amt)

        hsn = item_data.get("hsn_code") or product.effective_hsn or "32089090"
        restock = bool(item_data.get("restock_inventory", True))

        cn_item = CreditNoteItem(
            product_id=product.id,
            quantity=qty,
            rate=rate,
            hsn_code=hsn,
            gst_rate=gst_rate,
            gst_amount=gst_amt,
            subtotal=subtotal,
            total=total,
            restock_inventory=restock,
        )
        credit_note.items.append(cn_item)
        cn_subtotal += subtotal
        cn_gst += gst_amt

        # Restock inventory
        if restock:
            inv_stock = db.query(Inventory).filter_by(product_id=product.id).first()
            if not inv_stock:
                inv_stock = Inventory(
                    product_id=product.id,
                    physical_qty=0,
                    reserved_qty=0,
                    available_qty=0,
                )
                db.add(inv_stock)
                db.flush()

            qty_int = int(qty)
            inv_stock.physical_qty += qty_int
            inv_stock.available_qty += qty_int

    raw_total = _round2(cn_subtotal + cn_gst)
    round_off = _calc_round_off(raw_total)
    final_total = _round2(raw_total + round_off)

    credit_note.subtotal = _round2(cn_subtotal)
    credit_note.gst_amount = _round2(cn_gst)
    credit_note.round_off = round_off
    credit_note.total_amount = final_total

    # Deduct from customer outstanding balance
    if customer.outstanding_balance is not None:
        customer.outstanding_balance = max(
            Decimal("0.00"),
            Decimal(str(customer.outstanding_balance)) - credit_note.total_amount
        )

    db.add(credit_note)
    db.commit()
    db.refresh(credit_note)
    return credit_note


def get_credit_notes(
    db: Session,
    search: Optional[str] = None,
    customer_id: Optional[int] = None,
    route_id: Optional[int] = None,
) -> list:
    """List all credit notes."""
    from app.modules.areas.model import Area

    query = (
        db.query(CreditNote)
        .options(
            joinedload(CreditNote.customer).joinedload(Customer.area),
            joinedload(CreditNote.invoice),
            joinedload(CreditNote.items),
        )
        .order_by(desc(CreditNote.created_at))
    )

    if customer_id:
        query = query.filter(CreditNote.customer_id == customer_id)

    if route_id:
        query = query.join(CreditNote.customer).join(Customer.area).filter(Area.route_id == route_id)

    if search:
        s = f"%{search}%"
        query = query.join(Customer).outerjoin(Customer.area).join(Invoice).filter(
            (CreditNote.credit_note_no.ilike(s))
            | (Invoice.invoice_no.ilike(s))
            | (Customer.shop_name.ilike(s))
            | (CreditNote.reason.ilike(s))
        )

    credit_notes = query.all()
    result = []
    for cn in credit_notes:
        cust = cn.customer
        area_obj = cust.area if cust else None
        route_obj = area_obj.route if area_obj and hasattr(area_obj, "route") else None
        area_name = area_obj.name if area_obj else None
        area_code = (
            f"{route_obj.route_number:02d}"
            if route_obj and route_obj.route_number
            else (f"{area_obj.id:02d}" if area_obj else None)
        )

        result.append({
            "id": cn.id,
            "credit_note_no": cn.credit_note_no,
            "invoice_id": cn.invoice_id,
            "invoice_no": cn.invoice.invoice_no if cn.invoice else f"INV-{cn.invoice_id}",
            "customer_id": cn.customer_id,
            "customer_name": cust.shop_name if cust else "Unknown",
            "customer_area": area_name,
            "customer_area_code": area_code,
            "date": cn.date,
            "reason": cn.reason,
            "subtotal": cn.subtotal,
            "gst_amount": cn.gst_amount,
            "total_amount": cn.total_amount,
            "status": cn.status.value if hasattr(cn.status, "value") else str(cn.status),
            "item_count": len(cn.items),
            "created_at": cn.created_at,
        })
    return result


def get_credit_note_by_id(db: Session, credit_note_id: int) -> Optional[dict]:
    """Get single credit note details for preview and printing."""
    cn = (
        db.query(CreditNote)
        .options(
            joinedload(CreditNote.customer).joinedload(Customer.area),
            joinedload(CreditNote.invoice),
            joinedload(CreditNote.items).joinedload(CreditNoteItem.product),
        )
        .filter_by(id=credit_note_id)
        .first()
    )
    if not cn:
        return None

    cust = cn.customer
    area_obj = cust.area if cust else None
    route_obj = area_obj.route if area_obj and hasattr(area_obj, "route") else None
    area_name = area_obj.name if area_obj else None
    area_code = (
        f"{route_obj.route_number:02d}"
        if route_obj and route_obj.route_number
        else (f"{area_obj.id:02d}" if area_obj else None)
    )

    items = []
    for item in cn.items:
        prod = item.product
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": prod.display_name if prod else "Unknown",
            "quantity": item.quantity,
            "rate": item.rate,
            "hsn_code": item.hsn_code,
            "gst_rate": item.gst_rate,
            "gst_amount": item.gst_amount,
            "subtotal": item.subtotal,
            "total": item.total,
            "restock_inventory": item.restock_inventory,
        })

    return {
        "id": cn.id,
        "credit_note_no": cn.credit_note_no,
        "invoice_id": cn.invoice_id,
        "invoice_no": cn.invoice.invoice_no if cn.invoice else f"INV-{cn.invoice_id}",
        "invoice_date": cn.invoice.date if cn.invoice else None,
        "customer_id": cn.customer_id,
        "customer_name": cust.shop_name if cust else "Unknown",
        "customer_phone": cust.phone if cust else None,
        "customer_address": cust.address if cust else None,
        "customer_gstin": cust.gstin if cust else None,
        "customer_area": area_name,
        "customer_area_code": area_code,
        "date": cn.date,
        "reason": cn.reason,
        "subtotal": cn.subtotal,
        "gst_amount": cn.gst_amount,
        "round_off": cn.round_off or Decimal("0.00"),
        "total_amount": cn.total_amount,
        "status": cn.status.value if hasattr(cn.status, "value") else str(cn.status),
        "remarks": cn.remarks,
        "item_count": len(cn.items),
        "created_at": cn.created_at,
        "items": items,
    }


def delete_credit_note(db: Session, credit_note_id: int) -> dict:
    """Delete credit note and restore customer balance and inventory."""
    cn = (
        db.query(CreditNote)
        .options(joinedload(CreditNote.items), joinedload(CreditNote.customer))
        .filter_by(id=credit_note_id)
        .first()
    )
    if not cn:
        raise ValueError(f"Credit Note #{credit_note_id} not found")

    # Restore customer balance
    if cn.customer and cn.status != CreditNoteStatus.CANCELLED:
        cn.customer.outstanding_balance = (
            Decimal(str(cn.customer.outstanding_balance or 0)) + cn.total_amount
        )

    # Revert inventory restock
    for item in cn.items:
        if item.restock_inventory:
            inv = db.query(Inventory).filter_by(product_id=item.product_id).first()
            if inv:
                qty_int = int(item.quantity)
                inv.physical_qty = max(0, inv.physical_qty - qty_int)
                inv.available_qty = max(0, inv.available_qty - qty_int)

    cn_no = cn.credit_note_no
    db.delete(cn)
    db.commit()
    return {"message": f"Credit Note {cn_no} deleted successfully", "credit_note_id": credit_note_id}
