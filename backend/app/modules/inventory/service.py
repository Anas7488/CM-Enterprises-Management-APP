from sqlalchemy.orm import Session, joinedload
from app.modules.inventory.model import Inventory
from app.modules.products.model import Product


def get_inventory(db: Session):
    """
    Fetch all inventory records, eagerly loading their associated Product and ProductCategory.
    """
    return db.query(Inventory).options(
        joinedload(Inventory.product).joinedload(Product.category)
    ).all()


def adjust_stock(db: Session, inventory_id: int, adjustment_qty: int) -> Inventory:
    """
    Adjust the physical_qty of an inventory record by adjustment_qty (positive or negative).
    Recalculates available_qty = physical_qty - reserved_qty.
    Raises ValueError if record not found or if stock would go negative.
    """
    record = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not record:
        raise ValueError(f"No inventory record found with id={inventory_id}")

    new_physical = record.physical_qty + adjustment_qty
    if new_physical < 0:
        raise ValueError(
            f"Adjustment would result in negative stock ({record.physical_qty} + {adjustment_qty} = {new_physical})"
        )

    record.physical_qty = new_physical
    record.available_qty = max(0, new_physical - record.reserved_qty)
    db.commit()
    # Re-load with relationships
    return db.query(Inventory).options(
        joinedload(Inventory.product).joinedload(Product.category)
    ).filter(Inventory.id == record.id).first()
