from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from typing import Optional

import app.shared.models  # noqa: F401 - ensure all ORM models are registered
from app.modules.orders.model import Order, OrderItem, OrderStatus
from app.modules.products.model import Product, ProductCategory
from app.modules.customers.model import Customer
from app.modules.inventory.model import Inventory


def _next_order_no(db: Session) -> str:
    """Generate next order number: ORD-2026-0001"""
    import datetime
    year = datetime.date.today().year
    prefix = f"ORD-{year}-"

    last = (
        db.query(Order)
        .filter(Order.order_no.like(f"{prefix}%"))
        .order_by(desc(Order.id))
        .first()
    )
    if last:
        last_num = int(last.order_no.split("-")[-1])
        return f"{prefix}{last_num + 1:04d}"
    return f"{prefix}0001"


def _round2(val: Decimal) -> Decimal:
    return Decimal(val).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def create_order(db: Session, data: dict, user_id: int) -> Order:
    """
    Create a new order with line items.
    Auto-calculates discount, GST, and totals for each item.
    """
    customer = db.query(Customer).filter_by(id=data["customer_id"]).first()
    if not customer:
        raise ValueError(f"Customer ID {data['customer_id']} not found")

    order = Order(
        order_no=_next_order_no(db),
        customer_id=data["customer_id"],
        status=OrderStatus.PENDING,
        remarks=data.get("remarks"),
        delivery_date=data.get("delivery_date"),
        created_by_id=user_id,
    )

    order_subtotal = Decimal("0")
    order_gst = Decimal("0")

    for item_data in data["items"]:
        product = (
            db.query(Product)
            .options(joinedload(Product.category))
            .filter_by(id=item_data["product_id"])
            .first()
        )
        if not product:
            raise ValueError(f"Product ID {item_data['product_id']} not found")

        category = product.category
        qty = Decimal(str(item_data["quantity"]))
        rate_val = item_data.get("rate")
        if rate_val is None or rate_val == "":
            rate = Decimal(str(product.dealer_price or product.mrp or 0))
        else:
            rate = Decimal(str(rate_val))
        disc_pct = Decimal(str(item_data.get("discount_pct", 0)))

        # Calculate line item
        gross = _round2(rate * qty)
        disc_amt = _round2(gross * disc_pct / 100)
        subtotal = _round2(gross - disc_amt)
        bill_type = item_data.get("bill_type", "GST")
        if bill_type == "W.O":
            gst_rate = Decimal("0")
        else:
            gst_rate = Decimal(str(category.gst_rate if category and category.gst_rate is not None else 18))
        gst_amt = _round2(subtotal * gst_rate / 100)
        total = _round2(subtotal + gst_amt)

        item = OrderItem(
            product_id=product.id,
            quantity=qty,
            unit=product.unit,
            rate=rate,
            discount_pct=disc_pct,
            discount_amt=disc_amt,
            hsn_code=category.hsn_code,
            gst_rate=gst_rate,
            gst_amount=gst_amt,
            subtotal=subtotal,
            total=total,
        )
        order.items.append(item)
        order_subtotal += subtotal
        order_gst += gst_amt

    # Order-level discount
    order_disc = Decimal(str(data.get("discount_amount", 0)))

    order.subtotal = _round2(order_subtotal)
    order.discount_amount = _round2(order_disc)
    order.gst_amount = _round2(order_gst)
    order.total_amount = _round2(order_subtotal - order_disc + order_gst)

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def get_orders(
    db: Session,
    status: Optional[str] = None,
    search: Optional[str] = None,
    customer_id: Optional[int] = None,
) -> list:
    """List orders with optional filters."""
    query = (
        db.query(Order)
        .options(
            joinedload(Order.customer).joinedload(Customer.area),
            joinedload(Order.created_by),
        )
        .order_by(desc(Order.created_at))
    )

    if status:
        query = query.filter(Order.status == OrderStatus(status))

    if customer_id:
        query = query.filter(Order.customer_id == customer_id)

    if search:
        search_term = f"%{search}%"
        query = query.join(Customer).outerjoin(Customer.area).filter(
            (Order.order_no.ilike(search_term))
            | (Customer.shop_name.ilike(search_term))
            | (Customer.contact_person.ilike(search_term))
        )

    orders = query.all()

    result = []
    for o in orders:
        cust = o.customer
        area_obj = cust.area if cust else None
        route_obj = area_obj.route if area_obj and hasattr(area_obj, "route") else None
        area_name = area_obj.name if area_obj else None
        area_code = f"{route_obj.route_number:02d}" if route_obj and route_obj.route_number else (f"{area_obj.id:02d}" if area_obj else None)

        result.append({
            "id": o.id,
            "order_no": o.order_no,
            "customer_id": o.customer_id,
            "customer_name": cust.shop_name if cust else "Unknown",
            "customer_area": area_name,
            "customer_area_code": area_code,
            "status": o.status.value,
            "total_amount": o.total_amount,
            "item_count": len(o.items),
            "remarks": o.remarks,
            "delivery_date": o.delivery_date,
            "created_by": o.created_by.name if o.created_by else "Unknown",
            "created_at": o.created_at,
        })
    return result


