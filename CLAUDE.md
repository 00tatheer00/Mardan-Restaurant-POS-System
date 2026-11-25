@AGENTS.md

# Kabab House POS

- Full spec: `SPEC.md` (follow §0 working rules strictly). Progress log: `PROGRESS.md`.
- At session start read only `PROGRESS.md` + `SPEC.md`, then do the next phase.
- Next.js 16: middleware is `proxy.ts`; `cookies()`/`params` are async.
- Roles/route access live in `lib/auth/roles.ts`; nav in `lib/nav.ts`.
