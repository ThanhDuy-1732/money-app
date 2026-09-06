# Phase 6 — Feature Design Spec

> Date: 2026-09-06  
> Branch: feat/phase6-features (to be created from main after Phase 5 merge)  
> Based on: `docs/requirement/KE-HOACH-GIAI-DOAN-6-TINH-NANG.md`

## Scope

5 features, 10 sprints (Sprint 0–9), ~10 weeks. All features cross-connect existing modules (Social × Fintech × SaaS) rather than introducing a new module.

**Not in scope:** real money transfers, badge system, direct messaging, native mobile app, go-live ops (deferred to Phase 7).

---

## Architecture

### Migrations (sequential, one per feature)

| File | Feature | Sprint |
|---|---|---|
| `20-phase6-gift-points.sql` | Gift points + daily limit + constraint updates | 0 |
| `21-phase6-shared-savings.sql` | Shared savings goals (3 tables + RLS) | 2 |
| `22-phase6-hashtags.sql` | posts.tags column + trigger + GIN index | 4 |
| `23-phase6-recurring-tx.sql` | recurring_transactions + pg_cron | 6 |
| `24-phase6-export.sql` | (placeholder — export is app-layer only) | 8 |

### New routes

```
src/app/explore/tag/[tag]/page.tsx   — hashtag explore
src/app/finance/recurring/page.tsx   — recurring transaction management
```

### Touched routes (additions only)

```
src/app/u/[username]/                — add Gift Points button
src/app/finance/trends/              — add Export button (Premium-gated)
src/app/finance/savings/[id]/        — add Members tab + contribute form
```

### Feature modules touched

| Module | Change |
|---|---|
| `wallet` | add `gift.actions.ts` |
| `finance` | add `recurring.actions.ts`, `export.actions.ts`; extend `savings.actions.ts` |
| `feed` | render tags in `PostCard` |
| `notifications` | constraint update only, no code change |

---

## Feature 1: Gift Points (Sprint 0–1)

### Database (migration 20)

```sql
-- 1. Extend points_ledger reason codes
alter table public.points_ledger drop constraint if exists points_ledger_reason_code_check;
alter table public.points_ledger add constraint points_ledger_reason_code_check
  check (reason_code in ('signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved','subscription_points',
    'shop_purchase_points','gift_sent','gift_received'));

-- 2. Extend notifications type
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow','like','comment','points','referral','finance','todo','shop','gift'));

-- 3. Daily limit tracker
create table public.gift_daily_limit (
  user_id    uuid primary key references public.profiles(id),
  day        date not null default current_date,
  total_sent integer not null default 0
);

-- 4. gift_points() RPC (tested — see KE-HOACH doc §3.1)
-- daily limit: 200 pts/day (TODO: confirm with product before launch)
-- Security: reads auth.uid() internally → safe to GRANT to authenticated
-- Atomicity: both add_points() calls are in same transaction
create or replace function public.gift_points(p_to_user_id uuid, p_amount integer)
returns void language plpgsql security definer set search_path = public as $$
...
$$;
grant execute on function public.gift_points(uuid, integer) to authenticated;
```

### App layer (Sprint 1)

- `src/features/wallet/actions/gift.actions.ts` — calls `supabase.rpc('gift_points', { p_to_user_id, p_amount })`
- UI: Radix `Dialog` on `/u/[username]` with amount input + submit; show sender balance before/after
- Notification insert happens inside RPC (server-side); no extra app-layer call needed
- Daily limit TODO: confirm product value (currently 200) before Sprint 1 ships

### Error states

| Error | UI |
|---|---|
| Self-gift | "Không thể tặng điểm cho chính mình" |
| Insufficient balance | "Số dư không đủ" |
| Daily limit exceeded | "Đã đạt hạn mức tặng hôm nay (còn X điểm)" |

---

## Feature 2: Shared Savings Goals (Sprint 2–3)

### Database (migration 21)

3 new tables + helper function (tested — see KE-HOACH doc §3.2):

- `savings_goal_members(goal_id, user_id)` — membership
- `savings_goal_contributions(id, goal_id, user_id, amount, created_at)` — contribution log
- `is_goal_member(p_goal_id uuid) → boolean` — SECURITY DEFINER, used by all RLS policies (avoids infinite recursion pattern, same as `is_admin()`)
- `sync_goal_amount()` trigger — increments `savings_goals.current_amount` on contribution insert

**Critical:** `savings_goals.user_id` is the owner field (doc calls it `owner_id` — verify against actual schema before writing migration).

### Extend existing trigger (Sprint 3)

`check_savings_goal_achieved()` currently awards 30pts to `NEW.user_id` only. Extend to loop through `savings_goal_members` and call `add_points()` for each member when goal is achieved. Write a dedicated unit test for this path.

### App layer (Sprint 2–3)

- `savings.actions.ts`: add `inviteMember(goalId, username)`, `contributeToSharedGoal(goalId, amount)`
- UI: savings goal detail page — new "Thành viên" tab (member list + invite form) + contribution form
- Owner can invite by username; invited user sees goal in their savings list via RLS

---

## Feature 3: Hashtags & Explore (Sprint 4–5)

### Database (migration 22)

