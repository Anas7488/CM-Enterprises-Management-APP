from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    SALES_EXECUTIVE = "sales_executive"
    DELIVERY_EXECUTIVE = "delivery_executive"
    ACCOUNTANT = "accountant"