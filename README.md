# CM Enterprises — Phase 1 Build Guide

> **Stack:** FastAPI + PostgreSQL + Next.js (TypeScript) + Flutter (scaffold only)
> **Goal:** Working backend API + Admin web dashboard for core business operations

---

## Current Status

```
✅ Project structure created
✅ Next.js web app scaffolded and running
✅ Flutter mobile scaffold created
⬜ Backend core files
⬜ Database connected
⬜ Auth working
⬜ All modules built
⬜ Web UI connected to API
```

---

## Prerequisites

Make sure these are installed before starting:

```bash
# Check Python
python3 --version          # needs 3.10+

# Check Node
node --version             # needs 18+

# Check PostgreSQL
psql --version             # needs 14+

# Check pip
pip --version
```

Install PostgreSQL on Mac if not installed:
```bash
brew install postgresql@16
brew services start postgresql@16
```

---

## Phase 1 — Step by Step

---

### STEP 1 — Setup Python Virtual Environment

```bash
cd cme_app/backend
python3 -m venv venv
source venv/bin/activate
```

Your terminal should now show `(venv)` at the start.

---

### STEP 2 — Install Backend Dependencies

```bash
pip install fastapi
pip install "uvicorn[standard]"
pip install sqlalchemy
pip install alembic
pip install psycopg2-binary
pip install "python-jose[cryptography]"
pip install passlib
pip install "python-multipart"
pip install python-dotenv
pip install pydantic-settings
pip install httpx
```

Save to requirements.txt:
```bash
pip freeze > requirements.txt
```

---

### STEP 3 — Create PostgreSQL Database

```bash
# Open PostgreSQL shell
psql postgres

# Inside psql, run:
CREATE DATABASE cme_db;
CREATE USER cme_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE cme_db TO cme_user;
\q
```

---

### STEP 4 — Configure Environment Variables

Fill in `backend/.env`:

```bash
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://cme_user:yourpassword@localhost:5432/cme_db

# JWT
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# App
APP_NAME=CM Enterprises
APP_VERSION=1.0.0
DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000
EOF
```

---

### STEP 5 — Write Backend Core Files

Write these files in order (each depends on the previous):

```
backend/app/core/config.py          ← reads .env
backend/app/core/database.py        ← connects to PostgreSQL
backend/app/core/security.py        ← JWT + password hashing
backend/app/core/constants.py       ← area codes, roles
backend/app/core/dependencies.py    ← get_db, get_current_user
backend/app/shared/enums/roles.py   ← UserRole enum
backend/app/shared/exceptions/http_errors.py
backend/app/main.py                 ← FastAPI app boot
```

---

### STEP 6 — Write Database Models (Tables)

Write models in this exact order (foreign key dependencies):

```
backend/app/modules/users/model.py          ← first table, no dependencies
backend/app/modules/areas/model.py          ← depends on nothing
backend/app/modules/customers/model.py      ← depends on areas, users
backend/app/modules/products/model.py       ← depends on nothing
backend/app/modules/pricing/model.py        ← depends on products
backend/app/modules/inventory/model.py      ← depends on products
backend/app/modules/stock_movements/model.py ← depends on products, users
backend/app/modules/orders/model.py         ← depends on customers, products
backend/app/modules/orders/enums.py         ← order status enum
backend/app/modules/payments/model.py       ← depends on customers, orders
backend/app/modules/ledgers/model.py        ← depends on customers, payments
```

---

### STEP 7 — Setup Alembic Migrations

```bash
# Make sure you are in backend/ with venv active
cd cme_app/backend
source venv/bin/activate

# Initialize alembic (only first time)
alembic init migrations

# Edit migrations/env.py to point to your models
# (we will write this file together)

# Create first migration
alembic revision --autogenerate -m "initial tables"

# Apply migration to database (creates all tables)
alembic upgrade head
```

Verify tables were created:
```bash
psql cme_db -c "\dt"
```

---

### STEP 8 — Write Auth Module

