from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class RouteType(str, enum.Enum):
    OUTSTATION = "outstation"
    LOCAL = "local"


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    route_number = Column(Integer, unique=True, nullable=False, index=True)
    type = Column(Enum(RouteType), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    areas = relationship("Area", back_populates="route")

    def __repr__(self):
        return f"<Route {self.route_number} ({self.type})>"


class Area(Base):
    __tablename__ = "areas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    route = relationship("Route", back_populates="areas")
    # customers = relationship("Customer", back_populates="area")

    def __repr__(self):
        return f"<Area {self.name}>"
