from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), unique=True, nullable=False)
    
    physical_qty = Column(Integer, nullable=False, default=0)
    reserved_qty = Column(Integer, nullable=False, default=0)
    available_qty = Column(Integer, nullable=False, default=0)
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    product = relationship("Product")

    def __repr__(self):
        return f"<Inventory ProductID: {self.product_id}, Physical: {self.physical_qty}>"
