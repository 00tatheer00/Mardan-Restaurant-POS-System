# Kabab House POS & Management System — Project Spec

> Build in the phases listed at the end. Ask before deviating from the stack or schema.

---

## 0. Working Rules for Claude Code (TOKEN BUDGET IS LIMITED — FOLLOW STRICTLY)

Goal: **production-quality code with minimum tokens.**

1. **No chatter.** Don't explain what you're about to do or summarize what you did. After each phase reply in max 5 lines: files changed + how to test.
2. **Don't re-read files** you just wrote or already read. Don't read `node_modules`, lockfiles, or generated files.
3. **Write each file once, correctly.** Plan in your head, then write the complete file. Prefer `Edit` for small changes, never rewrite a whole file to change a few lines.
4. **Use generators/CLIs instead of hand-writing:** `create-next-app`, `npx shadcn@latest add ...`, `supabase gen types`. Don't hand-write shadcn components.
5. **Reuse, don't repeat:** one generic `DataTable`, one `FormDialog`, one `StatCard`, one `PageHeader`, one Dexie+sync helper used by all modules. CRUD pages (raw items, suppliers, categories, expense categories, staff) must share one generic pattern.
6. **No over-engineering:** no tests unless asked, no Storybook, no i18n, no extra libraries beyond the stack, no long comments or JSDoc. Short, clear code.
7. **Don't run `npm run dev`/long servers or repeated builds.** Run `npx tsc --noEmit` once at the end of each phase; fix only real errors.
8. **Batch work:** finish a whole phase in one go; don't stop to ask small questions — pick the sensible default and note it in one line.
9. **One phase per session.** The user will `/clear` between phases, so keep a short `PROGRESS.md` (max 15 lines: phases done, key decisions, what's next) and read only that + this spec at the start of a new session.

---

## 1. Overview

A **single-branch restaurant management dashboard + POS** for a kabab restaurant in **Mardan, KP, Pakistan**. Main product is kababs, plus a few other food items (tikka, naan, rice, drinks etc.).

It is **not a public website**. It is an internal app used on a counter PC/laptop (and the owner may check reports on mobile).

### Core goals
1. **Fast billing (POS)** at the counter with a printed thermal receipt in a professional **tax-invoice style** (similar to KPRA/FBR POS invoices).
2. **Track raw material** bought daily (qeema, gosht, masala, oil, aata, etc.).
3. **Track production**: how much meat/qeema used → how many kababs made → how many sold → leftover/wastage.
4. **Track expenses** (bills, rent, gas, misc).
5. **Staff salary** management (no attendance).
6. **Reports**: daily/weekly/monthly sales, expenses, profit, top items, wastage.
7. **Works fully offline**, auto-syncs to Supabase when internet returns.

### Out of scope (do NOT build)
- No integration with KPRA / FBR / any tax authority API.
- No staff attendance.
- No multi-branch (but keep a `branch_id` column so it can be added later).
- No online ordering / customer-facing website.
- No Urdu UI or receipts (English only).

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js (App Router, latest stable), TypeScript** |
| Styling | **Tailwind CSS + shadcn/ui**, `lucide-react` icons |
| Charts | **Recharts** |
| Backend / DB | **Supabase** (Postgres, Auth, RLS, Storage for logo) |
| Offline storage | **Dexie.js** (IndexedDB) |
| PWA | `@serwist/next` (or `next-pwa` equivalent) — app shell cached, installable |
| Forms / validation | `react-hook-form` + `zod` |
| State | `zustand` for cart/POS state |
| Dates | `date-fns`, timezone **Asia/Karachi** |
| QR | `qrcode` / `qrcode.react` |
| Hosting | Vercel |

Currency: **PKR (Rs.)**, no decimals displayed for prices (store as `numeric(12,2)`). Weight in **kg** (`numeric(10,3)`).

---

## 3. User Roles

| Role | Access |
|---|---|
| **Owner (admin)** | Everything: reports, settings, users, salaries, delete/void, menu prices |
| **Manager** | POS, stock purchases, production entries, expenses, view daily reports. No salary, no settings, no user management |
| **Cashier** | POS only: create orders, print/reprint receipts, view own shift sales. Cannot void without owner PIN |

Auth: Supabase email+password for Owner/Manager. Cashier can log in with **username + 4-digit PIN** on the POS screen (store hashed PIN in `profiles`). Enforce with **RLS policies** per role.

---

## 4. Use Cases

### 4.1 POS / Billing
- **UC-1 Create order:** Cashier taps menu items (grid with categories) → items added to cart → change qty → apply discount (amount or %; discount above a limit needs owner PIN) → choose **order type: Dine-in (table no.) / Takeaway / Delivery** → choose **payment: Cash / Card / JazzCash / EasyPaisa** → enter amount received → show change → **Save & Print**.
- **UC-2 Hold order:** Save a dine-in order as *open* (table still eating), add more items later, then settle.
- **UC-3 Reprint receipt:** Search by invoice no. / date and reprint (marked "DUPLICATE").
- **UC-4 Void / refund:** Owner-only (or owner PIN). Requires reason. Voided invoices stay in DB with status `void`, never deleted.
- **UC-5 Keyboard shortcuts:** search item (`/`), pay (`F2`), print (`F4`), new order (`F1`).
- **UC-6 Offline:** All of the above must work with no internet.

### 4.2 Menu Management (Owner)
- Categories (Kabab, BBQ, Bread, Rice, Drinks, Extras).
- Item: name, category, price, unit ("plate", "piece", "seekh"), image (optional), active toggle, display order.
- Optional **recipe link**: how many kababs a menu item consumes (e.g. "Chapli Kabab Plate" = 2 kababs) → used for production vs sales reconciliation.

### 4.3 Stock / Raw Material Purchases
- **UC-7 Add purchase:** date, raw item (Qeema, Gosht, Masala, Oil, Aata, Onion, Tomato, Coal, Gas cylinder…), qty + unit (kg / litre / piece), rate, total (auto), supplier, paid / unpaid, note.
- Manage raw items list and suppliers.
- Supplier ledger: total purchased, paid, balance due.
- Current stock view per raw item (purchased − used).

### 4.4 Daily Production (the key feature)
- **UC-8 Production entry** (per day, can be multiple batches): raw item used (e.g. Qeema 10 kg) → product made (e.g. Chapli Kabab) → quantity produced (e.g. 200 pcs).
- System calculates **yield** (pcs per kg) and compares against an expected yield set in settings (e.g. 20 pcs/kg) → highlight if lower.
- **UC-9 Day closing:** Manager enters leftover/wasted kababs at end of day. System shows reconciliation:

  `Produced − Sold (from POS via recipe link) − Leftover/Wastage = Difference`

  Difference ≠ 0 shown in **red** as "Unaccounted". Leftover can be carried forward to the next day as opening stock.

### 4.5 Expenses
- **UC-10 Add expense:** date, category (Electricity, Gas, Rent, Repairs, Packaging, Transport, Misc…), amount, payment method, note, optional receipt photo (Supabase Storage).
- Manage expense categories.

### 4.6 Staff & Salary (no attendance)
- Staff: name, phone, CNIC (optional), role/designation, monthly salary, joining date, active.
- **UC-11 Advance:** record salary advance with date.
- **UC-12 Pay salary:** for month X → shows base salary − advances taken that month = payable → mark paid (full/partial).
- Salary payments automatically count as an expense in reports (category "Salaries").

### 4.7 Reports & Dashboard (Owner; Manager sees daily only)
- **Home dashboard cards:** Today's sales, orders count, avg bill, today's expenses, today's net, kababs produced vs sold.
- Charts: sales last 7/30 days (line), sales by category (bar/donut), top 10 items, payment method split, hourly sales (peak hours).
- **Profit & Loss:** for any date range → Sales − (Purchases + Expenses + Salaries) = Net.
- Production report: yield per day, wastage trend.
- Every report: date-range filter + **export to CSV** and **print/PDF**.

### 4.8 Settings (Owner)
- Restaurant name, address, phone, **NTN**, **STRN** (optional), logo upload.
- **POS ID / Terminal ID** (text, e.g. `POS-01`), invoice prefix (e.g. `KH-`).
- Tax: enable/disable, rate % (default 15%), inclusive or exclusive of price.
- Receipt footer text (e.g. "Thank you! Visit again").
- Expected kabab yield per kg, discount limit without PIN.
- Users management (create/disable, set role, reset PIN).

---

## 5. Offline-First Architecture

1. App is a **PWA**; app shell + menu cached so it opens without internet.
2. **Dexie (IndexedDB)** mirrors the needed tables locally: `menu_items`, `categories`, `orders`, `order_items`, `settings`, plus a `sync_queue` table.
3. **All writes go to Dexie first** → UI updates instantly → a row is pushed into `sync_queue` (`{id, table, op: insert|update, payload, created_at, attempts}`).
4. A **sync worker** (runs on interval + on `online` event) drains the queue to Supabase in order using **upsert by primary key**. Retry with backoff; never drop data.
5. **All primary keys are UUIDs generated on the client** (`crypto.randomUUID()`), so offline inserts never collide.
6. **Invoice numbers** are generated locally: `{prefix}{YYMMDD}-{seq}` with a per-day counter stored in Dexie (single counter terminal, so no clash). Also store a global running number.
7. On reconnect, **pull** fresh menu/settings from Supabase (owner may have changed prices) → update Dexie. Conflict rule: **server wins for master data (menu, settings), client wins for transactions (orders)**.
8. Show a **status pill** in the top bar: 🟢 Online · Synced / 🟡 Offline · N pending / 🔵 Syncing…
9. Owner's remote dashboard reads from Supabase and uses **Supabase Realtime** on `orders` so sales update live.
10. Stock, production, expense and salary screens: also write through Dexie + queue (same mechanism) so the manager can enter them offline.

---

## 6. Database Schema (Supabase / Postgres)

All tables: `id uuid primary key`, `branch_id uuid` (default the single branch), `created_at timestamptz default now()`, `updated_at timestamptz`, `created_by uuid references profiles`. Soft delete via `is_active` / `status` — never hard-delete transactions.

```
branches(id, name, address)
profiles(id → auth.users, full_name, username, role: owner|manager|cashier, pin_hash, is_active)
settings(id, restaurant_name, address, phone, ntn, strn, pos_id, invoice_prefix,
         tax_enabled, tax_rate, tax_inclusive, receipt_footer, logo_url,
         expected_yield_per_kg, discount_limit)

categories(id, name, sort_order, is_active)
menu_items(id, category_id, name, price, unit, image_url, is_active, sort_order,
           product_id null, product_qty_per_unit numeric)   -- recipe link

orders(id, invoice_no unique, order_type: dine_in|takeaway|delivery, table_no,
       status: open|paid|void, subtotal, discount, tax_amount, total,
       payment_method: cash|card|jazzcash|easypaisa, amount_received, change_due,
       void_reason, cashier_id, device_id, created_at_local timestamptz, synced_at)
order_items(id, order_id, menu_item_id, name_snapshot, unit_price, qty, line_total)

raw_items(id, name, unit: kg|litre|piece, is_active)
suppliers(id, name, phone, is_active)
purchases(id, date, raw_item_id, supplier_id, qty, rate, total, is_paid, note)
supplier_payments(id, supplier_id, date, amount, note)

products(id, name, unit)                         -- e.g. "Chapli Kabab", pcs
production_batches(id, date, raw_item_id, raw_qty, product_id, qty_produced, note)
day_closings(id, date unique, product_id, opening_qty, produced_qty, sold_qty,
             leftover_qty, wastage_qty, difference, closed_by)

expense_categories(id, name, is_active)
expenses(id, date, category_id, amount, payment_method, note, receipt_url)

staff(id, name, phone, cnic, designation, monthly_salary, joining_date, is_active)
salary_advances(id, staff_id, date, amount, note)
salary_payments(id, staff_id, month date, base_salary, advances_deducted,
                amount_paid, paid_on, note)
```

- Add **RLS** on every table by role (helper SQL function `current_role()` reading `profiles`).
- Add **SQL views** for reports: `v_daily_sales`, `v_item_sales`, `v_daily_pnl`, `v_production_recon`.
- Provide migrations in `supabase/migrations/` and a **seed** file with sample menu (Chapli Kabab, Seekh Kabab, Tikka, Naan, Raita, Salad, Cold drink), raw items and expense categories.

---

## 7. Receipt / Invoice Design (80mm thermal)

Style should look like a **Pakistani POS tax invoice (KPRA/FBR style)** — clean, centered, monospaced, structured. Printed from the browser with CSS `@page { size: 80mm auto; margin: 0 }`, width ~72mm printable, font `Courier New`/monospace ~11–12px. Chrome kiosk printing (`--kiosk-printing`) will be used for silent print, so the receipt route must auto-trigger `window.print()`.

**Important:** we are NOT integrated with KPRA/FBR, so the receipt must **not** show the KPRA/FBR logo, a "fiscal invoice number", or "verify via Tax Asaan / 9966" text. The QR code encodes our own invoice data.

Layout (top → bottom):
```
            [LOGO]
        KABAB HOUSE MARDAN
   Main Bazar, Mardan · 0300-0000000
        NTN: 1234567-8
        STRN: 00-00-0000-000-00
--------------------------------------
           SALES TAX INVOICE
Invoice #: KH-261124-0042
POS ID   : POS-01
Date     : 24-Nov-2026   Time: 22:15
Cashier  : Ali        Type: Dine-in T4
--------------------------------------
Item              Qty   Rate   Amount
Chapli Kabab       2    350     700
Naan               4     30     120
Cold Drink 500ml   2    120     240
--------------------------------------
Sub Total                       1,060
Discount                          -60
Sales Tax (15%)                   150
======================================
TOTAL (PKR)                     1,150
======================================
Payment: Cash   Received: 1,200
                Change  :    50
--------------------------------------
            [ QR CODE ]
   (encodes invoice no, date, total)
--------------------------------------
     Thank you! Please visit again.
   Software by <dev name / phone>
```
- "DUPLICATE" banner on reprints, "VOID" watermark on voided.
- Also make a **kitchen ticket (KOT)** variant: no prices, large font, order/table no., items + qty.

---

## 8. UI / UX Design

**Feel:** simple, easy, professional — **a little colorful with tasteful gradients**, not flashy.

- **Palette:** primary warm gradient inspired by grilled food — **orange → deep red** (`from-orange-500 to-red-600`) for primary buttons, active nav, and the hero stat card. Accent amber for highlights. Neutral slate/zinc background (`bg-slate-50`), white cards. Success green, danger red, warning amber.
- **Dark mode** supported (toggle).
- **Font:** Inter (or Geist). Large readable numbers (`tabular-nums`) for money.
- **Layout:** left sidebar (collapsible, icons + labels) + top bar (date/time, sync status pill, user menu). Mobile: bottom nav for owner reports.
- **Cards:** `rounded-2xl`, soft shadow, subtle gradient on KPI cards (each KPI a different soft gradient: orange, emerald, sky, violet), icon in a gradient circle.
- **POS screen (most important):** full-screen, no sidebar.
  - Left ~65%: category tabs as colorful pills + **big touch-friendly item tiles** (name, price, optional image), search bar on top.
  - Right ~35%: cart with qty +/- buttons, order type toggle, totals, and a **big gradient "PAY" button**.
  - Payment modal: quick-cash buttons (Rs 500 / 1000 / 5000 / exact), change shown in huge text.
  - Must be usable with mouse, touch and keyboard. Target: an order in under 10 seconds.
- Tables: shadcn data table with search, filters, pagination, date-range picker.
- Empty states with friendly icons; toast notifications for every save; confirmation dialogs for destructive actions.
- Loading skeletons, no layout shift. Fully responsive.

---

## 9. Routes

```
/login
/pos                     (full-screen POS)
/pos/receipt/[id]        (print view)
/dashboard               (home KPIs + charts)
/orders                  (history, reprint, void)
/menu                    (categories + items)
/stock/purchases
/stock/raw-items
/stock/suppliers
/production              (batches)
/production/closing      (day closing + reconciliation)
/expenses
/staff                   (list)
/staff/salary            (advances + monthly payments)
/reports                 (sales, P&L, items, production, expenses)
/settings                (restaurant, receipt, tax, users)
```

Folder suggestion: `app/(auth)`, `app/(dashboard)`, `app/pos`, `components/ui` (shadcn), `components/pos`, `lib/supabase`, `lib/db` (Dexie), `lib/sync`, `lib/receipt`, `types/`.

---

## 10. Build Phases

1. **Setup:** Next.js + Tailwind + shadcn + Supabase client, auth, roles, layout shell (sidebar/topbar), design tokens, dark mode.
2. **Database:** migrations, RLS, views, seed data, generated TypeScript types.
3. **Menu management** + **Settings**.
4. **POS** (online first) + receipt print + KOT.
5. **Offline layer:** PWA, Dexie, sync queue, status pill, local invoice numbering. Test by toggling network off in DevTools.
6. **Stock purchases, suppliers, production, day closing.**
7. **Expenses, staff, salary.**
8. **Dashboard + reports + CSV/PDF export.**
9. Polish: shortcuts, empty states, error handling, README (setup, env vars, Chrome kiosk-print instructions, Vercel deploy).

## 11. Acceptance Criteria
- Cashier can create and print a bill with internet **off**; after reconnect it appears in Supabase within ~30s with no duplicates.
- Invoice numbers are unique and sequential per day.
- Voided orders are excluded from sales but visible in history.
- Day closing shows produced vs sold vs leftover with the difference highlighted.
- P&L for any date range matches the sum of sales minus purchases, expenses and salaries.
- Cashier cannot open reports, settings or salary pages (blocked by both UI and RLS).
- Receipt fits 80mm paper with no cut-off text.
