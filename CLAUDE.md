# MRS Meat Trading — P&L Web App

## Project Overview

Web application for **MRS Meat Trading** to manage Profit & Loss statements, expenses, purchases, sales invoices, receivables, and contacts — replacing the current Excel workflow. The income statement structure is fully dynamic: categories and line items are database-driven, not hardcoded.

Source of truth for initial data model: `PROFIT N LOSS.xlsx` (four sheets: PNL, Expenses, Receivables, Contact Names).

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | Laravel 13 |
| Language | PHP 8.3 |
| Database | MySQL 8 |
| Auth | Laravel Sanctum (API tokens + session) |
| Roles & Permissions | Spatie Laravel Permission |
| Audit Log | Spatie Laravel Activitylog |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 |
| Routing / SSR bridge | Inertia.js v2 |
| UI Components | MUI v6 (Material UI) |
| Build tool | Vite 8 |

---

## Architecture

- **Inertia.js** connects Laravel controllers directly to React pages — no separate API layer needed for page renders.
- **Sanctum** secures any standalone API endpoints (mobile, external integrations).
- **Spatie Permission** guards routes and policies (`view pnl`, `manage expenses`, `manage invoices`, `manage contacts`, `admin`).
- **Activitylog** tracks every create/update/delete across all models for audit trails.

---

## Data Model

### Dynamic P&L Structure

The income statement is fully configurable — no category or line item is hardcoded.

```
pnl_periods
  id, name (e.g. "July 2026"), start_date, end_date, is_closed, notes, timestamps

pnl_categories
  id, name, type (ENUM: revenue|cos|gross_profit|sga|other_income|other_expense|net_profit),
  sort_order, is_calculated (bool — computed rows like Gross Profit/Net Profit),
  formula (nullable — e.g. "revenue - cos - sga"), timestamps

pnl_line_items
  id, pnl_category_id, name, sort_order, is_active, timestamps

pnl_entries
  id, pnl_period_id, pnl_line_item_id, entry_date, amount, notes, timestamps
  UNIQUE(pnl_period_id, pnl_line_item_id, entry_date)
```

### Expenses

```
expense_categories
  id, name, sort_order, timestamps

expenses
  id, expense_category_id, period_id (nullable), description, amount, expense_date,
  reference_no, paid_by, notes, timestamps
```

### Purchases

```
suppliers        — id, name, phone, contact_person, notes, timestamps
purchase_orders  — id, supplier_id, period_id, po_date, total_amount, notes, timestamps
purchase_items   — id, purchase_order_id, item_name, unit, qty, unit_price, amount, timestamps
```

### Sales & Receivables

```
customers        — id, name, phone, contact_person, type (ENUM: hotel|restaurant|distributor|other), notes, timestamps
invoices         — id, invoice_no (unique), customer_id, period_id, invoice_date, due_date,
                   status (ENUM: draft|sent|partial|paid|overdue), total_amount, paid_amount, notes, timestamps
invoice_items    — id, invoice_id, item_name, unit, qty, unit_price, amount, timestamps
payments         — id, invoice_id, payment_date, amount, method, reference_no, notes, timestamps
```

### Salaries

```
employees        — id, name, role, is_active, timestamps
salary_entries   — id, employee_id, period_id, amount, payment_date, notes, timestamps
```

### Partners (profit split)

```
partners         — id, name, share_percentage, is_active, timestamps
partner_shares   — id, partner_id, period_id, net_profit, share_amount, timestamps
  (computed from pnl_entries after period close)
```

### Contacts (catch-all for Contact Names sheet)

```
contacts
  id, name, type (ENUM: supplier|customer|both), phone, secondary_phone,
  address, notes, timestamps
```

### Auth

```
users — standard Laravel + Sanctum columns + role via Spatie
```

---

## Key Seeder Data (from Excel)

### P&L Categories (in order)

| Type | Category Name |
|---|---|
| revenue | Trading Products - Sales |
| cos | Trading Product Cost |
| cos | Sales Return |
| cos | COS Truck Maint, Fuel & Insurance |
| cos | Truck Rental |
| cos | Truck Diesel/Cash Card/Parking |
| cos | Trucks Maintenance/Motor |
| cos | Delivery Truck Insurance |
| cos | Packing Material & Store Supply |
| cos | Wages on Call Helpers and Repacker |
| cos | Cold Room Electricity |
| cos | Airfreight Charges |
| cos | Delivery/Bank Charges |
| gross_profit | TOTAL COS *(calculated)* |
| gross_profit | Gross Profit before Wastage *(calculated)* |
| gross_profit | Wastages |
| gross_profit | Gross Profit *(calculated)* |
| sga | Legal Fees |
| sga | Audit Fee |
| sga | Other Professional Fee |
| sga | Taxes & Licenses |
| sga | Bank Charges/Others |
| sga | Meals |
| sga | Toll Fee |
| sga | Office Supplies |
| sga | Resiko |
| sga | Rent |
| sga | Representation |
| sga | Telephone, Internet |
| sga | Electricity & Water |
| sga | Office Maintenance |
| sga | Office Equipment |
| sga | Staff Amenities/Last Pay |
| sga | Transportation Expense |
| sga | Bad Debts |
| sga | Salaries and Wages |
| sga | Employer Contribution/Separation Fee |
| sga | Commission Payment |
| sga | 13th Month Pay |
| other_income | Interest Income |
| other_income | Forex Exchange Gain (Loss) |
| other_income | Other Income |
| other_expense | Interest Expense |
| other_expense | Other Expenses |
| net_profit | Net Profit / (Loss) *(calculated)* |

