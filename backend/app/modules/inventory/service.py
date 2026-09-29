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
