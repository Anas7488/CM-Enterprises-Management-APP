#!/usr/bin/env python3
"""
Seed script: Load Artist Product.csv into the database as product catalog entries.

This CSV only contains product names (no quantities/rates), so it creates
product records only. Inventory stock can be seeded later.

Usage:
    cd backend
    python -m scripts.seed_artist_products
"""

import csv
import sys
import os
import re
from pathlib import Path

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.core.database import SessionLocal
from app.modules.products.model import Product, ProductCategory, ProductGroup

CSV_PATH = Path(__file__).resolve().parents[3] / "Examples" / "Artist Product.csv"

# ─── Tally Code → Application Category Code Mapping ────────────────────────
# Tally codes from the CSV are NOT the same as our app category codes.
# This table converts them.

TALLY_TO_APP = {
    "08": "01",   # Premium (PRM GOLD, PRM COLOURS)
    "09": "01",   # Premium (PRM ALUMINIUM)
    "10": "01",   # Premium (PM G BRONZE, PRM COPPER)
    "12": "01",   # Premium (PRM G.GREEN, G.RED)
    "01": "02",   # Metallic (GOLD PAINT)
    "02": "02",   # Metallic (SILVER)
    "03": "02",   # Metallic (BRONZE, COPPER, MAROON)
    "06": "03",   # Amber (AMBER GOLD)
    "07": "03",   # Amber (AMBER SILVER, BRONZE, COPPER)
    "04": "04",   # Elite (NC GOLD)
    "05": "04",   # Elite (NC SILVER, NC COPPER)
    "13": "05",   # Enamel (ENAMEL GOLD)
    "14": "05",   # Enamel (ENAMEL SILVER)
    "15": "05",   # Enamel (ENAMEL COPPER)
    "16": "06",   # Art Aluminium Single Pack
    "21": "07",   # Teak Wood - Rose Wood (WOOD VARNISH ROSE WOOD)
    "22": "07",   # Teak Wood - Rose Wood (WOOD VARNISH TEAK WOOD)
    "1K": "08",   # 1K PU
    "28": "09",   # Fluorescent Water Base
    "31": "12",   # Night Glow (RADIUM)
    "23": "14",   # Aqua Guard
    "24": "38",   # C2 Multi Clean (Acid Base)
    "25": "39",   # C2 Multi Clean (Organic Base)
    "26": "40",   # C2 Chrome Clean
    "27": "41",   # C2 Klog
}

# Special cases for Tally code 17 (has both Enamel and Fluorescent)
# "17 ART ENAMEL BRONZE" → Enamel (05)
# "17 ART ENAMEL Fluorescent" → Fluorescent Oil Base (10)


def extract_size(name: str) -> str:
    """Extract size from product name like '100 ML', '1 LTR', '20LTR', '500ML', '1KG', etc."""
    # Remove trailing dots
    clean = name.rstrip(".")

    # Match patterns like: 100 ML, 1 LTR, 20LTR, 500ML, 4 LTRS, 1 KG, 250 GRMS, 40 GRAMS, 25 ML
    m = re.search(
        r'(\d+)\s*(ML|LTR[S]?|L\b|KG|GRMS?|GRAMS?)',
        clean,
        flags=re.IGNORECASE
    )
    if not m:
        return ""

    qty = m.group(1)
    unit_raw = m.group(2).upper().rstrip("S")

    # Normalize unit
    unit_map = {
        "ML": "ml",
        "LTR": "L",
        "KG": "kg",
        "GRM": "gm",
        "GRAM": "gm",
    }
    unit = unit_map.get(unit_raw, unit_raw.lower())

    # Normalize quantity display
    if unit == "L" and qty == "1":
        return "1L"
    elif unit == "L":
        return f"{qty}L"

    return f"{qty}{unit}"