```
backend/app/modules/auth/schema.py      ← LoginRequest, TokenResponse
backend/app/modules/auth/service.py     ← verify password, create token
backend/app/modules/auth/router.py      ← POST /auth/login, POST /auth/refresh
```

---

### STEP 9 — Write Remaining Module Files

For each module write in this order:
`schema.py` → `service.py` → `router.py`

```
modules/users/
modules/areas/
modules/customers/
modules/products/
modules/pricing/
modules/inventory/
modules/stock_movements/
modules/orders/
modules/payments/
modules/ledgers/
```

---

### STEP 10 — Register All Routers in main.py

```python
# backend/app/main.py
# Mount all routers here after writing them
```

---

### STEP 11 — Test Backend is Running

```bash
cd cme_app/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Open in browser:
```
http://localhost:8000          ← should return {"message": "CM Enterprises API"}
http://localhost:8000/docs     ← Swagger UI with all endpoints
http://localhost:8000/redoc    ← ReDoc UI
```

---

### STEP 12 — Connect Web Frontend to API

Edit `web/src/lib/api.ts`:
```
Base URL = http://localhost:8000
Add Authorization header with JWT token
```

Edit `web/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### STEP 13 — Build Web Pages

Build in this order:

```
src/app/(auth)/login/page.tsx        ← login form, calls POST /auth/login
src/app/dashboard/page.tsx           ← summary cards
src/app/customers/page.tsx           ← customer list + add customer
src/app/products/page.tsx            ← product list + add product
src/app/pricing/page.tsx             ← pricing tiers per product
src/app/inventory/page.tsx           ← stock levels, low stock alerts
src/app/orders/page.tsx              ← order list + create order
src/app/payments/page.tsx            ← payment recording
src/app/settings/page.tsx            ← users, areas, roles
```

---

### STEP 14 — Test Full Flow End to End

```
1. Login with admin account
2. Create an area (e.g. Area 06 - Local)
3. Create a customer and assign area
4. Create a product (e.g. Artist Gold Emulsion 20L)
5. Set pricing for product (dealer/retail/contractor)
6. Add stock via inventory
7. Create an order for the customer
8. Record a payment
9. Check ledger shows correct outstanding
```

---

## Running Both Servers Together

Open two terminal tabs:

**Terminal 1 — Backend**
```bash
cd cme_app/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```bash
cd cme_app/web
npm run dev
```

```
Backend API  →  http://localhost:8000
Backend Docs →  http://localhost:8000/docs
Web App      →  http://localhost:3000
```

---

## Phase 1 Modules Summary

| Module | Tables | API Endpoints |
|---|---|---|
| users | users | GET/POST/PUT /users |
| auth | — | POST /auth/login, /auth/refresh |
| areas | areas | GET/POST /areas |
| customers | customers | GET/POST/PUT /customers |
| products | products | GET/POST/PUT /products |
| pricing | pricing | GET/POST/PUT /pricing |
| inventory | inventory | GET/POST /inventory |
| stock_movements | stock_movements | GET/POST /stock-movements |
| orders | orders, order_items | GET/POST/PUT /orders |
| payments | payments | GET/POST /payments |
| ledgers | ledgers | GET /ledgers/{customer_id} |

---

## Phase 2 (Later — Do Not Build Now)

```
⬜ cheques/           ← cheque tracking
⬜ suppliers/         ← supplier management
⬜ purchases/         ← purchase orders
⬜ deliveries/        ← delivery assignment + proof
⬜ notifications/     ← WhatsApp, low stock alerts
⬜ audit_logs/        ← who changed what
⬜ reports/           ← sales, collection, inventory reports
⬜ mobile/            ← Flutter app for sales + delivery exec
```

---

## Quick Reference Commands

```bash
# Activate backend venv
cd cme_app/backend && source venv/bin/activate

# Run backend
uvicorn app.main:app --reload --port 8000

# Run frontend
cd cme_app/web && npm run dev

# New migration after model change
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# Check current migration
alembic current

# View full directory tree
tree -I 'node_modules|.next|venv|__pycache__|.git'
```

---

> Start with Step 5 — write `config.py` first.
> Every other file depends on it.