# MRS Meat Trading — P&L Web App

A web application for **MRS Meat Trading** that replaces the Excel-based Profit & Loss workflow. Manages income statements, expenses, purchases, sales invoices, receivables, wastages, salaries, and contacts — all with a fully dynamic, database-driven P&L structure.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | Laravel 13 |
| Language | PHP 8.3 |
| Database | MySQL 8 |
| Authentication | Laravel Sanctum |
| Roles & Permissions | Spatie Laravel Permission |
| Audit Log | Spatie Laravel Activitylog |
| Frontend Framework | React 18 |
| SPA Bridge | Inertia.js v2 |
| UI Components | MUI v6 (Material UI) |
| Build Tool | Vite 8 |

---

## Features

- **Dynamic P&L Statement** — categories and line items are database-driven; no hardcoded accounts
- **Inline cell editing** — click any cell on the P&L table to enter or update an amount
- **Formula-driven rows** — Gross Profit, Net Profit, and Wastages are auto-computed; no manual entry needed
- **Wastage tracking** — item-level wastage records (qty × cost price) that feed directly into the P&L
- **Expense Manager** — CRUD with category, date, reference, and notes
- **Purchases** — purchase orders per supplier with dynamic line items
- **Sales Invoices & Receivables** — invoice builder with status tracking (Draft → Sent → Partial → Paid / Overdue)
- **Salary Ledger** — per-employee, per-period salary entries
- **Partner Profit Split** — distributes Net Profit to partners by share percentage on period close
- **Contact Directory** — suppliers and customers in one searchable list
- **Activity Log** — full audit trail via Spatie Activitylog
- **Role-based access** — Admin, Manager, Staff roles with granular permissions

---

## P&L Formula Logic

| Row | Formula |
|---|---|
| Total Sales | Sum of revenue line items |
| Total COS | Sum of COS line items |
| Gross Profit before Wastage | Total Sales − Total COS |
| Wastages | Auto-summed from `wastage_entries` (qty × cost price) |
| **Gross Profit** | **Total Sales − Total COS − Wastages** |
| Total SG&A | Sum of SG&A line items |
| **Net Profit / (Loss)** | **Gross Profit − Total SG&A + Other Income − Other Expenses** |

---

## Requirements

- PHP 8.3+
- Composer
- Node.js 18+ with npm
- MySQL 8

---

## Installation

```bash
# Clone and install dependencies
composer install
npm install

# Copy environment file and configure
cp .env.example .env
php artisan key:generate
```

Update `.env` with your database credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mrs
DB_USERNAME=root
DB_PASSWORD=
APP_URL=http://mrs.test
```

```bash
# Run migrations and seed initial data
php artisan migrate --seed

# Build frontend assets
npm run build
```

---

## Development

```bash
# Start the Laravel dev server
php artisan serve

# Start Vite with HMR
npm run dev
```

---

## Default Login

After seeding, log in with:

| Field | Value |
|---|---|
| Email | admin@mrs.local |
| Password | password |

---

## Database Structure (key tables)

```
pnl_periods       — fiscal periods (name, start_date, end_date, is_closed)
pnl_categories    — P&L sections (type, sort_order, is_calculated, formula)
pnl_line_items    — individual accounts within a category
pnl_entries       — amount per line item per date per period
wastage_entries   — item-level wastage records (qty × cost_price = amount)

expenses          — operating expenses with category and period
purchase_orders   — supplier POs with line items
invoices          — customer invoices with status and payment tracking
payments          — payment records against invoices
salary_entries    — per-employee per-period salary amounts
partners          — profit-sharing partners with share percentages
contacts          — unified supplier/customer directory
```

---

## Roles & Permissions

| Role | Permissions |
|---|---|
| Admin | Full access to all modules and settings |
| Manager | View/manage P&L, expenses, invoices, purchases, contacts, salaries |
| Staff | View P&L and contacts; manage expenses and invoices |

---

## Currency & Date Conventions

- Currency: **PHP Peso (₱)** — stored as `DECIMAL(15,4)`, displayed with 2 decimal places
- Dates: stored as `DATE` in MySQL, displayed as `Mon DD, YYYY` in the UI
