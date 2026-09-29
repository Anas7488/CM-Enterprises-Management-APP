from sqlalchemy import Column, Integer, String, Numeric, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)

    shop_name = Column(String(200), nullable=False, index=True)
    area_id = Column(Integer, ForeignKey("areas.id"), nullable=False)
    credit_limit = Column(Numeric(12, 2), nullable=False, default=0.00)

    contact_person = Column(String(100), nullable=True)
    phone = Column(String(15), nullable=True)
    gstin = Column(String(15), nullable=True)
    address = Column(Text, nullable=True)

    opening_balance = Column(Numeric(12, 2), nullable=False, default=0.00)
    outstanding_balance = Column(Numeric(12, 2), nullable=False, default=0.00)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    area = relationship("Area")
    orders = relationship("Order", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")
    payments = relationship("Payment", back_populates="customer")

    def __repr__(self):
        return f"<Customer {self.shop_name}>"