```sql
alter table public.posts add column tags text[] not null default '{}';

-- extract_hashtags(): BEFORE INSERT OR UPDATE OF content trigger
-- Tested: deduplicates case-insensitively, preserves Vietnamese diacritics
-- Limit: 10 tags per post (slice array in trigger if > 10)
create or replace function public.extract_hashtags() ...

create trigger trg_extract_hashtags before insert or update of content on public.posts
  for each row execute function public.extract_hashtags();

create index posts_tags_idx on public.posts using gin(tags);
```

### App layer (Sprint 4–5)

- `PostCard`: render `post.tags` as `<Link href="/explore/tag/{tag}">#{tag}</Link>` — inline, reuse existing link styles
- `src/app/explore/tag/[tag]/page.tsx`: Server Component, reuse `searchContent()` action with `tags @> array[tag]` filter + `ts_rank` ordering from Phase 5
- No new action file needed — extend existing search action with optional `tag` param

---

## Feature 4: Recurring Transactions (Sprint 6–7)

### Database (migration 23)

```sql
-- Prerequisite: verify pg_cron extension is enabled (Database → Extensions)

create table public.recurring_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  category_id     uuid references public.categories(id),
  type            text not null check (type in ('income','expense')),
  amount_vnd      integer not null check (amount_vnd > 0),
  note            text,
  start_date      date not null,          -- immutable after creation
  occurrences_run integer not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
-- RLS: owner-only (mirror transactions/budgets pattern)

-- run_recurring_transactions(): REVOKE from authenticated/anon, pg_cron only
-- Formula: (start_date + (occurrences_run || ' months')::interval)::date
-- NOT: next_run_date + interval (causes date drift on day 29-31)
select cron.schedule('run-recurring-transactions-daily', '0 1 * * *',
  $$select public.run_recurring_transactions();$$);
```

### App layer (Sprint 7)

- `src/features/finance/recurring.actions.ts`: `createRecurring()`, `listRecurring()`, `toggleRecurring()`, `deleteRecurring()`
- `src/app/finance/recurring/page.tsx`: list view + create form (category, type, amount, start_date, note)
- Link from `/finance` nav (alongside Budgets, Savings)

---

## Feature 5: Premium Export (Sprint 8–9)

### CSV (no new dependency)

```ts
// src/features/finance/export.actions.ts
export async function exportTransactionsCsv(month: string): Promise<Response> {
  // gate: getSubscriptionStatus() — redirect if not premium
  const txs = await listTransactions({ month })  // existing action
  const csv = buildCsvString(txs)                // inline helper
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="report-${month}.csv"`,
    },
  })
}
```

Route handler at `src/app/finance/export/route.ts` (GET `?month=YYYY-MM`).

### PDF (new dependency: `@react-pdf/renderer`)

- Server-side render: transaction table + monthly summary (income/expense/balance)
- Same data source as CSV — reuse `listTransactions()` and `get_finance_trend()` RPC
- Same Premium gate

### UI

- `/finance/trends` page: add "Xuất báo cáo" dropdown (CSV / PDF)
- Free tier: button visible but links to `/billing` with upsell message (not an error)

---

## Testing

### Vitest unit tests (4 new files)

| File | Key cases |
|---|---|
| `src/features/wallet/__tests__/gift.actions.test.ts` | self-gift error, daily limit exceeded, success path |
| `src/features/finance/__tests__/shared-savings.actions.test.ts` | non-member blocked, owner invite, contribution triggers amount update |
| `src/features/finance/__tests__/recurring.actions.test.ts` | day-31 formula correctness (compare vs. additive approach) |
| `src/features/finance/__tests__/export.actions.test.ts` | CSV headers + row count, Premium gate blocks free user |

### Playwright E2E (2 new tests, total ~12)

1. Gift flow: User A gifts 50pts → User B balance +50 → notification appears
2. Hashtag flow: Post with `#phase6` → tag link visible → `/explore/tag/phase6` shows post

PDF output: manual verification in Sprint 9 closed beta.

---

## Open items before implementation

- [ ] Confirm daily gift limit (currently 200) with product
- [ ] Verify `savings_goals` owner field name (`user_id` vs `owner_id`) in actual migration file
- [ ] Confirm pg_cron enabled before writing migration 23
- [ ] Decide tag limit per post before writing migration 22 (spec uses 10)
- [ ] Confirm `@react-pdf/renderer` is acceptable new dependency for PDF

---

## Sprint schedule

| Sprint | Weeks | Deliverable |
|---|---|---|
| 0 | 1 | Migration 20: gift_points + constraints |
| 1 | 2 | UI: gift modal on /u/[username], notification |
| 2 | 3 | Migration 21: shared savings schema + RLS |
| 3 | 4 | Extend trigger, invite UI, contribution form |
| 4 | 5 | Migration 22: hashtags |
| 5 | 6 | Tag UI in PostCard, /explore/tag/[tag] route |
| 6 | 7 | Migration 23: recurring_transactions + pg_cron |
| 7 | 8 | Recurring management UI in /finance |
| 8 | 9 | Export: CSV route + PDF (add @react-pdf/renderer) |
| 9 | 10 | Closed beta, fixes, retro |
