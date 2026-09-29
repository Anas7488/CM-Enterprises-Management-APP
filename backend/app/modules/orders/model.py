from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Enum, Date, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PREPARING = "preparing"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class Order(Base):
    """
    A customer order containing one or more line items.
    Flow: pending → approved → preparing → dispatched → delivered
    Cancellation is allowed from any pre-dispatch status.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(30), unique=True, nullable=False, index=True)

    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    customer = relationship("Customer", back_populates="orders")

    status = Column(
        Enum(
            OrderStatus,
            native_enum=False,
            values_callable=lambda x: [e.value for e in x],
            length=30,
        ),
        nullable=False,
        default=OrderStatus.PENDING,
    )

    # ── Financial Summary ──────────────────────────────────────────────────
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)       # Sum of item subtotals
    discount_amount = Column(Numeric(12, 2), nullable=False, default=0) # Order-level discount
    gst_amount = Column(Numeric(12, 2), nullable=False, default=0)      # Total GST
    total_amount = Column(Numeric(12, 2), nullable=False, default=0)    # Grand total

    # ── Metadata ───────────────────────────────────────────────────────────
    remarks = Column(Text, nullable=True)                                # Special instructions
    delivery_date = Column(Date, nullable=True)                          # Expected delivery

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ── Relationships ──────────────────────────────────────────────────────
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="order")

    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])

    def __repr__(self):
        return f"<Order {self.order_no} ({self.status.value})>"


class OrderItem(Base):
    """
    A single line item in an order.
    Snapshots HSN/GST/unit at order-creation time so the record
    remains accurate even if product metadata changes later.
    """
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    order = relationship("Order", back_populates="items")

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    product = relationship("Product")

    # ── Quantity & Unit ────────────────────────────────────────────────────
    quantity = Column(Numeric(10, 3), nullable=False)    # Decimal for KG/LTR support
    unit = Column(String(10), nullable=False)             # Snapshot: "PCS", "KG", "LTR"

    # ── Pricing ────────────────────────────────────────────────────────────
    rate = Column(Numeric(10, 2), nullable=False)         # Selling rate per unit
    discount_pct = Column(Numeric(5, 2), nullable=False, default=0)   # e.g., 5.00%
    discount_amt = Column(Numeric(10, 2), nullable=False, default=0)  # Calculated

    # ── Tax (Snapshotted from category at order time) ──────────────────────
    hsn_code = Column(String(10), nullable=False)         # "32089090"
    gst_rate = Column(Numeric(5, 2), nullable=False)      # 18.00 or 5.00
    gst_amount = Column(Numeric(10, 2), nullable=False, default=0)

    # ── Totals ─────────────────────────────────────────────────────────────
    subtotal = Column(Numeric(12, 2), nullable=False)     # (rate × qty) - discount
    total = Column(Numeric(12, 2), nullable=False)        # subtotal + gst

    def __repr__(self):
        return f"<OrderItem {self.product_id} x{self.quantity}>"
