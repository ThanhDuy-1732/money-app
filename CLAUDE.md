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
```

Local URLs after `./scripts/dev.sh`:
- `http://localhost:3000` — app
- `http://localhost:3001` — Supabase Studio
- `http://localhost:9000` — Inbucket (OTP emails)

## Architecture

### Feature modules (`src/features/<name>/`)

Each feature is self-contained with `actions.ts` (Server Actions), `components/`, and optionally `__tests__/`. Features: `auth`, `admin`, `billing`, `feed`, `finance`, `notifications`, `productivity`, `profile`, `referral`, `search`, `shop`, `wallet`.

### Supabase clients

- **Server** (`src/lib/supabase/server.ts`): `createClient()` — async, uses `cookies()` from `next/headers`. Use in Server Components and Server Actions.
- **Client** (`src/lib/supabase/client.ts`): browser-side singleton. Use in Client Components for Realtime subscriptions.
- **Admin** (`src/lib/supabase/admin.ts`): service role key — server only, bypasses RLS.

Middleware (`src/middleware.ts`) refreshes the session on every request and enforces locked-user access control.

### Database

Migrations live in `sql/migrations/` numbered `06–15`. Run in order via `scripts/migrate.sh`. The DB schema is typed in `src/lib/types/database.ts` (generated from Supabase).

Sensitive operations use Postgres RPCs (e.g. `complete_payment`, `create_referral`, `admin_import_codes`) to enforce atomicity and bypass PostgREST permission gaps — prefer RPCs over direct table access for writes that touch multiple tables or require elevated privileges.

### Key patterns

- **Server Actions** call `createClient()` and return `{ error: string } | data`. Never call the Supabase admin client from actions directly — go through RPCs with appropriate RLS.
- **Free tier limits** are in `src/lib/constants/limits.ts` (`FREE_LIMITS`, `PREMIUM_POINTS_COST = 500 pts`).
- **Finance pages** use URL `searchParams` for month navigation (`?month=YYYY-MM`).
- **Realtime**: feed uses a `NewPostsBanner` component that subscribes to `posts` inserts; wallet balance subscribes to `points_ledger`.
- **Search**: full-text via GIN indexes on posts/profiles (migration 15); `searchContent()` action in `src/features/search/`.
- **`cn()`** utility (`src/lib/cn.ts`) — `clsx` + `tailwind-merge`, used everywhere for class composition.

### Auth flow

OTP-based (email magic link). `/join` is a Route Handler (not a Server Component) to allow cookie mutation. Referral codes are processed via the `create_referral` RPC on signup.
