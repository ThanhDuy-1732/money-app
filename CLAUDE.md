# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Next.js 16 (App Router) + Supabase (Auth, PostgreSQL via `@supabase/ssr`, Storage, Realtime) + Tailwind CSS v4 + Radix UI + React Hook Form + Zod.

## Dev Commands

```bash
# First run — starts Docker, runs migrations, starts Next.js
./scripts/dev.sh

# Subsequent runs (DB already has data)
./scripts/dev.sh --no-migrate

# Stop Docker stack
./scripts/dev.sh --down

# Run migrations only
./scripts/migrate.sh              # requires psql locally
./scripts/migrate.sh --docker     # via docker exec (no local psql needed)

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Tests (Vitest)
npx vitest run                    # all tests
npx vitest run src/features/auth  # single feature
npx vitest run path/to/file.test.ts -t "name"  # single test

# E2E (Playwright, tests/e2e/)
npm run test:e2e
```

Unit tests live in `tests/unit/` and `src/**/__tests__/` (see `vitest.config.ts`); `tests/e2e/` is excluded from Vitest.

**Next.js 16 has breaking changes vs. older versions** (see `AGENTS.md`) — read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js-specific code.

Local URLs after `./scripts/dev.sh`:
- `http://localhost:3000` — app
- `http://localhost:3001` — Supabase Studio
- `http://localhost:9000` — Inbucket (OTP emails)

## Architecture

### Feature modules (`src/features/<name>/`)

Each feature is self-contained with `actions.ts` (Server Actions), `components/`, and optionally `__tests__/`. Features: `auth`, `admin`, `billing`, `feed`, `finance`, `notifications`, `productivity`, `profile`, `referral`, `search`, `shop`, `wallet`. Shared code is in `src/lib/` (`validators/`, `constants/`, `supabase/`, `types/`).

### Supabase clients

- **Server** (`src/lib/supabase/server.ts`): `createClient()` — async, uses `cookies()` from `next/headers`. Use in Server Components and Server Actions.
- **Client** (`src/lib/supabase/client.ts`): browser-side singleton. Use in Client Components for Realtime subscriptions.
- **Admin** (`src/lib/supabase/admin.ts`): service role key — server only, bypasses RLS.

Middleware (`src/middleware.ts`) refreshes the session on every request and enforces locked-user access control.

### Database

Migrations live in `sql/migrations/` (currently `06`–`19`, with lettered Phase 2 files like `08a`–`08f`). `scripts/migrate.sh` runs an **explicit hard-coded list** — a new migration file must also be added there. Phase 6 plans (migrations 20–24) are in `docs/superpowers/plans/` and `docs/requirement/`; `docs/APP-REFERENCE.md`-style references are in `docs/`. The DB schema is typed in `src/lib/types/database.ts` (generated from Supabase).

Sensitive operations use Postgres RPCs (e.g. `complete_payment`, `create_referral`, `admin_import_codes`) to enforce atomicity and bypass PostgREST permission gaps — prefer RPCs over direct table access for writes that touch multiple tables or require elevated privileges.

### Key patterns

- **Server Actions** call `createClient()` and return `{ error: string } | data`. Never call the Supabase admin client from actions directly — go through RPCs with appropriate RLS.
- **Free tier limits** are in `src/lib/constants/limits.ts` (`FREE_LIMITS`, `PREMIUM_POINTS_COST = 500 pts`).
- **Finance pages** use URL `searchParams` for month navigation (`?month=YYYY-MM`).
- **Realtime**: feed uses a `NewPostsBanner` component that subscribes to `posts` inserts; wallet balance subscribes to `points_ledger`.
- **Search**: full-text via GIN indexes on posts/profiles (migration 15); `searchContent()` action in `src/features/search/`.
- **`cn()`** utility (`src/lib/cn.ts`) — `clsx` + `tailwind-merge`, used everywhere for class composition.

### Design system (Polymer Ledger)
- **Tokens:** `src/app/globals.css` — semantic `--color-*`, `--text-*`, `--radius-*`, `--container-*`, `--shadow-sheet`. New code uses semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`); never `bg-white`, `zinc`, `amber`, or `yellow`.
- **Primitives:** `src/components/ui/` — `Button`, `Input`, `Textarea`, `Select`, `Field`, `Card`, `Badge`, `Avatar`, `Dialog`, `Sheet`, `Toast`, `Tabs`, `Segmented`, `Progress`, `Skeleton`, `EmptyState`, `Stat`, `PageHeader`, `Section`, `Table`, `Amount`, `Serial`, `Stamp`, `Note`, `CategoryIcon`.
- **Icons:** `lucide-react`; category emoji are data and mapped by `CategoryIcon`.
- **Shell:** `AppNav` — desktop sidebar 240px; mobile top bar + bottom nav + “Thêm” sheet. Admin uses `AdminTabs` inside the main shell; no second sidebar.
- **Page template:** `PageHeader` + `Section`; containers `max-w-narrow/default/wide`; radii `rounded-md/lg/xl/2xl`; cards are flat (no shadow); only floating layers use `shadow-sheet`.
- **Dev-only playground:** `/design` and `/design/shell` (404 in production).
- **E2E selectors to preserve:** `data-testid="balance"`, `referral-code`, `referral-total`, `input[placeholder="000000"]`, `"Thanh toán qua VNPay"`, `"Mua bằng"`, `a[href^="/shop/"]`.

### Auth flow

OTP-based (email magic link). `/join` is a Route Handler (not a Server Component) to allow cookie mutation. Referral codes are processed via the `create_referral` RPC on signup.
