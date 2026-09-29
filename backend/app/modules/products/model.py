from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ProductGroup(str, enum.Enum):
    SHADED = "shaded"     # color/shade-based — paints, primers, emulsions
    VARIANT = "variant"   # type/size-based — brushes, rollers, hardware, chemicals


class ProductCategory(Base):
    """
    The 41 product categories from CM Enterprises' real catalog.
    Each category owns its own HSN code and GST rate — matches
    real-world Tally setup where HSN/GST is set once per item group.
    """
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(2), unique=True, nullable=False, index=True)   # "01" to "41"
    name = Column(String(100), nullable=False)                          # "Premium", "Metallic"
    group = Column(Enum(ProductGroup), nullable=False)                  # shaded | variant

    hsn_code = Column(String(10), nullable=False)                       # "32089090"
    gst_rate = Column(Numeric(5, 2), nullable=False, default=18.00)     # 18.00 normally, 5.00 for powders

    size_range = Column(String(50), nullable=True)                      # "25ml - 20L" (reference only)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    products = relationship("Product", back_populates="category")

    def __repr__(self):
        return f"<ProductCategory {self.code} {self.name}>"


class Product(Base):
    """
    Individual sellable items. A product always belongs to a category,
    and depending on the category's group, either shade_* or variant_*
    fields are populated (never both).
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)

    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=False)
    category = relationship("ProductCategory", back_populates="products")

    # Denormalized for fast filtering/search without a join
    product_type = Column(Enum(ProductGroup), nullable=False)

    # ── Shaded products only (paints, primers, emulsions) ──
    shade_name = Column(String(100), nullable=True)     # "Art Metallic Gold"
    shade_code = Column(String(10), nullable=True)       # "2001" — unique per shade+size

    # ── Variant products only (brushes, rollers, hardware) ──
    variant_code = Column(String(10), nullable=True)     # "F1"
    variant_name = Column(String(100), nullable=True)    # "Flat Brush"

    # ── Common to both types ──
    size = Column(String(30), nullable=False)            # "200ml", "50mm", "16x24"
    unit = Column(String(10), nullable=False, default="PCS")

    mrp = Column(Numeric(10, 2), nullable=False, default=0.00)
    dealer_price = Column(Numeric(10, 2), nullable=True)     # Default selling rate for dealers
    pcs_per_carton = Column(Integer, nullable=True)           # e.g., 12 — for carton-based ordering
    reorder_level = Column(Integer, nullable=False, default=10)

    # ── Per-product HSN/GST overrides (nullable → falls back to category) ──
    hsn_code = Column(String(10), nullable=True)
    gst_rate = Column(Numeric(5, 2), nullable=True)

    is_active = Column(Integer, nullable=False, default=1)  # soft delete flag (1=active, 0=inactive)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def effective_hsn(self) -> str:
        """Return product-level HSN if set, otherwise fall back to category."""
        return self.hsn_code or (self.category.hsn_code if self.category else "")

    @property
    def effective_gst_rate(self):
        """Return product-level GST rate if set, otherwise fall back to category."""
        if self.gst_rate is not None:
            return self.gst_rate
        return self.category.gst_rate if self.category else 18.00

    @property
    def display_name(self) -> str:
        """
        Auto-generates the full product name matching CM Enterprises'
        existing Tally naming convention.

        Shaded (most categories): "01 Art Metallic Gold 200ml"
        Shaded (Spray Paint only, has shade_code): "15 Spray Medium Grey 250ml - 2110"
        Variant: "17 Flat Brush (F1) 50mm"
        """
        if self.product_type == ProductGroup.SHADED:
            if self.shade_code:
                return f"{self.category.code} {self.shade_name} {self.size} - {self.shade_code}"
            return f"{self.category.code} {self.shade_name} {self.size}"
        return f"{self.category.code} {self.variant_name} ({self.variant_code}) {self.size}"
    def __repr__(self):
        return f"<Product {self.display_name}>"