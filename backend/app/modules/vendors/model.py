from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    gstin = Column(String(15), nullable=True)
    address = Column(Text, nullable=True)
    state_name = Column(String(50), nullable=True, default="Karnataka")
    state_code = Column(String(2), nullable=True, default="29")

    opening_balance = Column(Numeric(12, 2), nullable=False, default=0.00)
    outstanding_payable = Column(Numeric(12, 2), nullable=False, default=0.00)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    debit_notes = relationship("DebitNote", back_populates="vendor")

    def __repr__(self):
        return f"<Vendor {self.name}>"
