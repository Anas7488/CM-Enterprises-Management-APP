from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Enum, Date, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class CreditNoteStatus(str, enum.Enum):
    ISSUED = "issued"
    CANCELLED = "cancelled"


class CreditNote(Base):
    __tablename__ = "credit_notes"

    id = Column(Integer, primary_key=True, index=True)
    credit_note_no = Column(String(30), unique=True, nullable=False, index=True)

    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    invoice = relationship("Invoice", back_populates="credit_notes")

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer")

    date = Column(Date, nullable=False, server_default=func.current_date())
    reason = Column(String(255), nullable=False, default="Sales Return")

    subtotal = Column(Numeric(12, 2), nullable=False, default=0.0)
    gst_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    round_off = Column(Numeric(6, 2), nullable=False, default=0.0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.0)

    status = Column(
        Enum(
            CreditNoteStatus,
            native_enum=False,
            values_callable=lambda x: [e.value for e in x],
            length=30,
        ),
        nullable=False,
        default=CreditNoteStatus.ISSUED,
    )
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    items = relationship("CreditNoteItem", back_populates="credit_note", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<CreditNote {self.credit_note_no} for Inv #{self.invoice_id}>"


class CreditNoteItem(Base):
    __tablename__ = "credit_note_items"

    id = Column(Integer, primary_key=True, index=True)
    credit_note_id = Column(Integer, ForeignKey("credit_notes.id"), nullable=False)
    credit_note = relationship("CreditNote", back_populates="items")

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product = relationship("Product")

    quantity = Column(Numeric(10, 3), nullable=False)
    rate = Column(Numeric(10, 2), nullable=False)
    hsn_code = Column(String(20), nullable=True)
    gst_rate = Column(Numeric(5, 2), nullable=False, default=0.0)
    gst_amount = Column(Numeric(10, 2), nullable=False, default=0.0)
    subtotal = Column(Numeric(12, 2), nullable=False, default=0.0)
    total = Column(Numeric(12, 2), nullable=False, default=0.0)
    restock_inventory = Column(Boolean, nullable=False, default=True)

    def __repr__(self):
        return f"<CreditNoteItem {self.product_id} x{self.quantity}>"
