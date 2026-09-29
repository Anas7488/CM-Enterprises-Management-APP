#!/usr/bin/env python3
"""
Seed script: Load area.csv and customers.csv into the database.

Usage:
    cd backend
    source venv/bin/activate
    python -m scripts.seed_data
"""

import csv
import sys
import os
from pathlib import Path

# Add backend directory to sys.path so we can import app modules
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import engine, SessionLocal, Base

# Import ALL models so Base.metadata knows about every table
from app.modules.areas.model import Area
from app.modules.customers.model import Customer
from app.modules.users.model import User
from app.modules.products.model import ProductCategory, Product
from app.modules.orders.model import Order, OrderItem
from app.modules.invoices.model import Invoice, InvoiceItem
from app.modules.payments.model import Payment


# ── Config ──────────────────────────────────────────────────────────────────
EXAMPLES_DIR = Path(__file__).resolve().parents[2] / "Examples"
AREA_CSV = EXAMPLES_DIR / "area.csv"
CUSTOMERS_CSV = EXAMPLES_DIR / "customers.csv"

DEFAULT_CREDIT_LIMIT = 200000.00
DEFAULT_OUTSTANDING = 0.00


def create_tables():
    """Create all tables if they don't exist."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("  ✅ Tables ready")


def seed_areas(session):
    """Load areas from area.csv"""
    print(f"\nSeeding areas from: {AREA_CSV}")

    if not AREA_CSV.exists():
        print(f"  ❌ File not found: {AREA_CSV}")
        return

    # Check if areas already exist
    existing = session.query(Area).count()
    if existing > 0:
        print(f"  ⚠️  Areas table already has {existing} rows. Skipping.")
        print("     To re-seed, run: DELETE FROM areas CASCADE;")
        return

    areas = []
    with open(AREA_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            area_id = row.get("area_id", "").strip()
            route_code = row.get("route_code", "").strip()
            name = row.get("name", "").strip()

            # Skip empty rows
            if not area_id or not name:
                continue

            areas.append(Area(
                id=int(area_id),
                code=route_code,
                name=name,
            ))

    session.bulk_save_objects(areas)
    session.commit()
    print(f"  ✅ Inserted {len(areas)} areas")

    # Verify route code distribution
    from collections import Counter
    route_counts = Counter(a.code for a in areas)
    for code, count in sorted(route_counts.items(), key=lambda x: int(x[0])):
        print(f"     Route {code}: {count} areas")


def seed_customers(session):
    """Load customers from customers.csv"""
    print(f"\nSeeding customers from: {CUSTOMERS_CSV}")

    if not CUSTOMERS_CSV.exists():
        print(f"  ❌ File not found: {CUSTOMERS_CSV}")
        return

    # Check if customers already exist
    existing = session.query(Customer).count()
    if existing > 0:
        print(f"  ⚠️  Customers table already has {existing} rows. Skipping.")
        print("     To re-seed, run: DELETE FROM customers;")
        return

    # Get valid area IDs for validation
    valid_area_ids = {a.id for a in session.query(Area.id).all()}
    print(f"  Found {len(valid_area_ids)} valid area IDs in database")

    customers = []
    skipped = []
    with open(CUSTOMERS_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            shop_name = row.get("shop_name", "").strip()

            # Skip empty rows
            if not shop_name:
                continue

            # Parse area_id
            area_id_str = row.get("area_id", "").strip()
            if not area_id_str:
                skipped.append(f"  Row {row_num}: '{shop_name}' — no area_id")
                continue

            area_id = int(area_id_str)
            if area_id not in valid_area_ids:
                skipped.append(f"  Row {row_num}: '{shop_name}' — area_id {area_id} not in areas table")
                continue

            # Parse optional fields
            credit_limit_str = row.get("credit_limit", "").strip()
            credit_limit = float(credit_limit_str) if credit_limit_str else DEFAULT_CREDIT_LIMIT

            # The CSV has an unnamed column between credit_limit and is_active for outstanding_balance
            outstanding_str = row.get("", "").strip() if "" in row else "0"
            outstanding = float(outstanding_str) if outstanding_str else DEFAULT_OUTSTANDING

            contact_person = row.get("contact_person ❌", "").strip() or row.get("contact_person", "").strip() or None
            phone = row.get("phone ❌", "").strip() or row.get("phone", "").strip() or None
            gstin = row.get("gstin ❌", "").strip() or row.get("gstin", "").strip() or None

            customers.append(Customer(
                shop_name=shop_name,
                contact_person=contact_person,
                phone=phone,
                gstin=gstin,
                credit_limit=credit_limit,
                outstanding_balance=outstanding,
                is_active=True,
                area_id=area_id,
            ))

    if skipped:
        print(f"\n  ⚠️  Skipped {len(skipped)} rows:")
        for s in skipped:
            print(f"    {s}")

    session.bulk_save_objects(customers)
    session.commit()
    print(f"  ✅ Inserted {len(customers)} customers")


def main():
    print("=" * 60)
    print("  CM Enterprises — Database Seed Script")
    print("=" * 60)

    create_tables()

    session = SessionLocal()
    try:
        seed_areas(session)
        seed_customers(session)

        # Final summary
        print("\n" + "=" * 60)
        print("  SUMMARY")
        print("=" * 60)
        print(f"  Areas:     {session.query(Area).count()}")
        print(f"  Customers: {session.query(Customer).count()}")
        print("=" * 60)
        print("  ✅ Seeding complete!")

    except Exception as e:
        session.rollback()
        print(f"\n  ❌ Error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
