from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from decimal import Decimal, ROUND_HALF_UP
import datetime
from typing import Optional

import app.shared.models  # noqa: F401 - ensure all ORM models are registered
from app.modules.invoices.model import Invoice, InvoiceItem, InvoiceStatus
from app.modules.orders.model import Order, OrderStatus
from app.modules.customers.model import Customer
from app.modules.products.model import Product
from app.modules.inventory.model import Inventory


def _round2(val: Decimal) -> Decimal:
    return Decimal(val).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _calc_round_off(amount: Decimal) -> Decimal:
    """
    Standard commercial rounding:
    - If decimal part < 0.50 → round down (negative round_off, e.g. 564.49 → -0.49)
    - If decimal part >= 0.50 → round up  (positive round_off, e.g. 464.80 → +0.20)
    Returns the round_off value to be added to get the nearest rupee.
    """
    floored = amount.quantize(Decimal("1"), rounding="ROUND_FLOOR")
    decimal_part = amount - floored
    if decimal_part >= Decimal("0.50"):
        # Round up: round_off is positive (add the remaining cents)
        return _round2(Decimal("1") - decimal_part)
    else:
        # Round down: round_off is negative (subtract the decimal cents)
        return _round2(-decimal_part)

def _next_invoice_no(db: Session) -> str:
    """Generate next sequential invoice number: INV-2026-0001"""
    year = datetime.date.today().year
    prefix = f"INV-{year}-"

    last = (
        db.query(Invoice)
        .filter(Invoice.invoice_no.like(f"{prefix}%"))
        .order_by(desc(Invoice.id))
        .first()
    )
    if last:
        try:
            last_num = int(last.invoice_no.split("-")[-1])
            return f"{prefix}{last_num + 1:04d}"
        except Exception:
            pass
    return f"{prefix}0001"


def create_invoice(db: Session, data: dict, user_id: int) -> Invoice:
    """
    Create a new Tax Invoice from an order or standalone.
    - Calculates GST & line items
    - Updates customer balance
    - Deducts physical inventory
    - Links to order if provided
    """
    customer = db.query(Customer).filter_by(id=data["customer_id"]).first()
    if not customer:
        raise ValueError(f"Customer #{data['customer_id']} not found")

    order_id = data.get("order_id")
    order = None
    if order_id:
        order = db.query(Order).filter_by(id=order_id).first()
        if not order:
            raise ValueError(f"Linked Order #{order_id} not found")

    invoice_date = data.get("date") or datetime.date.today()
    due_date = data.get("due_date") or (invoice_date + datetime.timedelta(days=30))

    invoice = Invoice(
        invoice_no=_next_invoice_no(db),
        order_id=order.id if order else None,
        customer_id=customer.id,
        date=invoice_date,
        due_date=due_date,
        status=InvoiceStatus.UNPAID,
        paid_amount=Decimal("0.00"),
        remarks=data.get("remarks"),
    )

    inv_subtotal = Decimal("0.00")
    inv_gst = Decimal("0.00")

    for item_data in data["items"]:
        product = (
            db.query(Product)
            .options(joinedload(Product.category))
            .filter_by(id=item_data["product_id"])
            .first()
        )
        if not product:
            raise ValueError(f"Product #{item_data['product_id']} not found")

        category = product.category
        qty = Decimal(str(item_data["quantity"]))
        rate_val = item_data.get("rate")
        if rate_val is None or rate_val == "":
            rate = Decimal(str(product.dealer_price or product.mrp or 0))
        else:
            rate = Decimal(str(rate_val))

        disc_pct = Decimal(str(item_data.get("discount_pct", 0)))
        bill_type = item_data.get("bill_type", "GST")

        # Line calculation
        gross = _round2(rate * qty)
        disc_amt = _round2(gross * disc_pct / 100)
        subtotal = _round2(gross - disc_amt)

        # Tax calculation
        if bill_type == "W.O":
            gst_rate = Decimal("0.00")
        elif item_data.get("gst_rate") is not None:
            gst_rate = Decimal(str(item_data["gst_rate"]))
        else:
            gst_rate = Decimal(str(category.gst_rate if category and category.gst_rate is not None else 18))

        gst_amt = _round2(subtotal * gst_rate / 100)
        total = _round2(subtotal + gst_amt)

        item = InvoiceItem(
            product_id=product.id,
            quantity=qty,
            rate=rate,
            discount_pct=disc_pct,
            discount_amt=disc_amt,
            hsn_code=category.hsn_code if category else "32089090",
            gst_rate=gst_rate,
            gst_amount=gst_amt,
            subtotal=subtotal,
            total=total,
        )
        invoice.items.append(item)
        inv_subtotal += subtotal
        inv_gst += gst_amt

        # Update physical inventory
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
        inv_stock.physical_qty -= qty_int
        # If this order had reserved stock, release the reservation
        if order and order.status in (OrderStatus.APPROVED, OrderStatus.PREPARING):
            inv_stock.reserved_qty = max(0, inv_stock.reserved_qty - qty_int)
        else:
            inv_stock.available_qty -= qty_int

    # Invoice-level discount
    order_disc = Decimal(str(data.get("discount_amount", 0)))

    raw_total = _round2(inv_subtotal - order_disc + inv_gst)
    round_off = _calc_round_off(raw_total)
    final_total = _round2(raw_total + round_off)

    invoice.subtotal = _round2(inv_subtotal)
    invoice.discount_amount = _round2(order_disc)
    invoice.gst_amount = _round2(inv_gst)
    invoice.round_off = round_off
    invoice.total_amount = final_total

    # Update Customer balance
    if customer.outstanding_balance is None:
        customer.outstanding_balance = Decimal("0.00")
    customer.outstanding_balance = Decimal(str(customer.outstanding_balance)) + invoice.total_amount


    # If linked to order, mark order as dispatched
    if order and order.status != OrderStatus.DELIVERED:
        order.status = OrderStatus.DISPATCHED

    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