def parse_line(line: str):
    """Parse a single CSV line into (tally_code, shade_name, size, app_category_code)."""
    line = line.strip()
    if not line:
        return None

    # ── Handle uncoded products (no leading number) ─────────────────
    # 3D products → category 11
    if line.startswith("3D "):
        shade = re.sub(r'\d+\s*(ML|LTR|KG|GRMS?|GRAMS?)\.?\s*$', '', line[3:], flags=re.IGNORECASE).strip()
        size = extract_size(line)
        return ("_3D", shade, size, "11")

    # Artist Elite → category 04
    if line.startswith("Artist Elite "):
        rest = line[len("Artist Elite "):]
        shade = re.sub(r'\d+\s*(ML|LTR|KG|GRMS?|GRAMS?)\.?\s*$', '', rest, flags=re.IGNORECASE).strip()
        size = extract_size(line)
        return ("_ELITE", shade, size, "04")

    # GLITTER → category 11
    if line.startswith("GLITTER "):
        shade = re.sub(r'\d+\s*(ML|LTR|KG|GRMS?|GRAMS?)\.?\s*$', '', line[len("GLITTER "):], flags=re.IGNORECASE).strip()
        shade = "GLITTER " + shade
        size = extract_size(line)
        return ("_GLITTER", shade, size, "11")

    # P M PEARL → category 13
    if line.startswith("P M PEARL"):
        size = extract_size(line)
        return ("_PEARL", "PEARL", size, "13")

    # POWDER products → category 13
    if re.match(r'^(GOLD|SILVER|COPPER)\s+POWDER', line, flags=re.IGNORECASE):
        shade = line.split("POWDER")[0].strip() + " POWDER"
        size = extract_size(line)
        return ("_POWDER", shade, size, "13")

    # ── Handle coded products ──────────────────────────────────────
    # Extract leading code: "01", "001", "1K", "02", etc.
    code_match = re.match(r'^(001|1K|\d{2})\s+', line)
    if not code_match:
        return None

    tally_code = code_match.group(1)
    rest = line[code_match.end():].strip()

    # Skip 001 (MC COLOURS → already covered in Metallic)
    if tally_code == "001":
        return None

    # Remove common prefixes: ART, ARTIST, ARTGOLD → ART GOLD
    rest = re.sub(r'^(ARTIST|ARTGOLD|ART)\s*', '', rest, flags=re.IGNORECASE).strip()

    # Extract size
    size = extract_size(rest)

    # Remove size from the shade name
    shade = re.sub(r'\d+\s*(ML|LTR[S]?|KG|GRMS?|GRAMS?)\.?\s*$', '', rest, flags=re.IGNORECASE).strip()
    # Remove trailing hyphens, dots, and spaces
    shade = re.sub(r'[\s\-\.]+$', '', shade).strip()

    # ── Special handling for Tally code 17 ─────────────────────────
    if tally_code == "17":
        if "fluorescent" in shade.lower():
            return (tally_code, shade, size, "10")  # Oil Base Fluorescent
        else:
            return (tally_code, shade, size, "05")  # Enamel

    # Standard lookup
    app_code = TALLY_TO_APP.get(tally_code)
    if not app_code:
        return None

    return (tally_code, shade, size, app_code)


def seed_artist_products():
    print("=" * 60)
    print("  CM Enterprises — Seeding Artist Product Catalog")
    print("=" * 60)

    if not CSV_PATH.exists():
        print(f"  ❌ CSV file not found at: {CSV_PATH}")
        return

    db = SessionLocal()
    try:
        # Build category code → id lookup
        all_categories = db.query(ProductCategory).all()
        cat_map = {c.code: c for c in all_categories}

        products_created = 0
        skipped = 0
        errors = []

        with open(CSV_PATH, "r", encoding="utf-8") as f:
            for line_num, raw_line in enumerate(f, start=1):
                raw_line = raw_line.strip().rstrip(",")
                if not raw_line:
                    continue

                parsed = parse_line(raw_line)
                if not parsed:
                    continue

                tally_code, shade_name, size, app_code = parsed
                shade_name = shade_name.upper().strip()

                category = cat_map.get(app_code)
                if not category:
                    errors.append(f"  ⚠️  Line {line_num}: App category '{app_code}' not found — skipping '{raw_line}'")
                    continue

                if not size:
                    errors.append(f"  ⚠️  Line {line_num}: Could not extract size — skipping '{raw_line}'")
                    continue

                # Check if product already exists
                existing = db.query(Product).filter_by(
                    category_id=category.id,
                    shade_name=shade_name,
                    size=size
                ).first()

                if existing:
                    skipped += 1
                    continue

                product = Product(
                    category_id=category.id,
                    product_type=ProductGroup.SHADED,
                    shade_name=shade_name,
                    shade_code="",
                    size=size,
                    unit="PCS",
                    mrp=0,  # No rate in this CSV — update later
                    reorder_level=10,
                    is_active=1,
                )
                db.add(product)
                products_created += 1

        db.commit()

        print(f"  ✅ Seeding complete!")
        print(f"  Products created:  {products_created}")
        print(f"  Products skipped:  {skipped} (already existed)")
        if errors:
            print(f"  Warnings:          {len(errors)}")
            for e in errors:
                print(e)
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"  ❌ Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_artist_products()
