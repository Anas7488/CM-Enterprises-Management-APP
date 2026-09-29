from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


# String constants — stored directly in DB as VARCHAR
class PaymentMethod:
    CASH         = "Cash"
    CASH_HAND    = "Cash in Hand"
    CASH_DIRECT  = "Cash Direct"
    UPI          = "UPI"
    NEFT         = "NEFT"
    RTGS         = "RTGS"
    BANK_TRANSFER = "Bank Transfer"
    BANK_DEPOSIT  = "Bank Deposit"
    CHEQUE       = "Cheque"
    BAD_DEBTS    = "Bad Debts"

    ALL = [
        CASH, CASH_HAND, CASH_DIRECT,
        UPI, NEFT, RTGS,
        BANK_TRANSFER, BANK_DEPOSIT,
        CHEQUE, BAD_DEBTS,
    ]


class PaymentStatus:
    PENDING   = "pending"
    COMPLETED = "completed"
    FAILED    = "failed"


class Payment(Base):
    __tablename__ = "payments"

    id         = Column(Integer, primary_key=True, index=True)
    receipt_no = Column(String(30), unique=True, nullable=False, index=True)

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer    = relationship("Customer", back_populates="payments")

    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    invoice    = relationship("Invoice", back_populates="payments")

    amount = Column(Numeric(12, 2), nullable=False)
    date   = Column(Date, nullable=False, server_default=func.current_date())

    payment_method = Column(String(50), nullable=False)
    status         = Column(String(20), nullable=False, default=PaymentStatus.COMPLETED)

    reference_no = Column(String(100), nullable=True)
    notes        = Column(String(500), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Payment {self.receipt_no} ({self.amount}, {self.status})>"