def get_invoices(
    db: Session,
    status: Optional[str] = None,
    search: Optional[str] = None,
    customer_id: Optional[int] = None,
    route_id: Optional[int] = None,
) -> list:
    """List invoices with filters."""
    from app.modules.areas.model import Area

    query = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.customer).joinedload(Customer.area),
            joinedload(Invoice.order),
            joinedload(Invoice.items),
        )
        .order_by(desc(Invoice.created_at))
    )

    if status and status.lower() != "all":
        query = query.filter(Invoice.status == InvoiceStatus(status.lower()))

    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)

    if route_id:
        query = query.join(Invoice.customer).join(Customer.area).filter(Area.route_id == route_id)

    if search:
        s = f"%{search}%"
        query = query.join(Customer).outerjoin(Customer.area).filter(
            (Invoice.invoice_no.ilike(s))
            | (Customer.shop_name.ilike(s))
            | (Customer.contact_person.ilike(s))
        )

    invoices = query.all()
    result = []
    for inv in invoices:
        cust = inv.customer
        area_obj = cust.area if cust else None
        route_obj = area_obj.route if area_obj and hasattr(area_obj, "route") else None
        area_name = area_obj.name if area_obj else None
        area_code = (
            f"{route_obj.route_number:02d}"
            if route_obj and route_obj.route_number
            else (f"{area_obj.id:02d}" if area_obj else None)
        )

        result.append({
            "id": inv.id,
            "invoice_no": inv.invoice_no,
            "order_id": inv.order_id,
            "order_no": inv.order.order_no if inv.order else None,
            "customer_id": inv.customer_id,
            "customer_name": cust.shop_name if cust else "Unknown",
            "customer_area": area_name,
            "customer_area_code": area_code,
            "date": inv.date,
            "due_date": inv.due_date,
            "subtotal": inv.subtotal,
            "gst_amount": inv.gst_amount,
            "total_amount": inv.total_amount,
            "paid_amount": inv.paid_amount or Decimal("0.00"),
            "status": inv.status.value if hasattr(inv.status, "value") else str(inv.status),
            "item_count": len(inv.items),
            "remarks": inv.remarks,
            "created_at": inv.created_at,
        })
    return result


