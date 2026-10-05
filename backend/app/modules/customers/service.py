from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from decimal import Decimal
from app.modules.customers.model import Customer
from app.modules.areas.model import Area, Route


def get_customers(
    db: Session,
    search: Optional[str] = None,
    route_id: Optional[int] = None,
    area_id: Optional[int] = None,
    is_active: Optional[bool] = True,
) -> List[Customer]:
    """
    Fetch customers with eager loading of Area & Route, with optional route filtering.
    """
    query = (
        db.query(Customer)
        .options(joinedload(Customer.area).joinedload(Area.route))
        .join(Customer.area)
        .join(Area.route)
    )

    if is_active is not None:
        query = query.filter(Customer.is_active == is_active)

    if route_id:
        query = query.filter(Area.route_id == route_id)

    if area_id:
        query = query.filter(Customer.area_id == area_id)

    if search:
        s = f"%{search}%"
        query = query.filter(
            (Customer.shop_name.ilike(s))
            | (Customer.contact_person.ilike(s))
            | (Customer.phone.ilike(s))
            | (Customer.gstin.ilike(s))
            | (Area.name.ilike(s))
        )

    return query.order_by(Customer.shop_name).all()


def get_customer_by_id(db: Session, customer_id: int) -> Optional[Customer]:
    return (
        db.query(Customer)
        .options(joinedload(Customer.area).joinedload(Area.route))
        .filter_by(id=customer_id)
        .first()
    )


def create_customer(db: Session, data: dict, user_route_id: Optional[int] = None) -> Customer:
    area_id = data["area_id"]
    area = db.query(Area).filter_by(id=area_id).first()
    if not area:
        raise ValueError(f"Area #{area_id} not found")

    # If sales executive has assigned route, ensure they can only add in their route
    if user_route_id and area.route_id != user_route_id:
        raise ValueError(f"You can only add customers to your assigned Route #{user_route_id}")

    opening = Decimal(str(data.get("opening_balance", 0.00)))
    credit_limit = Decimal(str(data.get("credit_limit", 0.00)))

    customer = Customer(
        shop_name=data["shop_name"].strip(),
        area_id=area.id,
        contact_person=data.get("contact_person") or None,
        phone=data.get("phone") or None,
        gstin=data.get("gstin") or None,
        address=data.get("address") or None,
        credit_limit=credit_limit,
        opening_balance=opening,
        outstanding_balance=opening,
        is_active=True,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def update_customer(db: Session, customer_id: int, data: dict, user_route_id: Optional[int] = None) -> Customer:
    customer = db.query(Customer).filter_by(id=customer_id).first()
    if not customer:
        raise ValueError(f"Customer #{customer_id} not found")

    if user_route_id and customer.area and customer.area.route_id != user_route_id:
        raise ValueError("You do not have permission to edit customers outside your route")

    if "area_id" in data and data["area_id"]:
        area = db.query(Area).filter_by(id=data["area_id"]).first()
        if not area:
            raise ValueError(f"Area #{data['area_id']} not found")
        if user_route_id and area.route_id != user_route_id:
            raise ValueError("Cannot move customer to an area outside your assigned route")
        customer.area_id = area.id

    for k in ["shop_name", "contact_person", "phone", "gstin", "address"]:
        if k in data and data[k] is not None:
            setattr(customer, k, data[k] or None)

    if "credit_limit" in data and data["credit_limit"] is not None:
        customer.credit_limit = Decimal(str(data["credit_limit"]))
    if "is_active" in data and data["is_active"] is not None:
        customer.is_active = bool(data["is_active"])

    db.commit()
    db.refresh(customer)
    return customer
