from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.modules.products.model import Product, ProductCategory
from app.modules.inventory.model import Inventory


def get_all_categories(db: Session):
    """Fetch all product categories ordered by code."""
    return db.query(ProductCategory).order_by(ProductCategory.code).all()


def get_all_products(db: Session):
    """
    Fetch all active products with their category and current stock level.
    Left joins inventory so products without stock still appear.
    """
    results = (
        db.query(Product, func.coalesce(Inventory.physical_qty, 0).label("stock"))
        .outerjoin(Inventory, Inventory.product_id == Product.id)
        .options(joinedload(Product.category))
        .filter(Product.is_active == 1)
        .order_by(Product.category_id, Product.shade_name, Product.size)
        .all()
    )

    products = []
    for product, stock in results:
        product.stock = stock
        products.append(product)

    return products


def update_category(db: Session, category_id: int, data: dict) -> ProductCategory:
    """Update a product category's HSN code, GST rate, or name."""
    cat = db.query(ProductCategory).filter_by(id=category_id).first()
    if not cat:
        raise ValueError(f"Category #{category_id} not found")

    if "hsn_code" in data and data["hsn_code"] is not None:
        cat.hsn_code = data["hsn_code"]
    if "gst_rate" in data and data["gst_rate"] is not None:
        cat.gst_rate = data["gst_rate"]
    if "name" in data and data["name"] is not None:
        cat.name = data["name"]

    db.commit()
    db.refresh(cat)
    return cat


def create_product(db: Session, data: dict) -> Product:
    """Create a new product and initialize its inventory record."""
    from app.modules.products.model import ProductGroup

    category_id = data.get("category_id")
    category = db.query(ProductCategory).filter_by(id=category_id).first()
    if not category:
        raise ValueError(f"Category #{category_id} not found")

    raw_type = data.get("product_type")
    if raw_type:
        product_type = ProductGroup(raw_type) if isinstance(raw_type, str) else raw_type
    else:
        product_type = category.group

    initial_stock = data.pop("initial_stock", 0) or 0

    product = Product(
        category_id=category.id,
        product_type=product_type,
        shade_name=data.get("shade_name") or None,
        shade_code=data.get("shade_code") or None,
        variant_name=data.get("variant_name") or None,
        variant_code=data.get("variant_code") or None,
        size=data.get("size") or "",
        unit=data.get("unit") or "PCS",
        mrp=data.get("mrp") or 0.00,
        dealer_price=data.get("dealer_price") or None,
        pcs_per_carton=data.get("pcs_per_carton") or None,
        reorder_level=data.get("reorder_level") or 10,
        hsn_code=data.get("hsn_code") or None,
        gst_rate=data.get("gst_rate") or None,
        is_active=1,
    )
    db.add(product)
    db.flush()

    inv = Inventory(
        product_id=product.id,
        physical_qty=initial_stock,
        reserved_qty=0,
        available_qty=initial_stock,
    )
    db.add(inv)
    db.commit()
    db.refresh(product)
    product.stock = initial_stock
    return product
