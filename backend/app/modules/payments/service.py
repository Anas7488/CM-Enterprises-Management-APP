from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from decimal import Decimal
import datetime

from app.modules.payments.model import Payment, PaymentStatus, PaymentMethod
from app.modules.invoices.model import Invoice, InvoiceStatus
from app.modules.customers.model import Customer


# ── Receipt number generator ──────────────────────────────────────────────────

def _next_receipt_no(db: Session) -> str:
    """Generate sequential receipt number: RCP-2026-0001"""
    year = datetime.date.today().year
    last = (
        db.query(Payment)
        .filter(Payment.receipt_no.like(f"RCP-{year}-%"))
        .order_by(Payment.id.desc())
        .first()
    )
    seq = 1
    if last:
        try:
            seq = int(last.receipt_no.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    return f"RCP-{year}-{seq:04d}"


# ── Create payment ────────────────────────────────────────────────────────────

def create_payment(db: Session, data: dict) -> Payment:
    """
    Record a collection (payment received):
    1. Reduce customer outstanding_balance by the amount collected.
    2. Optionally update the linked invoice's paid_amount and status.
    3. Persist the Payment record with an auto-generated receipt_no.
    """
    customer_id = data["customer_id"]
    amount = Decimal(str(data["amount"]))
    invoice_id = data.get("invoice_id")
    payment_method_str = data["payment_method"]
    payment_date = data.get("date") or datetime.date.today()
    reference_no = data.get("reference_no")
    notes = data.get("notes")

    # Validate customer
    customer = db.query(Customer).filter_by(id=customer_id).first()
    if not customer:
        raise ValueError(f"Customer #{customer_id} not found")

    # Validate payment method
    if payment_method_str not in PaymentMethod.ALL:
        raise ValueError(f"Invalid payment method '{payment_method_str}'. Valid: {PaymentMethod.ALL}")
    payment_method = payment_method_str

    # 1. Reduce customer outstanding balance
    if customer.outstanding_balance is None:
        customer.outstanding_balance = Decimal("0.00")
    customer.outstanding_balance = Decimal(str(customer.outstanding_balance)) - amount

    # 2. Optionally update linked invoice
    invoice = None
    if invoice_id:
        invoice = db.query(Invoice).filter_by(id=invoice_id).first()
        if invoice:
            if invoice.paid_amount is None:
                invoice.paid_amount = Decimal("0.00")
            invoice.paid_amount = Decimal(str(invoice.paid_amount)) + amount
            # Update invoice status
            if invoice.paid_amount >= invoice.total_amount:
                invoice.status = InvoiceStatus.PAID
            elif invoice.paid_amount > 0:
                invoice.status = InvoiceStatus.PARTIALLY_PAID

    # 3. Create payment record
    payment = Payment(
        receipt_no=_next_receipt_no(db),
        customer_id=customer_id,
        invoice_id=invoice_id if invoice else None,
        amount=amount,
        date=payment_date,
        payment_method=payment_method,
        status=PaymentStatus.COMPLETED,
        reference_no=reference_no,
        notes=notes,
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


# ── List payments ─────────────────────────────────────────────────────────────

def get_payments(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    method: Optional[str] = None,
    search: Optional[str] = None,
    customer_id: Optional[int] = None,
) -> list[Payment]:
    q = db.query(Payment).options(
        joinedload(Payment.customer),
        joinedload(Payment.invoice),
    )

    if start_date:
        q = q.filter(Payment.date >= start_date)
    if end_date:
        q = q.filter(Payment.date <= end_date)
    if status:
        q = q.filter(Payment.status == status)
    if method:
        q = q.filter(Payment.payment_method == method)
    if customer_id:
        q = q.filter(Payment.customer_id == customer_id)
    if search:
        q = q.join(Payment.customer).filter(
            Customer.shop_name.ilike(f"%{search}%")
            | Payment.receipt_no.ilike(f"%{search}%")
        )

    return q.order_by(Payment.date.desc(), Payment.id.desc()).all()


# ── Delete payment (reversal) ─────────────────────────────────────────────────

def delete_payment(db: Session, payment_id: int) -> None:
    """
    Delete a payment and reverse its effects:
    - Add amount back to customer outstanding_balance.
    - Reverse invoice paid_amount if linked.
    """
    payment = db.query(Payment).options(
        joinedload(Payment.customer),
        joinedload(Payment.invoice),
    ).filter_by(id=payment_id).first()
    if not payment:
        raise ValueError(f"Payment #{payment_id} not found")

    amount = Decimal(str(payment.amount))

    # Reverse customer balance
    if payment.customer:
        bal = Decimal(str(payment.customer.outstanding_balance or 0))
        payment.customer.outstanding_balance = bal + amount

    # Reverse invoice paid_amount
    if payment.invoice:
        inv = payment.invoice
        paid = Decimal(str(inv.paid_amount or 0))
        inv.paid_amount = max(Decimal("0.00"), paid - amount)
        if inv.paid_amount <= 0:
            inv.status = InvoiceStatus.UNPAID
        elif inv.paid_amount < Decimal(str(inv.total_amount)):
            inv.status = InvoiceStatus.PARTIALLY_PAID

    db.delete(payment)
    db.commit()


# ── Summary KPIs ──────────────────────────────────────────────────────────────

def get_payment_summary(db: Session) -> dict:
    rows = db.query(Payment.status, func.sum(Payment.amount)).group_by(Payment.status).all()
    totals = {PaymentStatus.COMPLETED: Decimal("0.00"), PaymentStatus.PENDING: Decimal("0.00"), PaymentStatus.FAILED: Decimal("0.00")}
    count = db.query(func.count(Payment.id)).scalar() or 0

    for status, total in rows:
        if total is not None and status in totals:
            totals[status] = Decimal(str(total))

    return {
        "total_collected": totals[PaymentStatus.COMPLETED],
        "pending_amount": totals[PaymentStatus.PENDING],
        "failed_amount": totals[PaymentStatus.FAILED],
        "total_count": count,
    }
