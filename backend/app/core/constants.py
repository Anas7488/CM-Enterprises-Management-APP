from enum import Enum

# Area codes
LOCAL_AREAS = ["06", "07", "08", "09", "10"]
OUTSTATION_AREAS = ["01", "02", "03", "04", "05"]
ALL_AREAS = OUTSTATION_AREAS + LOCAL_AREAS

# Product categories
class ProductCategory(str, Enum):
    DISTEMPER = "distemper"
    EMULSION = "emulsion"
    PRIMER = "primer"
    PUTTY = "putty"
    HARDWARE = "hardware"
    ACCESSORIES = "accessories"

# Payment types
class PaymentType(str, Enum):
    CASH = "cash"
    UPI = "upi"
    CHEQUE = "cheque"
    BANK_TRANSFER = "bank_transfer"

# Pricing tiers
class PricingTier(str, Enum):
    DEALER = "dealer"
    RETAIL = "retail"
    CONTRACTOR = "contractor"
    SPECIAL = "special"