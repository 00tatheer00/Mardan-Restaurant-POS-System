# Kabab House POS & Management

Internal POS + management dashboard for Kabab House Mardan. Next.js 16 · Supabase · Dexie (offline) · Tailwind/shadcn.

## 1. Setup

```bash
npm install
cp .env.example .env.local   # fill in values below
npm run dev                  # http://localhost:3000
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page (anon / publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (service role). **Server only**, used for cashier PIN login, PIN approvals, voids and user management |
| `NEXT_PUBLIC_SOFTWARE_CREDIT` | optional last line on receipts, e.g. `Software by Name · 0300-0000000` |

## 2. Database

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npm run db:push      # applies supabase/migrations + seed.sql (sample menu, raw items, expense categories)
npm run db:types     # regenerates types/database.ts from the live schema
```

Then in the Supabase dashboard:
1. **Authentication → Providers → Email**: turn **off** "Allow new users to sign up".
2. **Authentication → Users → Add user**: create the owner (email + password, auto-confirm). **The first user ever created becomes Owner.**
3. Sign in at `/login`, open **Settings** → set restaurant name, NTN, logo, tax, and give yourself a 4-digit **PIN** (needed for discount/void approvals).
4. **Settings → Users**: add managers (email + password) and cashiers (username + PIN only).

Roles: **Owner** = everything · **Manager** = POS, orders, stock, production, expenses, today's reports · **Cashier** = POS only. Enforced by `proxy.ts` (UI) and Postgres RLS (data).

## 3. Counter PC: silent receipt printing

1. Set the 80mm thermal printer as the Windows **default printer**, paper size 80mm (72mm printable), margins none.
2. Create a Chrome shortcut with:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing --app=https://your-domain/pos
   ```
   `--kiosk-printing` prints receipts instantly with no dialog. Add `--kiosk` for full-screen lock.
3. In Chrome's print settings (one time), set Margins → None and turn off Headers and footers.

Receipts print automatically after **Save & Print**. Kitchen tickets (KOT) print on **Hold** and optionally on payment.

## 4. Offline mode

- Open `/pos` once while online (and print one receipt), so the app shell, menu and receipt page are cached.
- With no internet, cashiers can still bill and print. Orders save to IndexedDB and sync automatically when online (every 10s and on reconnect).
- The top-bar pill shows `Online · Synced`, `Offline · N pending`, `Syncing…` or `N failed · retry` (click to retry; hover for the error).
- Need internet: login, owner-PIN approvals (big discounts, voids), logo/receipt photo uploads, dashboard/reports, user management.
- Stock, production, expenses and salary entries also save offline and sync later.

POS shortcuts: `/` search (Enter adds first match) · `F1` new order · `F2` pay · `F4` confirm payment / reprint last receipt.

## 5. Deploy (Vercel)

1. Push the repo to GitHub → **Import** in Vercel.
2. Add the env vars from step 1 (Production + Preview).
3. Deploy. In Supabase **Authentication → URL Configuration**, set Site URL to your Vercel domain.

## Project layout

```
app/(auth)/login        email + cashier PIN login (server actions)
app/(dashboard)/*       dashboard, orders, menu, stock, production, expenses, staff, reports, settings
app/pos                 full-screen POS, receipt/KOT print view (/pos/receipt?id=…)
components/             DataTable, FormDialog, CrudSection, StatCard, charts, POS parts, layout
lib/db                  Dexie local store (generic rows cache + sync queue)
lib/sync                sync worker, cachedQuery, status store
lib/hooks/use-table.ts  offline-first table hook used by every CRUD screen
supabase/migrations     schema, RLS, report views, storage buckets
public/sw.js            service worker (offline app shell)
```
