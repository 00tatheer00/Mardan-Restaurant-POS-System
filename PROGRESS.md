# Progress

- [x] Phases 1–9 complete. `tsc`, `eslint` and `next build` pass. Not yet tested against a live Supabase project (user tests at end).

Decisions:
- Auth: `proxy.ts` + RLS. Cashier PIN = scrypt hash + service-role magic link; 5 wrong PINs → 5 min lock. First auth user = owner. SQL helpers `auth_role()`/`has_role()`.
- Offline: one generic Dexie `rows` cache ([table+id]) + `queue` (lib/db). `useTable` = server→cache→UI, writes local→queue. `cachedQuery` for filtered reads. Sync worker upserts by id in order; constraint/RLS errors marked failed (kept, retry via pill). Invoice counter in Dexie meta.
- PWA: hand-written `public/sw.js` (Serwist needs webpack; Turbopack used). Receipt route is client-rendered `/pos/receipt?id=` so it works offline.
- `cacheComponents` disabled (all pages per-user).
- `day_closings` unique (date, product_id). P&L salaries = advances + payments. Sales = paid orders total.
- Online-only: owner-PIN approvals, voids, uploads, dashboard/reports, user mgmt.
- Next: user testing; then regenerate types with `npm run db:types`.
