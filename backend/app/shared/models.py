# Import all models in correct order to ensure SQLAlchemy mappers are fully initialized
from app.modules.areas.model import Route, Area
from app.modules.users.model import User
from app.modules.products.model import ProductCategory, Product
from app.modules.inventory.model import Inventory
from app.modules.customers.model import Customer
from app.modules.orders.model import Order, OrderItem
from app.modules.invoices.model import Invoice, InvoiceItem
from app.modules.payments.model import Payment
from app.modules.credit_notes.model import CreditNote, CreditNoteItem
from app.modules.vendors.model import Vendor
from app.modules.debit_notes.model import DebitNote, DebitNoteItem
