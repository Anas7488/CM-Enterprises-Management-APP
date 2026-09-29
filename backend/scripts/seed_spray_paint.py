#!/usr/bin/env python3
"""
Seed script: Load spray_paint.csv into the database, creating both products and active inventory stock.

Usage:
    cd backend
    python -m scripts.seed_spray_paint
"""

import csv
import sys
import os
import re
from pathlib import Path
from decimal import Decimal

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.modules.products.model import Product, ProductCategory, ProductGroup
from app.modules.inventory.model import Inventory

CSV_PATH = Path(__file__).resolve().parents[3] / "Examples" / "spray_paint.csv"


def parse_tally_name(name: str):
    name = name.strip()
    # Skip summary, total, and header lines
    if not name or "Grand Total" in name or "SPRAYPAINTS" in name.upper() or name.startswith(","):
        return None
    
    # 1. Clean group/brand prefix
    # Remove leading '02', '02SPRAY', '02 SPRAY', '02 SPRYA', '02 SPARY'
    clean = re.sub(r'^02\s*(SPRAY|SPARY|SPRYA)?\s*', '', name, flags=re.IGNORECASE)
    
    # 2. Extract size
    # Look for volume indicator '250', '300', '400', '250ML', '400 ML', '400ml'
    size_match = re.search(r'\b(250|300|400)\s*(ml)?\b', clean, flags=re.IGNORECASE)
    if size_match:
        size_val = size_match.group(1)
        size = f"{size_val}ml"
        clean = clean.replace(size_match.group(0), "")
    else:
        # Default size if not specified
        size = "250ml"
        
    # 3. Extract shade code at the end
    # Match 3 or 4 digit numbers at the end like '-2101', ' 4101', '-141', '-166'
    code_match = re.search(r'[- ]*\b(2\d{3}|3\d{3}|4\d{3}|\d{3})\b\s*$', clean)
    if code_match:
        code = code_match.group(1)
        clean = clean.replace(code_match.group(0), "")
        # Add size index prefix (2 or 4) for 3-digit codes
        if len(code) == 3:
            prefix = "4" if "400" in size else "2"
            code = prefix + code
    else:
        code = ""
        
    # 4. Clean up shade name
    # Remove trailing/leading hyphens/spaces and generic words like "SPRAY PAINT" or "PAINT"
    shade_name = re.sub(r'\b(SPRAY\s+PAINT|SPRAY|PAINT)\b', '', clean, flags=re.IGNORECASE).strip()
    shade_name = re.sub(r'[- ]+$', '', shade_name).strip()
    shade_name = re.sub(r'\s+', ' ', shade_name).upper()
    
    if not shade_name:
        return None
        
    return {
        "shade_name": shade_name,
        "size": size,
        "shade_code": code
    }


def seed_spray_paint():
    print("=" * 60)
    print("  CM Enterprises — Seeding Spray Paint Catalog & Stock")
    print("=" * 60)
    
    if not CSV_PATH.exists():
        print(f"  ❌ CSV file not found at: {CSV_PATH}")
        return
        
    db = SessionLocal()
    try:
        # 1. Fetch Spray Paint category (code "15")
        category = db.query(ProductCategory).filter_by(code="15").first()
        if not category:
            print("  ❌ Spray Paint category (Code: 15) not found in database. Seed categories first!")
            return
            
        print(f"  Found category: {category.name} (Code: {category.code})")
        
        products_created = 0
        stock_created = 0
        skipped = 0
        
        with open(CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            # Skip header lines (first 2 rows)
            next(reader)
            next(reader)
            
            for row in reader:
                if not row or len(row) < 4:
                    continue
                    
                particulars = row[0].strip()
                qty_str = row[1].strip()
                rate_str = row[2].strip()
                
                parsed = parse_tally_name(particulars)
                if not parsed:
                    continue
                
                # Parse rate and stock quantity
                rate = Decimal(rate_str) if rate_str else Decimal("0.00")
                
                # Qty is formatted like '5 PCS' or '-28 PCS'
                qty_match = re.match(r'^(-?\d+)\s*PCS', qty_str, flags=re.IGNORECASE)
                qty = int(qty_match.group(1)) if qty_match else 0
                
                # 2. Check if product already exists
                existing_product = db.query(Product).filter_by(
                    category_id=category.id,
                    shade_name=parsed["shade_name"],
                    size=parsed["size"],
                    shade_code=parsed["shade_code"]
                ).first()
                
                if not existing_product:
                    product = Product(
                        category_id=category.id,
                        product_type=ProductGroup.SHADED,
                        shade_name=parsed["shade_name"],
                        shade_code=parsed["shade_code"],
                        size=parsed["size"],
                        unit="PCS",
                        mrp=rate,
                        reorder_level=10,
                        is_active=1
                    )
                    db.add(product)
                    db.flush() # Populate product.id
                    products_created += 1
                else:
                    product = existing_product
                    skipped += 1
                
                # 3. Upsert inventory stock level
                existing_inventory = db.query(Inventory).filter_by(product_id=product.id).first()
                if not existing_inventory:
                    inventory = Inventory(
                        product_id=product.id,
                        physical_qty=qty,
                        reserved_qty=0,
                        available_qty=qty
                    )
                    db.add(inventory)
                    stock_created += 1
                else:
                    # Update stock if it already exists
                    existing_inventory.physical_qty = qty
                    existing_inventory.available_qty = qty - existing_inventory.reserved_qty
                    
            db.commit()
            print(f"  ✅ Seeding complete!")
            print(f"  Products created: {products_created}")
            print(f"  Products matched: {skipped} (already existed)")
            print(f"  Stock records:    {stock_created} created/updated")
            print("=" * 60)
            
    except Exception as e:
        db.rollback()
        print(f"  ❌ Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_spray_paint()
