from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
import datetime as dt


# ── Nested schemas ────────────────────────────────────────────────────────────

class CustomerBrief(BaseModel):
    id: int
    shop_name: str

    class Config:
        from_attributes = True


class InvoiceBrief(BaseModel):
    id: int
    invoice_no: str
    total_amount: Decimal
    paid_amount: Decimal

    class Config:
        from_attributes = True


# ── Request schemas ───────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    customer_id: int
    amount: Decimal = Field(gt=0, description="Amount collected")
    date: Optional[dt.date] = None                          # defaults to today
    payment_method: str = Field(description="Cash | UPI | NEFT | RTGS | Bank Transfer | Bank Deposit | Cheque | Cash in Hand | Cash Direct | Bad Debts")
    invoice_id: Optional[int] = None                        # optional invoice link
    reference_no: Optional[str] = None                      # cheque/UTR/UPI ref
    notes: Optional[str] = None


class PaymentStatusUpdate(BaseModel):
    status: str = Field(description="pending | completed | failed")


# ── Response schemas ──────────────────────────────────────────────────────────

class PaymentOut(BaseModel):
    id: int
    receipt_no: str
    amount: Decimal
    date: dt.date
    payment_method: str
    status: str
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[dt.datetime] = None

    customer: Optional[CustomerBrief] = None
    invoice: Optional[InvoiceBrief] = None

    class Config:
        from_attributes = True


class PaymentSummary(BaseModel):
    total_collected: Decimal
    pending_amount: Decimal
    failed_amount: Decimal
    total_count: int
