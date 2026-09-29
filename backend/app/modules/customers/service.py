from sqlalchemy.orm import Session, joinedload
from app.modules.customers.model import Customer
from app.modules.areas.model import Area


def get_customers(db: Session):
    """
    Fetch all customers, eagerly loading their associated Area and Route.
    """
    return db.query(Customer).options(
        joinedload(Customer.area).joinedload(Area.route)
    ).filter(Customer.is_active == True).all()
