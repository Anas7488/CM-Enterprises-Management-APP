from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
import app.shared.models

from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.customers.router import router as customers_router
from app.modules.inventory.router import router as inventory_router
from app.modules.products.router import router as products_router
from app.modules.payments.router import router as payments_router
from app.modules.orders.router import router as orders_router
from app.modules.invoices.router import router as invoices_router
from app.modules.credit_notes.router import router as credit_notes_router
from app.modules.vendors.router import router as vendors_router
from app.modules.debit_notes.router import router as debit_notes_router

from app.modules.areas.router import router as areas_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(areas_router, prefix="/areas", tags=["Areas & Routes"])
app.include_router(customers_router, prefix="/customers", tags=["Customers"])
app.include_router(vendors_router, prefix="/vendors", tags=["Vendors"])
app.include_router(inventory_router, prefix="/inventory", tags=["Inventory"])
app.include_router(products_router, prefix="/products", tags=["Products"])
app.include_router(payments_router, prefix="/payments", tags=["Collections"])
app.include_router(orders_router, prefix="/orders", tags=["Orders"])
app.include_router(invoices_router, prefix="/invoices", tags=["Invoices"])
app.include_router(credit_notes_router, prefix="/credit-notes", tags=["Credit Notes"])
app.include_router(debit_notes_router, prefix="/debit-notes", tags=["Debit Notes"])


@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} API", "version": settings.APP_VERSION}


@app.get("/health")
def health():
    return {"status": "ok"}