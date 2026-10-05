from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from decimal import Decimal

from app.modules.vendors.model import Vendor


def get_all_vendors(db: Session, search: Optional[str] = None, is_active: Optional[bool] = None) -> List[Vendor]:
    query = db.query(Vendor).order_by(Vendor.name)
    if is_active is not None:
        query = query.filter(Vendor.is_active == is_active)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Vendor.name.ilike(s))
            | (Vendor.contact_person.ilike(s))
            | (Vendor.phone.ilike(s))
            | (Vendor.gstin.ilike(s))
        )
    return query.all()


def get_vendor_by_id(db: Session, vendor_id: int) -> Optional[Vendor]:
    return db.query(Vendor).filter_by(id=vendor_id).first()


def create_vendor(db: Session, data: dict) -> Vendor:
    opening = Decimal(str(data.get("opening_balance", 0.00)))
    vendor = Vendor(
        name=data["name"].strip(),
        contact_person=data.get("contact_person") or None,
        phone=data.get("phone") or None,
        email=data.get("email") or None,
        gstin=data.get("gstin") or None,
        address=data.get("address") or None,
        state_name=data.get("state_name") or "Karnataka",
        state_code=data.get("state_code") or "29",
        opening_balance=opening,
        outstanding_payable=opening,
        is_active=True,
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


def update_vendor(db: Session, vendor_id: int, data: dict) -> Vendor:
    vendor = db.query(Vendor).filter_by(id=vendor_id).first()
    if not vendor:
        raise ValueError(f"Vendor #{vendor_id} not found")

    for k, v in data.items():
        if v is not None and hasattr(vendor, k):
            setattr(vendor, k, v)

    db.commit()
    db.refresh(vendor)
    return vendor


def delete_vendor(db: Session, vendor_id: int) -> dict:
    vendor = db.query(Vendor).filter_by(id=vendor_id).first()
    if not vendor:
        raise ValueError(f"Vendor #{vendor_id} not found")
    vendor.is_active = False
    db.commit()
    return {"message": f"Vendor {vendor.name} deactivated successfully", "id": vendor_id}
