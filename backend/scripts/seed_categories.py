"""
Seed script — inserts all 41 product categories from CM Enterprises'
real catalog into the product_categories table.

Run once after migrations are applied:
    python3 -m scripts.seed_categories

Safe to re-run — uses upsert logic, won't create duplicates.
"""

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.modules.products.model import ProductCategory, ProductGroup


# ── HSN codes & GST rates are placeholders ──
# Replace hsn_code values with your actual category-wise HSN codes.
# gst_rate defaults to 18.00 except powders (30) which is 5.00 per
# your CGST 2.5% + SGST 2.5% confirmation.

CATEGORIES = [
    # code, name,                                              group,     hsn_code,    gst_rate, size_range
    ("01", "Premium",                                          "shaded",  "32081010",  18.00, "25ml - 20L"),
    ("02", "Metallic",                                         "shaded",  "32081010",  18.00, "25ml - 20L"),
    ("03", "Amber",                                            "shaded",  "32081010",  18.00, "25ml - 20L"),
    ("04", "Elite",                                            "shaded",  "32081010",  18.00, "50ml - 20L"),
    ("05", "Enamel",                                           "shaded",  "32081010",  18.00, "50ml - 1L"),
    ("06", "Art Aluminium Single Pack",                        "shaded",  "32081010",  18.00, "100ml - 1L"),
    ("07", "Teak Wood - Rose Wood",                            "shaded",  "32081010",  18.00, "100ml - 1L"),
    ("08", "1K PU",                                            "shaded",  "32081010",  18.00, "200ml - 1L"),
    ("09", "Fluorescent (Water Base)",                         "shaded",  "32081010",  18.00, "50ml - 1L"),
    ("10", "Fluorescent (Oil Base)",                           "shaded",  "32081010",  18.00, "50ml - 1L"),
    ("11", "3D Glitter",                                       "shaded",  "32081010",  18.00, "25gm - 1kg"),
    ("12", "Night Glow",                                       "shaded",  "32081010",  18.00, "25ml - 1L"),
    ("13", "Pearl Powder",                                     "shaded",  "32081010",  18.00, "50gm - 1kg"),
    ("14", "Aqua Guard",                                       "shaded",  "32081010",  18.00, "50ml - 1L"),
    ("15", "Spray Paint",                                      "shaded",  "32089090",  18.00, "250ml and 400ml"),
    ("16", "Paint Remover",                                    "variant", "38140010",  18.00, "500ml and 1L"),
    ("17", "Brushes (F1-Flat, R1-Round, SF-Short Handle)",     "variant", "96033090",  18.00, "0mm to 100mm"),
    ("18", "Trowels (ST-Sanding Trowel, TW-Trowel)",           "variant", "82054000",  18.00, None),
    ("19", "Stencils",                                         "variant", "39269099",  18.00, "16x24, 12x12"),
    ("20", "Roller Set 2\" (Epoxy, Sponge, Refill, Handle)",   "variant", "96039090",  18.00, "2 inch"),
    ("21", "Roller Set 4\" (Refill, Set Roller, Handle)",      "variant", "96039090",  18.00, "4 inch"),
    ("22", "Roller Set 6\" (Refill, Set Roller, Handle)",      "variant", "96039090",  18.00, "6 inch"),
    ("23", "MIDI Roller 6\" (Int/Ext Roller, Int/Ext Refill)", "variant", "96039090",  18.00, "6 inch"),
    ("24", "Roller Handles 9\" (Push/Nut variants)",           "variant", "96039090",  18.00, "9 inch"),
    ("25", "Venus",                                            "variant", "39191000",  18.00, "3M,5M,15M,30M"),
    ("26", "Disc Paper",                                       "variant", "68053090",  18.00, "36,60,80,100"),
    ("27", "Leak Stop",                                        "shaded",  "32141000",  18.00, "250ml,500ml,1L,5L,10L"),
    ("28", "Cem Bond",                                         "variant", "32141000",  18.00, "250gm-10Kg"),
    ("29", "Stainers",                                         "shaded",  "32081010",  18.00, "25ml-500ml"),
    ("30", "GS Powder, WC Powder",                             "variant", "25232990",  18.00,  "100gm-10Kg"),
    ("31", "Distemper",                                        "shaded",  "32091010",  18.00, "25ml-20L"),
    ("32", "Dual Primer",                                      "shaded",  "32091010",  18.00, "50ml-20L"),
    ("33", "Ext Primer",                                       "shaded",  "32091010",  18.00, "50ml-20L"),
    ("34", "Int Emulsion",                                     "shaded",  "32091010",  18.00, "100ml-20L"),
    ("35", "Ext Emulsion",                                     "shaded",  "32091010",  18.00, "100ml-20L"),
    ("36", "Metal/Wood/Znk Yellow Primer",                     "shaded",  "32091010",  18.00, "50ml-5L"),
    ("37", "Enamel",                                           "shaded",  "32081010",  18.00, "25ml-5L"),
    ("38", "C2 Multi Clean (Acid Base)",                       "variant", "34022090",  18.00, "50ml-2L"),
    ("39", "C2 Multi Clean (Organic Base)",                    "variant", "34022090",  18.00, "50ml-2L"),
    ("40", "C2 Chrome Clean",                                  "variant", "34022090",  18.00, "175ml"),
    ("41", "C2 Klog",                                          "variant", "34022090",  18.00, "100gm"),
]


def seed_categories():
    db = SessionLocal()
    created = 0
    updated = 0
    skipped = 0

    try:
        for code, name, group, hsn_code, gst_rate, size_range in CATEGORIES:
            existing = db.query(ProductCategory).filter_by(code=code).first()

            if existing:
                changed = (
                    existing.name != name
                    or existing.group != ProductGroup(group)
                    or existing.hsn_code != hsn_code
                    or float(existing.gst_rate) != gst_rate
                )
                if changed:
                    existing.name = name
                    existing.group = ProductGroup(group)
                    existing.hsn_code = hsn_code
                    existing.gst_rate = gst_rate
                    existing.size_range = size_range
                    updated += 1
                else:
                    skipped += 1
                continue

            category = ProductCategory(
                code=code,
                name=name,
                group=ProductGroup(group),
                hsn_code=hsn_code,
                gst_rate=gst_rate,
                size_range=size_range,
            )
            db.add(category)
            created += 1

        db.commit()
        print(f"\n  Category seed complete!")
        print(f"  Created : {created}")
        print(f"  Updated : {updated}")
        print(f"  Skipped : {skipped} (no changes)")
        print(f"  Total   : {len(CATEGORIES)} categories in source list\n")

    except Exception as e:
        db.rollback()
        print(f"\n  ❌ Seed failed: {e}\n")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_categories()