### Partners (initial)

| Name | Share % |
|---|---|
| JA | 40% |
| Mam Maila | 0% *(TBD)* |
| Mam Beng | 60% |

### Known Contacts

**Suppliers:** Davao 666 Trading, Sheng Kun Enterprises, Tap One

**Customers:** BMC Corp, Blue Lutos, Dusit (contact: Ms. Issa)

---

## Features

### 1. Dashboard
- Current period summary: Sales, Gross Profit, Net Profit, AR balance
- Sparklines per metric (Reverb live)
- Receivables aging (current / 30 / 60 / 90+ days)
- Quick-add buttons (expense, invoice, purchase)

### 2. P&L Statement
- Period selector; multi-period comparison view
- Inline cell editing — click a cell to enter/update an amount
- Totals and calculated rows auto-compute on save
- Export to Excel (matching original layout) and PDF
- Real-time broadcast on any entry change

### 3. Expense Manager
- CRUD with category, date, amount, reference, notes
- Bulk import (CSV)
- Filter by category, date range, period

### 4. Purchases
- Purchase order per supplier with dynamic line items (add/remove rows)
- Totals auto-compute
- Link to P&L entry (Trading Product Cost line)

### 5. Sales Invoices & Receivables
- Invoice builder: customer, date, dynamic line items (item, unit, qty, price)
- Status tracking: Draft → Sent → Partial → Paid / Overdue
- Payment recording with method and reference
- Aging report

### 6. Salary Ledger
- Per-employee, per-period entries
- Rolls up to "Salaries and Wages" P&L line automatically

### 7. Partner Profit Split
- Runs on period close
- Applies each partner's share % to Net Profit
- Shows per-partner P&L attribution

### 8. Contact Directory
- Suppliers and customers in one list (type filter)
- Linked to purchases and invoices

### 9. Settings (Admin)
- Manage P&L categories and line items (add, reorder, toggle active, mark as calculated)
- Manage partners and share percentages
- Manage expense categories
- Manage roles and users

### 10. Activity Log
- Full audit trail via Spatie Activitylog
- Filter by user, model, date

---

## API Routes (Sanctum-protected)

All standard resource routes under `/api/v1/`:
- `periods`, `pnl-entries`, `expenses`, `invoices`, `invoice-items`, `payments`
- `purchases`, `purchase-items`, `contacts`, `employees`, `salary-entries`, `partners`

---

## Inertia Page Structure

```
resources/js/
  Pages/
    Dashboard/         Index.jsx
    PNL/               Index.jsx, Show.jsx
    Expenses/          Index.jsx, Create.jsx, Edit.jsx
    Purchases/         Index.jsx, Create.jsx, Edit.jsx
    Invoices/          Index.jsx, Create.jsx, Edit.jsx, Show.jsx
    Receivables/       Index.jsx
    Salaries/          Index.jsx
    Contacts/          Index.jsx, Create.jsx, Edit.jsx
    Settings/
      Categories/      Index.jsx
      Partners/        Index.jsx
      Users/           Index.jsx
      Roles/           Index.jsx
    ActivityLog/       Index.jsx
  Components/
    PNL/               PnlTable.jsx, PnlCell.jsx, PeriodSelector.jsx
    Invoices/          InvoiceLineItems.jsx, PaymentDialog.jsx
    Purchases/         PurchaseLineItems.jsx
    Shared/            DataTable.jsx, PageHeader.jsx, ConfirmDialog.jsx,
                       StatusChip.jsx, CurrencyCell.jsx, DateRangePicker.jsx
  Layouts/
    AppLayout.jsx      (MUI Drawer + AppBar, Inertia Link nav)
  hooks/
    useCurrency.js     (PHP peso formatting)
```

---

## Conventions

- Currency: **PHP Peso (₱)** — store as `DECIMAL(15,4)` in DB, display with 2 decimal places.
- Dates: store as `DATE` in MySQL, display as `MM/DD/YYYY` in UI (matching the Excel).
- Soft deletes on: invoices, purchase orders, expenses, contacts, employees.
- All models fire Activitylog on created/updated/deleted.
- Form validation: Laravel FormRequest classes; frontend uses MUI TextField with `helperText` for errors passed from Inertia.
- Permissions checked in both Laravel policies (backend) and Inertia shared props `auth.permissions` (frontend — hide/show UI elements).
- No hardcoded P&L line items in code — always query `pnl_line_items` joined to `pnl_categories`.

---

## Development Commands

```bash
# Install
composer install && npm install

# Dev
php artisan serve
npm run dev

# Database
php artisan migrate --seed

# Tests
php artisan test
```

---

## Environment Variables (key additions)

```env
APP_URL=http://localhost
FRONTEND_URL=http://localhost:5173
```