def get_order_by_id(db: Session, order_id: int) -> dict:
    """Get single order with full item details."""
    order = (
        db.query(Order)
        .options(
            joinedload(Order.customer).joinedload(Customer.area),
            joinedload(Order.created_by),
            joinedload(Order.approved_by),
            joinedload(Order.items).joinedload(OrderItem.product).joinedload(Product.category),
        )
        .filter_by(id=order_id)
        .first()
    )
    if not order:
        return None

    cust = order.customer
    area_obj = cust.area if cust else None
    route_obj = area_obj.route if area_obj and hasattr(area_obj, "route") else None
    area_name = area_obj.name if area_obj else None
    area_code = f"{route_obj.route_number:02d}" if route_obj and route_obj.route_number else (f"{area_obj.id:02d}" if area_obj else None)

    items = []
    for item in order.items:
        product = item.product
        category = product.category if product else None
        items.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": product.display_name if product else "Unknown",
            "category_code": category.code if category else "--",
            "category_name": category.name if category else "Unknown",
            "quantity": item.quantity,
            "unit": item.unit,
            "rate": item.rate,
            "discount_pct": item.discount_pct,
            "discount_amt": item.discount_amt,
            "hsn_code": item.hsn_code,
            "gst_rate": item.gst_rate,
            "gst_amount": item.gst_amount,
            "subtotal": item.subtotal,
            "total": item.total,
        })

    return {
        "id": order.id,
        "order_no": order.order_no,
        "customer_id": order.customer_id,
        "customer_name": cust.shop_name if cust else "Unknown",
        "customer_area": area_name,
        "customer_area_code": area_code,
        "status": order.status.value,
        "subtotal": order.subtotal,
        "discount_amount": order.discount_amount,
        "gst_amount": order.gst_amount,
        "total_amount": order.total_amount,
        "remarks": order.remarks,
        "delivery_date": order.delivery_date,
        "item_count": len(order.items),
        "created_by": order.created_by.name if order.created_by else "Unknown",
        "approved_by": order.approved_by.name if order.approved_by else None,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": items,
    }


def update_order_status(db: Session, order_id: int, new_status: str, user_id: int) -> Order:
    """
    Transition an order's status. Validates allowed transitions.
    On 'approved': reserves inventory.
    On 'cancelled': releases reserved inventory.
    On 'dispatched': deducts physical stock and releases reservation.
    """
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter_by(id=order_id)
        .first()
    )
    if not order:
        raise ValueError(f"Order {order_id} not found")

    target = OrderStatus(new_status)
    current = order.status

    # Allowed transitions
    allowed = {
        OrderStatus.PENDING: [OrderStatus.APPROVED, OrderStatus.CANCELLED],
        OrderStatus.APPROVED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        OrderStatus.PREPARING: [OrderStatus.DISPATCHED, OrderStatus.CANCELLED],
        OrderStatus.DISPATCHED: [OrderStatus.DELIVERED],
        OrderStatus.DELIVERED: [],    # Terminal state
        OrderStatus.CANCELLED: [],    # Terminal state
    }

    if target not in allowed.get(current, []):
        raise ValueError(
            f"Cannot move from '{current.value}' to '{target.value}'. "
            f"Allowed: {[s.value for s in allowed.get(current, [])]}"
        )

    # ── Stock operations ───────────────────────────────────────────────────
    if target == OrderStatus.APPROVED:
        # Reserve stock (allow approval even if stock is 0 / insufficient for backorders)
        for item in order.items:
            inv = db.query(Inventory).filter_by(product_id=item.product_id).first()
            if not inv:
                inv = Inventory(
                    product_id=item.product_id,
                    physical_qty=0,
                    reserved_qty=0,
                    available_qty=0,
                )
                db.add(inv)
                db.flush()
            qty = int(item.quantity)
            inv.reserved_qty += qty
            inv.available_qty -= qty

        order.approved_by_id = user_id

    elif target == OrderStatus.DISPATCHED:
        # Deduct physical stock, release reservation
        for item in order.items:
            inv = db.query(Inventory).filter_by(product_id=item.product_id).first()
            if not inv:
                inv = Inventory(
                    product_id=item.product_id,
                    physical_qty=0,
                    reserved_qty=0,
                    available_qty=0,
                )
                db.add(inv)
                db.flush()
            qty = int(item.quantity)
            inv.physical_qty -= qty
            inv.reserved_qty -= qty

    elif target == OrderStatus.CANCELLED:
        # Release reserved stock (only if was approved/preparing)
        if current in (OrderStatus.APPROVED, OrderStatus.PREPARING):
            for item in order.items:
                inv = db.query(Inventory).filter_by(product_id=item.product_id).first()
                if inv:
                    qty = int(item.quantity)
                    inv.reserved_qty -= qty
                    inv.available_qty += qty

    order.status = target
    db.commit()
    db.refresh(order)
    return order


def delete_order(db: Session, order_id: int, user_role: Optional[str] = None) -> dict:
    """
    Delete an order and release any reserved inventory if approved or preparing.
    """
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter_by(id=order_id)
        .first()
    )
    if not order:
        raise ValueError(f"Order #{order_id} not found")

    # Release reserved stock if applicable
    if order.status in (OrderStatus.APPROVED, OrderStatus.PREPARING):
        for item in order.items:
            inv = db.query(Inventory).filter_by(product_id=item.product_id).first()
            if inv:
                qty = int(item.quantity)
                inv.reserved_qty = max(0, inv.reserved_qty - qty)
                inv.available_qty += qty

    order_no = order.order_no
    db.delete(order)
    db.commit()
    return {"message": f"Order {order_no} deleted successfully", "order_id": order_id, "order_no": order_no}


def bulk_delete_orders(db: Session, order_ids: list[int]) -> dict:
    """
    Delete multiple orders in batch.
    """
    deleted_count = 0
    deleted_orders = []
    for oid in order_ids:
        try:
            res = delete_order(db, oid)
            deleted_count += 1
            deleted_orders.append(res["order_no"])
        except ValueError:
            continue
    return {
        "message": f"Successfully deleted {deleted_count} orders",
        "deleted_count": deleted_count,
        "deleted_orders": deleted_orders,
    }