def get_invoice_by_id(db: Session, invoice_id: int) -> Optional[dict]:
    """Get single invoice with full line items and customer details for preview & print."""
    invoice = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.customer).joinedload(Customer.area),
            joinedload(Invoice.order),
            joinedload(Invoice.items).joinedload(InvoiceItem.product).joinedload(Product.category),
        )
        .filter_by(id=invoice_id)
        .first()
    )
    if not invoice:
        return None

    cust = invoice.customer
    area_obj = cust.area if cust else None
    route_obj = area_obj.route if area_obj and hasattr(area_obj, "route") else None
    area_name = area_obj.name if area_obj else None
    area_code = (
        f"{route_obj.route_number:02d}"
        if route_obj and route_obj.route_number
        else (f"{area_obj.id:02d}" if area_obj else None)
    )

    items = []
    for item in invoice.items:
        prod = item.product
        cat = prod.category if prod else None
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": prod.display_name if prod else "Unknown",
            "category_code": cat.code if cat else "--",
            "category_name": cat.name if cat else "Unknown",
            "unit": prod.unit if prod else "PCS",
            "quantity": item.quantity,
            "rate": item.rate,
            "discount_pct": item.discount_pct,
            "discount_amt": item.discount_amt,
            "hsn_code": item.hsn_code or (cat.hsn_code if cat else "32089090"),
            "gst_rate": item.gst_rate,
            "gst_amount": item.gst_amount,
            "subtotal": item.subtotal,
            "total": item.total,
        })

    return {
        "id": invoice.id,
        "invoice_no": invoice.invoice_no,
        "order_id": invoice.order_id,
        "order_no": invoice.order.order_no if invoice.order else None,
        "customer_id": invoice.customer_id,
        "customer_name": cust.shop_name if cust else "Unknown",
        "customer_area": area_name,
        "customer_area_code": area_code,
        "customer_contact": cust.contact_person if cust else None,
        "customer_phone": cust.phone if cust else None,
        "customer_address": cust.address if cust else None,
        "customer_gstin": cust.gstin if cust else None,
        "date": invoice.date,
        "due_date": invoice.due_date,
        "subtotal": invoice.subtotal,
        "discount_amount": invoice.discount_amount,
        "gst_amount": invoice.gst_amount,
        "round_off": invoice.round_off if invoice.round_off is not None else Decimal("0.00"),
        "total_amount": invoice.total_amount,
        "paid_amount": invoice.paid_amount or Decimal("0.00"),
        "status": invoice.status.value if hasattr(invoice.status, "value") else str(invoice.status),
        "remarks": invoice.remarks,
        "item_count": len(invoice.items),
        "created_at": invoice.created_at,
        "updated_at": invoice.updated_at,
        "items": items,
    }


def update_invoice_status(db: Session, invoice_id: int, new_status: str) -> dict:
    """Update invoice payment status."""
    invoice = db.query(Invoice).filter_by(id=invoice_id).first()
    if not invoice:
        raise ValueError(f"Invoice #{invoice_id} not found")

    invoice.status = InvoiceStatus(new_status.lower())
    if invoice.status == InvoiceStatus.PAID:
        invoice.paid_amount = invoice.total_amount
    elif invoice.status == InvoiceStatus.UNPAID:
        invoice.paid_amount = Decimal("0.00")

    db.commit()
    db.refresh(invoice)
    return {
        "message": f"Invoice {invoice.invoice_no} status updated to {invoice.status.value}",
        "invoice_no": invoice.invoice_no,
        "status": invoice.status.value,
    }


def delete_invoice(db: Session, invoice_id: int) -> dict:
    """Delete invoice and adjust customer balance and inventory."""
    invoice = (
        db.query(Invoice)
        .options(joinedload(Invoice.items), joinedload(Invoice.customer))
        .filter_by(id=invoice_id)
        .first()
    )
    if not invoice:
        raise ValueError(f"Invoice #{invoice_id} not found")

    # Revert customer balance
    if invoice.customer and invoice.status != InvoiceStatus.VOID:
        invoice.customer.outstanding_balance = max(
            Decimal("0.00"),
            Decimal(str(invoice.customer.outstanding_balance or 0)) - invoice.total_amount
        )

    # Restore inventory
    for item in invoice.items:
        inv = db.query(Inventory).filter_by(product_id=item.product_id).first()
        if inv:
            qty_int = int(item.quantity)
            inv.physical_qty += qty_int
            inv.available_qty += qty_int

    inv_no = invoice.invoice_no
    db.delete(invoice)
    db.commit()
    return {"message": f"Invoice {inv_no} deleted successfully", "invoice_id": invoice_id}
