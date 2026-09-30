from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Enum, Date, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class InvoiceStatus(str, enum.Enum):
    UNPAID = "unpaid"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    VOID = "void"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_no = Column(String(30), unique=True, nullable=False, index=True)
    
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    order = relationship("Order", back_populates="invoices")

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer", back_populates="invoices")

    date = Column(Date, nullable=False, server_default=func.current_date())
    due_date = Column(Date, nullable=False)

    subtotal = Column(Numeric(12, 2), nullable=False, default=0.0)          # Tax-exclusive total
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    gst_amount = Column(Numeric(12, 2), nullable=False, default=0.0)        # Total GST collected
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.0)      # Grand total (inclusive of tax)
    paid_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    round_off = Column(Numeric(6, 2), nullable=False, default=0.0)    # +ve = rounded up, -ve = rounded down
    remarks = Column(Text, nullable=True)

    status = Column(
        Enum(
            InvoiceStatus,
            native_enum=False,
            values_callable=lambda x: [e.value for e in x],
            length=30,
        ),
        nullable=False,
        default=InvoiceStatus.UNPAID,
    )
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")
    credit_notes = relationship("CreditNote", back_populates="invoice")

    def __repr__(self):
        return f"<Invoice {self.invoice_no} (Status: {self.status})>"


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    invoice = relationship("Invoice", back_populates="items")

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product = relationship("Product")

    quantity = Column(Numeric(10, 3), nullable=False)
    rate = Column(Numeric(10, 2), nullable=False)              # Unit rate (tax-exclusive)
    discount_pct = Column(Numeric(5, 2), nullable=False, default=0.0)
    discount_amt = Column(Numeric(10, 2), nullable=False, default=0.0)
    hsn_code = Column(String(20), nullable=True)
    gst_rate = Column(Numeric(5, 2), nullable=False, default=0.0)           # Tax rate e.g., 18.00 or 0
    gst_amount = Column(Numeric(10, 2), nullable=False, default=0.0)         # Calculated tax for this row
    subtotal = Column(Numeric(12, 2), nullable=False, default=0.0)          # row subtotal (gross - discount)
    total = Column(Numeric(12, 2), nullable=False, default=0.0)             # subtotal + gst_amount

    def __repr__(self):
        return f"<InvoiceItem {self.product_id} x{self.quantity}>"
