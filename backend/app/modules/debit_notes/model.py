from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Enum, Date, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DebitNoteStatus(str, enum.Enum):
    ISSUED = "issued"
    CANCELLED = "cancelled"


class DebitNote(Base):
    __tablename__ = "debit_notes"

    id = Column(Integer, primary_key=True, index=True)
    debit_note_no = Column(String(30), unique=True, nullable=False, index=True)

    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False)
    vendor = relationship("Vendor", back_populates="debit_notes")

    purchase_bill_no = Column(String(50), nullable=True)     # Optional manual reference
    purchase_bill_date = Column(Date, nullable=True)

    date = Column(Date, nullable=False, server_default=func.current_date())
    reason = Column(String(255), nullable=False, default="Purchase Return / Damaged Stock")

    subtotal = Column(Numeric(12, 2), nullable=False, default=0.0)
    gst_amount = Column(Numeric(12, 2), nullable=False, default=0.0)
    round_off = Column(Numeric(6, 2), nullable=False, default=0.0)
    total_amount = Column(Numeric(12, 2), nullable=False, default=0.0)

    status = Column(
        Enum(
            DebitNoteStatus,
            native_enum=False,
            values_callable=lambda x: [e.value for e in x],
            length=30,
        ),
        nullable=False,
        default=DebitNoteStatus.ISSUED,
    )
    remarks = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    items = relationship("DebitNoteItem", back_populates="debit_note", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<DebitNote {self.debit_note_no} for Vendor #{self.vendor_id}>"


class DebitNoteItem(Base):
    __tablename__ = "debit_note_items"

    id = Column(Integer, primary_key=True, index=True)
    debit_note_id = Column(Integer, ForeignKey("debit_notes.id"), nullable=False)
    debit_note = relationship("DebitNote", back_populates="items")

    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product = relationship("Product")

    custom_item_name = Column(String(200), nullable=True)

    quantity = Column(Numeric(10, 3), nullable=False)
    rate = Column(Numeric(10, 2), nullable=False)
    hsn_code = Column(String(20), nullable=True)
    gst_rate = Column(Numeric(5, 2), nullable=False, default=0.0)
    gst_amount = Column(Numeric(10, 2), nullable=False, default=0.0)
    subtotal = Column(Numeric(12, 2), nullable=False, default=0.0)
    total = Column(Numeric(12, 2), nullable=False, default=0.0)
    deduct_inventory = Column(Boolean, nullable=False, default=True)

    @property
    def item_display_name(self) -> str:
        if self.product:
            return self.product.display_name
        return self.custom_item_name or "Item"

    def __repr__(self):
        return f"<DebitNoteItem {self.item_display_name} x{self.quantity}>"
