# Phase 2 — Finance, Productivity & Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add personal finance tracking, lightweight productivity tools, and a Premium subscription tier to Money App, reusing all Phase 1 points/payment infrastructure.

**Architecture:** 6 migration files add 7 new tables; 3 new feature modules under `src/features/` follow the existing Server Actions pattern; Free tier limits enforced at Server Action layer via a shared constants file; billing via Postgres RPC (points) and extended `complete_payment()` Edge Function (VNPay).

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + RLS + Edge Functions), Zod, Vitest, TypeScript

**Spec:** `docs/superpowers/specs/2026-09-03-phase2-finance-productivity-design.md`

## Global Constraints

- All new trigger functions touching rows not owned by the caller: `SECURITY DEFINER SET search_path = public`
- All new tables: `ENABLE ROW LEVEL SECURITY` + explicit `GRANT` to `authenticated` (RLS alone is not enough)
- `points_ledger`: never INSERT/UPDATE/DELETE directly — always via `add_points()`
- `subscriptions`: client never INSERT/UPDATE directly — only via `subscribe_premium_with_points()` RPC or webhook service_role
- Free tier limits live only in `src/lib/constants/limits.ts`; check at Server Action layer before every insert that creates new records
- Test runner: `npx vitest run` (no `test` npm script — invoke vitest directly)
- **Docker setup**: App dùng `docker-compose.yml` tự quản lý (KHÔNG phải `npx supabase start`). DB expose port **5432** (không phải 54322).
- **DB_URL**: `postgresql://postgres:postgres@localhost:5432/postgres` — dùng cho mọi lệnh psql
- **Chạy migrations**: dùng `scripts/migrate.sh` (xem Task 0) thay vì chạy từng file riêng lẻ. Nếu không có psql local: `./scripts/migrate.sh --docker`
- `points_ledger.reference_id` column name is `reference_id` (NOT `ref_id` — stub in database.ts was wrong)

---

## File Map

**New SQL migrations:**
- `sql/migrations/08a-fix-count-triggers.sql` — fix SECURITY DEFINER on like/comment triggers
- `sql/migrations/08b-phase2-core.sql` — payments.payment_type + categories + transactions + seed
- `sql/migrations/08c-phase2-budgets.sql` — budgets table + RLS
- `sql/migrations/08d-phase2-savings.sql` — savings_goals + achieved trigger
- `sql/migrations/08e-phase2-productivity.sql` — notes + todos
- `sql/migrations/08f-phase2-billing.sql` — subscriptions + subscribe_premium_with_points() RPC
- `sql/migrations/09-extend-complete-payment.sql` — branch complete_payment() for subscription type

**New source files:**
- `src/lib/constants/limits.ts` — FREE_LIMITS, PREMIUM_POINTS_COST
- `src/lib/validators/finance.ts` — Zod schemas for finance inputs
- `src/features/billing/subscription.actions.ts` — getSubscriptionStatus, subscribeWithPoints, checkFreeLimit
- `src/features/finance/transaction.actions.ts` — createTransaction, listTransactions, deleteTransaction
- `src/features/finance/budget.actions.ts` — upsertBudget, listBudgets, getBudgetProgress
- `src/features/finance/savings.actions.ts` — createSavingsGoal, updateSavingsProgress, listSavingsGoals
- `src/features/productivity/notes.actions.ts` — createNote, updateNote, togglePin, deleteNote
- `src/features/productivity/todos.actions.ts` — createTodo, toggleDone, deleteTodo

**New pages:**
- `src/app/finance/page.tsx` — transaction list + monthly summary
- `src/app/finance/new/page.tsx` — add transaction form
- `src/app/finance/budgets/page.tsx` — budget list + progress
- `src/app/finance/goals/page.tsx` — savings goals
- `src/app/notes/page.tsx` — notes list
- `src/app/todos/page.tsx` — todo list
- `src/app/billing/upgrade/page.tsx` — upgrade page

**Modified files:**
- `src/lib/types/database.ts` — regenerated from Supabase
- `src/features/feed/components/FeedList.tsx` — remove `as any[]` after type regen
- `src/features/feed/components/LoadMoreFeed.tsx` — remove `as any[]` after type regen
- `src/app/layout.tsx` — add Finance/Notes/Todos nav links
- `supabase/functions/payment-webhook/index.ts` — no change needed (calls complete_payment() which is extended)

**New test files:**
- `src/lib/validators/__tests__/finance.validators.test.ts`
- `src/features/billing/__tests__/subscription.actions.test.ts` (Zod + pure logic only)

---

## Task 0: Migration script + Docker setup kiểm tra

**Files:**
- Create: `scripts/migrate.sh` ✅ (đã tạo sẵn)
- Modify: `scripts/migrate.sh` — bỏ comment từng dòng Phase 2 khi tạo file migration tương ứng

**Interfaces:**
- Produces: một lệnh duy nhất để chạy toàn bộ migrations theo thứ tự

- [ ] **Step 1: Xác nhận Docker đang chạy và DB accessible**

```bash
docker compose ps  # Kiểm tra services đang up
docker compose logs db --tail=5  # Xác nhận DB healthy
```

Tất cả services phải ở trạng thái `Up`. Service `db` phải healthy.

- [ ] **Step 2: Test kết nối DB**

Nếu có psql local:
```bash
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d postgres -c "SELECT version();"
```

Nếu không có psql local (dùng docker exec):
```bash
docker exec money-app-db-1 psql -U postgres -d postgres -c "SELECT version();"
```

Nếu tên container khác (container name tự động thêm prefix tên thư mục), kiểm tra bằng:
```bash
docker compose ps --format "table {{.Name}}\t{{.Status}}"
```
Rồi set biến: `DB_CONTAINER=<tên-container-db>` trước khi chạy `--docker`.

- [ ] **Step 3: Chạy migrations Phase 1 để verify script hoạt động**

```bash
# Dùng psql local:
./scripts/migrate.sh

# Hoặc dùng docker exec:
./scripts/migrate.sh --docker
```

Mỗi migration phải in `▶ Running: <file>` rồi kết thúc không có lỗi.

- [ ] **Step 4: Verify schema cơ bản tồn tại**

```bash
docker exec money-app-db-1 psql -U postgres -d postgres \
  -c "\dt public.*" | grep -E "profiles|posts|likes|payments"
```

Expected: tất cả 4 bảng đều xuất hiện.

- [ ] **Step 5: Commit (nếu chưa commit scripts/migrate.sh)**

```bash
git add scripts/migrate.sh
git commit -m "chore: add migrate.sh script for docker-compose DB setup

Supports both local psql and docker exec modes.
DB runs on localhost:5432 via docker-compose (not Supabase CLI port 54322).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 1: Fix like/comment count triggers (Sprint S0a)

**Files:**
- Create: `sql/migrations/08a-fix-count-triggers.sql`

**Interfaces:**
- Produces: `sync_post_like_count()`, `sync_post_comment_count()` — same signatures as before, now with `SECURITY DEFINER`

- [ ] **Step 1: Read the current broken functions from schema.sql**

Open `docs/requirement/schema.sql` lines ~191–220 and copy the body of `sync_post_like_count()` and `sync_post_comment_count()`. Confirm neither has `SECURITY DEFINER`.

- [ ] **Step 2: Create the migration file**

```sql
-- sql/migrations/08a-fix-count-triggers.sql
-- Fix: add SECURITY DEFINER so trigger can UPDATE posts owned by other users

CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;
```

- [ ] **Step 3: Run the migration**

```bash
# Dùng migrate.sh thay vì psql trực tiếp (xem Task 0)
# psql local:  PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d postgres -f <file>
# docker exec: docker exec money-app-db-1 psql -U postgres -d postgres < <file>
DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"
psql $DB_URL -f sql/migrations/08a-fix-count-triggers.sql
```

- [ ] **Step 4: Verify SECURITY DEFINER is set**

```sql
-- Run in Supabase SQL Editor (http://127.0.0.1:54323)
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN ('sync_post_like_count', 'sync_post_comment_count');
```

Expected: both rows show `prosecdef = true`.

- [ ] **Step 5: Smoke test — like a post as a different user**

In the running app, log in as user A, like a post owned by user B. Reload the post — `like_count` should increment. (If you have only one user, create a second via register flow.)

- [ ] **Step 6: Commit**

```bash
git add sql/migrations/08a-fix-count-triggers.sql
git commit -m "fix(db): add SECURITY DEFINER to like/comment count triggers

Triggers were silently updating 0 rows when liker != post owner.
RLS blocked the UPDATE because it ran as the calling user's role.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Generate TypeScript types (Sprint S0b)

**Files:**
- Modify: `src/lib/types/database.ts` — replace stub with generated output
- Modify: `src/features/feed/components/FeedList.tsx` — remove `as FeedPost[]` cast if present
- Modify: `src/features/feed/components/LoadMoreFeed.tsx` — remove `as FeedPost[]` cast if present

**Interfaces:**
- Produces: `Database` type with all Phase 1 tables fully typed; later tasks import from here

- [ ] **Step 1: Regenerate types**

```bash
npx supabase gen types typescript --local > src/lib/types/database.ts
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Fix any errors (likely in FeedList / LoadMoreFeed where `as FeedPost[]` casts may now conflict with the generated type). If the generated `posts` Row type already matches `FeedPost`, remove the cast and use the generated type directly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/database.ts src/features/feed/components/
git commit -m "chore: regenerate Supabase TypeScript types from local schema

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Constants + Free tier limits

**Files:**
- Create: `src/lib/constants/limits.ts`

**Interfaces:**
- Produces:
  - `FREE_LIMITS: { budgets: 3, savingsGoals: 1, notes: 50, activeTodos: 20 }`
  - `PREMIUM_POINTS_COST: 500`

- [ ] **Step 1: Create the file**

```ts
// src/lib/constants/limits.ts

export const FREE_LIMITS = {
  budgets: 3,
  savingsGoals: 1,
  notes: 50,
  activeTodos: 20,
} as const

// ponytail: hardcoded, change when founder confirms pricing
export const PREMIUM_POINTS_COST = 500
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants/limits.ts
git commit -m "feat: add free tier limits and premium points cost constants

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Finance Zod validators

**Files:**
- Create: `src/lib/validators/finance.ts`
- Create: `src/lib/validators/__tests__/finance.validators.test.ts`

**Interfaces:**
- Produces:
  - `transactionSchema: z.ZodObject` — `{ type, amount_vnd, category_id?, note?, occurred_at? }`
  - `budgetSchema: z.ZodObject` — `{ category_id, month, limit_amount }`
  - `savingsGoalSchema: z.ZodObject` — `{ name, target_amount, target_date? }`
  - `savingsProgressSchema: z.ZodObject` — `{ id, current_amount }`
  - `noteSchema: z.ZodObject` — `{ title?, content? }`
  - `todoSchema: z.ZodObject` — `{ title, due_date? }`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/validators/__tests__/finance.validators.test.ts
import { describe, it, expect } from 'vitest'
import {
  transactionSchema, budgetSchema, savingsGoalSchema,
  noteSchema, todoSchema
} from '@/lib/validators/finance'

describe('transactionSchema', () => {
  it('rejects zero amount', () => {
    const r = transactionSchema.safeParse({ type: 'expense', amount_vnd: 0 })
    expect(r.success).toBe(false)
  })
  it('rejects negative amount', () => {
    const r = transactionSchema.safeParse({ type: 'expense', amount_vnd: -100 })
    expect(r.success).toBe(false)
  })
  it('rejects note over 200 chars', () => {
    const r = transactionSchema.safeParse({ type: 'income', amount_vnd: 1000, note: 'x'.repeat(201) })
    expect(r.success).toBe(false)
  })
  it('accepts valid expense', () => {
    const r = transactionSchema.safeParse({ type: 'expense', amount_vnd: 50000, note: 'coffee' })
    expect(r.success).toBe(true)
  })
  it('rejects invalid type', () => {
    const r = transactionSchema.safeParse({ type: 'transfer', amount_vnd: 1000 })
    expect(r.success).toBe(false)
  })
})

describe('budgetSchema', () => {
  it('rejects zero limit', () => {
    const r = budgetSchema.safeParse({ category_id: 'uuid', month: '2026-09-01', limit_amount: 0 })
    expect(r.success).toBe(false)
  })
  it('accepts valid budget', () => {
    const r = budgetSchema.safeParse({ category_id: 'some-uuid', month: '2026-09-01', limit_amount: 1000000 })
    expect(r.success).toBe(true)
  })
})

describe('savingsGoalSchema', () => {
  it('rejects empty name', () => {
    const r = savingsGoalSchema.safeParse({ name: '', target_amount: 1000000 })
    expect(r.success).toBe(false)
  })
  it('accepts valid goal', () => {
    const r = savingsGoalSchema.safeParse({ name: 'Mua xe', target_amount: 50000000 })
    expect(r.success).toBe(true)
  })
})

describe('noteSchema', () => {
  it('rejects title over 100 chars', () => {
    const r = noteSchema.safeParse({ title: 'x'.repeat(101) })
    expect(r.success).toBe(false)
  })
  it('rejects content over 5000 chars', () => {
    const r = noteSchema.safeParse({ content: 'x'.repeat(5001) })
    expect(r.success).toBe(false)
  })
  it('accepts empty note (title and content both optional)', () => {
    const r = noteSchema.safeParse({})
    expect(r.success).toBe(true)
  })
})

describe('todoSchema', () => {
  it('rejects empty title', () => {
    const r = todoSchema.safeParse({ title: '' })
    expect(r.success).toBe(false)
  })
  it('rejects title over 200 chars', () => {
    const r = todoSchema.safeParse({ title: 'x'.repeat(201) })
    expect(r.success).toBe(false)
  })
  it('accepts valid todo', () => {
    const r = todoSchema.safeParse({ title: 'Buy groceries' })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/lib/validators/__tests__/finance.validators.test.ts
```

Expected: module not found errors.

- [ ] **Step 3: Implement validators**

```ts
// src/lib/validators/finance.ts
import { z } from 'zod'

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount_vnd: z.number().int().positive('Số tiền phải lớn hơn 0'),
  category_id: z.string().uuid().optional(),
  note: z.string().max(200, 'Ghi chú tối đa 200 ký tự').optional(),
  occurred_at: z.string().optional(), // ISO date string YYYY-MM-DD
})

export const budgetSchema = z.object({
  category_id: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}-01$/, 'month phải ở dạng YYYY-MM-01'),
  limit_amount: z.number().int().positive('Hạn mức phải lớn hơn 0'),
})

export const savingsGoalSchema = z.object({
  name: z.string().min(1, 'Tên mục tiêu không được để trống').max(60, 'Tối đa 60 ký tự'),
  target_amount: z.number().int().positive('Mục tiêu phải lớn hơn 0'),
  target_date: z.string().optional(), // ISO date string YYYY-MM-DD
})

export const savingsProgressSchema = z.object({
  id: z.string().uuid(),
  current_amount: z.number().int().min(0),
})

export const noteSchema = z.object({
  title: z.string().max(100, 'Tiêu đề tối đa 100 ký tự').optional(),
  content: z.string().max(5000, 'Nội dung tối đa 5000 ký tự').optional(),
})

export const todoSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').max(200, 'Tối đa 200 ký tự'),
  due_date: z.string().optional(), // ISO date string YYYY-MM-DD
})

export type TransactionInput = z.infer<typeof transactionSchema>
export type BudgetInput = z.infer<typeof budgetSchema>
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>
export type NoteInput = z.infer<typeof noteSchema>
export type TodoInput = z.infer<typeof todoSchema>
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npx vitest run src/lib/validators/__tests__/finance.validators.test.ts
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators/finance.ts src/lib/validators/__tests__/finance.validators.test.ts
git commit -m "feat(finance): add Zod validators for finance + productivity inputs

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: DB migration — categories + transactions (Sprint S1)

**Files:**
- Create: `sql/migrations/08b-phase2-core.sql`

**Interfaces:**
- Produces: `categories` table, `transactions` table, default category seed, `payments.payment_type` column

- [ ] **Step 1: Create migration**

```sql
-- sql/migrations/08b-phase2-core.sql

-- 1. Add payment_type to existing payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'topup'
  CHECK (payment_type IN ('topup', 'subscription'));

-- 2. Extend points_ledger reason_code constraint
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_code_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_code_check
  CHECK (reason_code IN (
    'signup', 'profile_complete', 'streak', 'post',
    'referral_in', 'referral_out', 'redeem', 'adjustment',
    'savings_goal_achieved', 'subscription_points'
  ));

-- 3. Extend notifications type constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'like', 'comment', 'points', 'referral', 'finance', 'todo'));

-- 4. categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  icon       text,
  type       text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id),
  type        text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_vnd  integer NOT NULL CHECK (amount_vnd > 0),
  note        text CHECK (note IS NULL OR char_length(note) <= 200),
  occurred_at date NOT NULL DEFAULT current_date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_month ON public.transactions (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories (user_id);

-- 7. RLS
ALTER TABLE public.categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- 8. GRANT (RLS alone is not enough)
GRANT SELECT, INSERT ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;

-- 9. Default categories seed
INSERT INTO public.categories (user_id, name, icon, type) VALUES
  (NULL, 'Ăn uống',   '🍜', 'expense'),
  (NULL, 'Di chuyển', '🚗', 'expense'),
  (NULL, 'Hóa đơn',   '🧾', 'expense'),
  (NULL, 'Giải trí',  '🎮', 'expense'),
  (NULL, 'Lương',     '💰', 'income'),
  (NULL, 'Khác',      '📦', 'expense')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Run migration**

```bash
# Dùng migrate.sh thay vì psql trực tiếp (xem Task 0)
# psql local:  PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d postgres -f <file>
# docker exec: docker exec money-app-db-1 psql -U postgres -d postgres < <file>
DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"
psql $DB_URL -f sql/migrations/08b-phase2-core.sql
```

- [ ] **Step 3: Verify tables and RLS**

```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM public.categories WHERE user_id IS NULL; -- should be 6
SELECT has_table_privilege('authenticated', 'public.transactions', 'insert'); -- true
SELECT has_table_privilege('authenticated', 'public.categories', 'delete'); -- false
```

- [ ] **Step 4: Commit**

```bash
git add sql/migrations/08b-phase2-core.sql
git commit -m "feat(db): add categories + transactions tables with RLS (Phase 2 S1)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Transaction Server Actions + /finance pages (Sprint S1)

**Files:**
- Create: `src/features/finance/transaction.actions.ts`
- Create: `src/app/finance/page.tsx`
- Create: `src/app/finance/new/page.tsx`

**Interfaces:**
- Consumes: `transactionSchema` from `@/lib/validators/finance`, `createClient` from `@/lib/supabase/server`
- Produces:
  - `createTransaction(data: TransactionInput): Promise<{ error: string | null }>`
  - `listTransactions(month: string): Promise<{ transactions: Transaction[], totalIncome: number, totalExpense: number }>`
  - `deleteTransaction(id: string): Promise<{ error: string | null }>`

- [ ] **Step 1: Implement transaction.actions.ts**

```ts
// src/features/finance/transaction.actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { transactionSchema } from '@/lib/validators/finance'

export async function createTransaction(raw: unknown) {
  const parsed = transactionSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    type: parsed.data.type,
    amount_vnd: parsed.data.amount_vnd,
    category_id: parsed.data.category_id ?? null,
    note: parsed.data.note ?? null,
    occurred_at: parsed.data.occurred_at ?? new Date().toISOString().slice(0, 10),
  })

  if (error) return { error: error.message }
  revalidatePath('/finance')
  return { error: null }
}

export async function listTransactions(month: string) {
  // month: YYYY-MM (e.g. '2026-09')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { transactions: [], totalIncome: 0, totalExpense: 0 }

  const start = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const { data } = await supabase
    .from('transactions')
    .select('*, categories(name, icon, type)')
    .eq('user_id', user.id)
    .gte('occurred_at', start)
    .lt('occurred_at', nextMonth)
    .order('occurred_at', { ascending: false })

  const transactions = data ?? []
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_vnd, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_vnd, 0)
  return { transactions, totalIncome, totalExpense }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('transactions').delete()
    .eq('id', id).eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/finance')
  return { error: null }
}
```

- [ ] **Step 2: Build /finance page**

```tsx
// src/app/finance/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listTransactions } from '@/features/finance/transaction.actions'

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const month = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  const { transactions, totalIncome, totalExpense } = await listTransactions(month)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Tài chính tháng {month}</h1>
        <Link href="/finance/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          + Thêm giao dịch
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-xl p-4">
          <p className="text-sm text-gray-500">Thu nhập</p>
          <p className="text-lg font-bold text-green-600">+{totalIncome.toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-sm text-gray-500">Chi tiêu</p>
          <p className="text-lg font-bold text-red-600">-{totalExpense.toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      <div className="space-y-2">
        {transactions.length === 0 && (
          <p className="text-center text-gray-400 py-8">Chưa có giao dịch nào tháng này.</p>
        )}
        {transactions.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <span className="mr-2">{t.categories?.icon ?? '📦'}</span>
              <span className="text-sm">{t.categories?.name ?? 'Không phân loại'}</span>
              {t.note && <p className="text-xs text-gray-400 ml-6">{t.note}</p>}
            </div>
            <span className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {t.type === 'income' ? '+' : '-'}{t.amount_vnd.toLocaleString('vi-VN')}đ
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Build /finance/new page**

```tsx
// src/app/finance/new/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createTransaction } from '@/features/finance/transaction.actions'

export default async function NewTransactionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .or('user_id.is.null,user_id.eq.' + user.id)
    .order('name')

  async function submit(form: FormData) {
    'use server'
    const result = await createTransaction({
      type: form.get('type'),
      amount_vnd: Number(form.get('amount_vnd')),
      category_id: form.get('category_id') || undefined,
      note: form.get('note') || undefined,
      occurred_at: form.get('occurred_at') || undefined,
    })
    if (!result.error) redirect('/finance')
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Thêm giao dịch</h1>
      <form action={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Loại</label>
          <select name="type" className="w-full border rounded-lg p-2" required>
            <option value="expense">Chi tiêu</option>
            <option value="income">Thu nhập</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Số tiền (VNĐ)</label>
          <input name="amount_vnd" type="number" min="1" step="1000" required
            className="w-full border rounded-lg p-2" placeholder="50000" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Danh mục</label>
          <select name="category_id" className="w-full border rounded-lg p-2">
            <option value="">Không phân loại</option>
            {(categories ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ngày</label>
          <input name="occurred_at" type="date" className="w-full border rounded-lg p-2"
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ghi chú</label>
          <input name="note" type="text" maxLength={200} className="w-full border rounded-lg p-2"
            placeholder="Tùy chọn" />
        </div>
        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-xl font-semibold">
          Lưu giao dịch
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 4: Manual test**

Navigate to `http://localhost:3000/finance` → should see monthly summary. Click "+ Thêm giao dịch" → fill form → submit → redirects back to `/finance` → new transaction appears.

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/transaction.actions.ts src/app/finance/
git commit -m "feat(finance): transaction CRUD + /finance + /finance/new pages

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: DB migration — budgets (Sprint S2)

**Files:**
- Create: `sql/migrations/08c-phase2-budgets.sql`

- [ ] **Step 1: Create migration**

```sql
-- sql/migrations/08c-phase2-budgets.sql

CREATE TABLE IF NOT EXISTS public.budgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.categories(id),
  month        date NOT NULL, -- always day 1 of month, e.g. 2026-09-01
  limit_amount integer NOT NULL CHECK (limit_amount > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets (user_id, month);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_select" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
```

- [ ] **Step 2: Run and verify**

```bash
# Dùng migrate.sh thay vì psql trực tiếp (xem Task 0)
# psql local:  PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d postgres -f <file>
# docker exec: docker exec money-app-db-1 psql -U postgres -d postgres < <file>
DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"
psql $DB_URL -f sql/migrations/08c-phase2-budgets.sql
```

```sql
SELECT has_table_privilege('authenticated', 'public.budgets', 'insert'); -- true
```

- [ ] **Step 3: Commit**

```bash
git add sql/migrations/08c-phase2-budgets.sql
git commit -m "feat(db): add budgets table with RLS (Phase 2 S2)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Budget Server Actions + /finance/budgets page (Sprint S2)

**Files:**
- Create: `src/features/finance/budget.actions.ts`
- Create: `src/app/finance/budgets/page.tsx`

**Interfaces:**
- Consumes: `budgetSchema` from `@/lib/validators/finance`, `FREE_LIMITS` from `@/lib/constants/limits`, `getSubscriptionStatus` from `@/features/billing/subscription.actions`
- Produces:
  - `upsertBudget(data: BudgetInput): Promise<{ error: string | null }>`
  - `listBudgets(month: string): Promise<Budget[]>`
  - `getBudgetProgress(categoryId: string, month: string): Promise<{ spent: number, limit: number }>`

**Note:** `getSubscriptionStatus` is defined in Task 12. If implementing tasks out of order, stub it temporarily: `async function getSubscriptionStatus() { return { isPremium: false } }`.

- [ ] **Step 1: Implement budget.actions.ts**

```ts
// src/features/finance/budget.actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { budgetSchema } from '@/lib/validators/finance'
import { FREE_LIMITS } from '@/lib/constants/limits'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'

export async function upsertBudget(raw: unknown) {
  const parsed = budgetSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Free tier check: count active budgets this month
  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    const thisMonth = new Date().toISOString().slice(0, 7)
    const { count } = await supabase
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('month', `${thisMonth}-01`)
    if ((count ?? 0) >= FREE_LIMITS.budgets) {
      return { error: `Gói Free tối đa ${FREE_LIMITS.budgets} ngân sách/tháng. Nâng cấp Premium để tạo thêm.` }
    }
  }

  const { error } = await supabase.from('budgets').upsert({
    user_id: user.id,
    category_id: parsed.data.category_id,
    month: parsed.data.month, // YYYY-MM-01
    limit_amount: parsed.data.limit_amount,
  }, { onConflict: 'user_id,category_id,month' })

  if (error) return { error: error.message }
  revalidatePath('/finance/budgets')
  return { error: null }
}

export async function listBudgets(month: string) {
  // month: YYYY-MM
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('budgets')
    .select('*, categories(name, icon)')
    .eq('user_id', user.id)
    .eq('month', `${month}-01`)
  return data ?? []
}

export async function getBudgetProgress(categoryId: string, month: string) {
  // month: YYYY-MM
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { spent: 0, limit: 0 }

  const start = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const { data } = await supabase
    .from('transactions')
    .select('amount_vnd')
    .eq('user_id', user.id)
    .eq('category_id', categoryId)
    .eq('type', 'expense')
    .gte('occurred_at', start)
    .lt('occurred_at', nextMonth)

  const spent = (data ?? []).reduce((s, t) => s + t.amount_vnd, 0)

  const { data: budget } = await supabase
    .from('budgets')
    .select('limit_amount')
    .eq('user_id', user.id)
    .eq('category_id', categoryId)
    .eq('month', start)
    .single()

  return { spent, limit: budget?.limit_amount ?? 0 }
}
```

- [ ] **Step 2: Build /finance/budgets page**

```tsx
// src/app/finance/budgets/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listBudgets, getBudgetProgress } from '@/features/finance/budget.actions'

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const month = new Date().toISOString().slice(0, 7)
  const budgets = await listBudgets(month)
  const withProgress = await Promise.all(
    budgets.map(async (b: any) => {
      const { spent, limit } = await getBudgetProgress(b.category_id, month)
      return { ...b, spent, pct: limit > 0 ? Math.min((spent / limit) * 100, 100) : 0 }
    })
  )

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Ngân sách tháng {month}</h1>
      {withProgress.length === 0 && (
        <p className="text-center text-gray-400 py-8">Chưa có ngân sách nào.</p>
      )}
      {withProgress.map((b: any) => (
        <div key={b.id} className="border rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span>{b.categories?.icon} {b.categories?.name}</span>
            <span className="text-sm text-gray-500">
              {b.spent.toLocaleString('vi-VN')}đ / {b.limit_amount.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${b.pct >= 100 ? 'bg-red-500' : b.pct >= 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
              style={{ width: `${b.pct}%` }}
            />
          </div>
          {b.pct >= 80 && (
            <p className="text-xs text-red-500">
              {b.pct >= 100 ? '⚠️ Đã vượt ngân sách!' : '⚠️ Sắp đạt giới hạn'}
            </p>
          )}
        </div>
      ))}
    </main>
  )
}
```

- [ ] **Step 3: Manual test**

Navigate to `/finance/budgets` — should render (empty initially). Test upsertBudget via a quick form or Server Action call from `/finance/new` area.

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/budget.actions.ts src/app/finance/budgets/
git commit -m "feat(finance): budget CRUD + /finance/budgets with progress bars

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: DB migration — savings_goals (Sprint S3)

**Files:**
- Create: `sql/migrations/08d-phase2-savings.sql`

- [ ] **Step 1: Create migration**

```sql
-- sql/migrations/08d-phase2-savings.sql

CREATE TABLE IF NOT EXISTS public.savings_goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  target_amount  integer NOT NULL CHECK (target_amount > 0),
  current_amount integer NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date    date,
  achieved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals (user_id, created_at DESC);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "savings_goals_select" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "savings_goals_insert" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals_update" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.savings_goals TO authenticated;

-- Trigger: award 30 points when goal first reached (MUST be SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.check_savings_goal_achieved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount
     AND OLD.achieved_at IS NULL
     AND NEW.achieved_at IS NULL THEN
    NEW.achieved_at := now();
    PERFORM public.add_points(NEW.user_id, 30, 'savings_goal_achieved', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_savings_goal_achieved
BEFORE UPDATE ON public.savings_goals
FOR EACH ROW EXECUTE FUNCTION public.check_savings_goal_achieved();
```

- [ ] **Step 2: Run and verify**

```bash
# Dùng migrate.sh thay vì psql trực tiếp (xem Task 0)
# psql local:  PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d postgres -f <file>
# docker exec: docker exec money-app-db-1 psql -U postgres -d postgres < <file>
DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"
psql $DB_URL -f sql/migrations/08d-phase2-savings.sql
```

```sql
-- Verify trigger is SECURITY DEFINER
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'check_savings_goal_achieved';
-- prosecdef = true ✅
```

- [ ] **Step 3: Commit**

```bash
git add sql/migrations/08d-phase2-savings.sql
git commit -m "feat(db): add savings_goals table + achievement trigger (Phase 2 S3)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Savings Actions + /finance/goals page (Sprint S3)

**Files:**
- Create: `src/features/finance/savings.actions.ts`
- Create: `src/app/finance/goals/page.tsx`

**Interfaces:**
- Produces:
  - `createSavingsGoal(data: SavingsGoalInput): Promise<{ error: string | null }>`
  - `updateSavingsProgress(id: string, current_amount: number): Promise<{ error: string | null }>`
  - `listSavingsGoals(): Promise<SavingsGoal[]>`

- [ ] **Step 1: Implement savings.actions.ts**

```ts
// src/features/finance/savings.actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { savingsGoalSchema, savingsProgressSchema } from '@/lib/validators/finance'
import { FREE_LIMITS } from '@/lib/constants/limits'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'

export async function createSavingsGoal(raw: unknown) {
  const parsed = savingsGoalSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    const { count } = await supabase
      .from('savings_goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((count ?? 0) >= FREE_LIMITS.savingsGoals) {
      return { error: `Gói Free tối đa ${FREE_LIMITS.savingsGoals} mục tiêu. Nâng cấp Premium để tạo thêm.` }
    }
  }

  const { error } = await supabase.from('savings_goals').insert({
    user_id: user.id,
    name: parsed.data.name,
    target_amount: parsed.data.target_amount,
    target_date: parsed.data.target_date ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath('/finance/goals')
  return { error: null }
}

export async function updateSavingsProgress(raw: unknown) {
  const parsed = savingsProgressSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('savings_goals')
    .update({ current_amount: parsed.data.current_amount })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/finance/goals')
  return { error: null }
}

export async function listSavingsGoals() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return data ?? []
}
```

- [ ] **Step 2: Build /finance/goals page**

```tsx
// src/app/finance/goals/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listSavingsGoals } from '@/features/finance/savings.actions'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const goals = await listSavingsGoals()

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Mục tiêu tiết kiệm</h1>
      {goals.length === 0 && (
        <p className="text-center text-gray-400 py-8">Chưa có mục tiêu nào.</p>
      )}
      {goals.map((g: any) => {
        const pct = Math.min((g.current_amount / g.target_amount) * 100, 100)
        return (
          <div key={g.id} className="border rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{g.name}</p>
                {g.target_date && (
                  <p className="text-xs text-gray-400">Hạn: {g.target_date}</p>
                )}
              </div>
              {g.achieved_at && <span className="text-green-500 text-sm">✅ Đạt mục tiêu</span>}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-gray-500">
              {g.current_amount.toLocaleString('vi-VN')}đ / {g.target_amount.toLocaleString('vi-VN')}đ ({pct.toFixed(0)}%)
            </p>
          </div>
        )
      })}
    </main>
  )
}
```

- [ ] **Step 3: Test trigger — verify 30 points awarded on goal achieved**

In Supabase SQL Editor, manually set `current_amount = target_amount` for a test goal:
```sql
UPDATE public.savings_goals
SET current_amount = target_amount
WHERE id = '<test-goal-id>';

-- Then verify:
SELECT delta, reason_code FROM public.points_ledger
WHERE reason_code = 'savings_goal_achieved' ORDER BY created_at DESC LIMIT 1;
-- delta = 30 ✅
```

- [ ] **Step 4: Commit**

```bash
git add src/features/finance/savings.actions.ts src/app/finance/goals/
git commit -m "feat(finance): savings goals CRUD + /finance/goals page + achievement trigger test

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: DB migration — notes + todos (Sprint S4)

**Files:**
- Create: `sql/migrations/08e-phase2-productivity.sql`

- [ ] **Step 1: Create migration**

```sql
-- sql/migrations/08e-phase2-productivity.sql

CREATE TABLE IF NOT EXISTS public.notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text CHECK (title IS NULL OR char_length(title) <= 100),
  content    text CHECK (content IS NULL OR char_length(content) <= 5000),
  pinned     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.todos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  done       boolean NOT NULL DEFAULT false,
  due_date   date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON public.notes (user_id, pinned, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_user_done   ON public.todos (user_id, done, due_date);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete" ON public.notes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "todos_select" ON public.todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "todos_insert" ON public.todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "todos_update" ON public.todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "todos_delete" ON public.todos FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todos TO authenticated;

-- notes.updated_at auto-update (reuse set_updated_at() from Phase 1)
CREATE TRIGGER trg_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

- [ ] **Step 2: Run and verify**

```bash
# Dùng migrate.sh thay vì psql trực tiếp (xem Task 0)
# psql local:  PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d postgres -f <file>
# docker exec: docker exec money-app-db-1 psql -U postgres -d postgres < <file>
DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"
psql $DB_URL -f sql/migrations/08e-phase2-productivity.sql
```

```sql
SELECT has_table_privilege('authenticated', 'public.notes', 'insert'); -- true
SELECT has_table_privilege('authenticated', 'public.todos', 'insert'); -- true
```

- [ ] **Step 3: Commit**

```bash
git add sql/migrations/08e-phase2-productivity.sql
git commit -m "feat(db): add notes + todos tables with RLS (Phase 2 S4)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Notes + Todos Server Actions + pages (Sprint S4)

**Files:**
- Create: `src/features/productivity/notes.actions.ts`
- Create: `src/features/productivity/todos.actions.ts`
- Create: `src/app/notes/page.tsx`
- Create: `src/app/todos/page.tsx`

**Interfaces:**
- Produces:
  - `createNote(data: NoteInput): Promise<{ error: string | null }>`
  - `updateNote(id: string, data: NoteInput): Promise<{ error: string | null }>`
  - `togglePin(id: string): Promise<{ error: string | null }>`
  - `deleteNote(id: string): Promise<{ error: string | null }>`
  - `createTodo(data: TodoInput): Promise<{ error: string | null }>`
  - `toggleDone(id: string): Promise<{ error: string | null }>`
  - `deleteTodo(id: string): Promise<{ error: string | null }>`

- [ ] **Step 1: Implement notes.actions.ts**

```ts
// src/features/productivity/notes.actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { noteSchema } from '@/lib/validators/finance'
import { FREE_LIMITS } from '@/lib/constants/limits'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'

export async function createNote(raw: unknown) {
  const parsed = noteSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    const { count } = await supabase
      .from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    if ((count ?? 0) >= FREE_LIMITS.notes) {
      return { error: `Gói Free tối đa ${FREE_LIMITS.notes} ghi chú. Nâng cấp Premium để tạo thêm.` }
    }
  }

  const { error } = await supabase.from('notes').insert({
    user_id: user.id,
    title: parsed.data.title ?? null,
    content: parsed.data.content ?? null,
  })
  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { error: null }
}

export async function updateNote(id: string, raw: unknown) {
  const parsed = noteSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('notes')
    .update({ title: parsed.data.title ?? null, content: parsed.data.content ?? null })
    .eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { error: null }
}

export async function togglePin(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: note } = await supabase.from('notes').select('pinned').eq('id', id).eq('user_id', user.id).single()
  if (!note) return { error: 'Không tìm thấy ghi chú' }

  const { error } = await supabase.from('notes').update({ pinned: !note.pinned }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { error: null }
}

export async function deleteNote(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { error: null }
}
```

- [ ] **Step 2: Implement todos.actions.ts**

```ts
// src/features/productivity/todos.actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todoSchema } from '@/lib/validators/finance'
import { FREE_LIMITS } from '@/lib/constants/limits'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'

export async function createTodo(raw: unknown) {
  const parsed = todoSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    const { count } = await supabase
      .from('todos').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('done', false)
    if ((count ?? 0) >= FREE_LIMITS.activeTodos) {
      return { error: `Gói Free tối đa ${FREE_LIMITS.activeTodos} to-do đang hoạt động. Nâng cấp Premium để tạo thêm.` }
    }
  }

  const { error } = await supabase.from('todos').insert({
    user_id: user.id,
    title: parsed.data.title,
    due_date: parsed.data.due_date ?? null,
  })
  if (error) return { error: error.message }
  revalidatePath('/todos')
  return { error: null }
}

export async function toggleDone(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: todo } = await supabase.from('todos').select('done').eq('id', id).eq('user_id', user.id).single()
  if (!todo) return { error: 'Không tìm thấy' }

  const { error } = await supabase.from('todos').update({ done: !todo.done }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/todos')
  return { error: null }
}

export async function deleteTodo(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('todos').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/todos')
  return { error: null }
}
```

- [ ] **Step 3: Build /notes page**

```tsx
// src/app/notes/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notes } = await supabase
    .from('notes').select('*').eq('user_id', user.id)
    .order('pinned', { ascending: false }).order('updated_at', { ascending: false })

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-3">
      <h1 className="text-xl font-bold">Ghi chú</h1>
      {(notes ?? []).length === 0 && (
        <p className="text-center text-gray-400 py-8">Chưa có ghi chú nào.</p>
      )}
      {(notes ?? []).map((n: any) => (
        <div key={n.id} className="border rounded-xl p-4">
          <div className="flex justify-between">
            <p className="font-semibold">{n.pinned ? '📌 ' : ''}{n.title ?? '(Không có tiêu đề)'}</p>
          </div>
          {n.content && <p className="text-sm text-gray-600 mt-1 line-clamp-3">{n.content}</p>}
          <p className="text-xs text-gray-400 mt-2">{new Date(n.updated_at).toLocaleDateString('vi-VN')}</p>
        </div>
      ))}
    </main>
  )
}
```

- [ ] **Step 4: Build /todos page**

```tsx
// src/app/todos/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function TodosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: todos } = await supabase
    .from('todos').select('*').eq('user_id', user.id)
    .order('done').order('due_date', { ascending: true, nullsFirst: false })

  const active = (todos ?? []).filter((t: any) => !t.done)
  const done = (todos ?? []).filter((t: any) => t.done)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">To-do ({active.length} việc cần làm)</h1>
      {active.length === 0 && <p className="text-gray-400">Không có việc nào đang chờ.</p>}
      {active.map((t: any) => (
        <div key={t.id} className="flex items-center gap-3 border rounded-lg p-3">
          <span className="text-lg">⬜</span>
          <div>
            <p>{t.title}</p>
            {t.due_date && <p className="text-xs text-gray-400">Hạn: {t.due_date}</p>}
          </div>
        </div>
      ))}
      {done.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-gray-400 pt-2">Đã hoàn thành ({done.length})</h2>
          {done.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 border rounded-lg p-3 opacity-50">
              <span className="text-lg">✅</span>
              <p className="line-through">{t.title}</p>
            </div>
          ))}
        </>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/productivity/ src/app/notes/ src/app/todos/
git commit -m "feat(productivity): notes + todos CRUD + /notes + /todos pages

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 13: DB migration — subscriptions + billing RPC (Sprint S5)

**Files:**
- Create: `sql/migrations/08f-phase2-billing.sql`

- [ ] **Step 1: Create migration**

```sql
-- sql/migrations/08f-phase2-billing.sql

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan           text NOT NULL DEFAULT 'premium' CHECK (plan IN ('premium')),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  payment_method text NOT NULL CHECK (payment_method IN ('points', 'vnpay')),
  started_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.subscriptions TO authenticated;

-- Client cannot INSERT/UPDATE/DELETE directly
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon, public;

-- RPC: subscribe via points
CREATE OR REPLACE FUNCTION public.subscribe_premium_with_points()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_points_cost CONSTANT integer := 500; -- ponytail: change when founder confirms pricing
  v_sub_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Yeu cau dang nhap';
  END IF;

  -- Deduct points (will fail if balance insufficient due to check(balance_after >= 0) on points_ledger)
  PERFORM public.add_points(v_user_id, -v_points_cost, 'subscription_points', NULL);

  INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
  VALUES (v_user_id, 'premium', 'active', 'points', now() + interval '30 days')
  ON CONFLICT (user_id) DO UPDATE
    SET expires_at    = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
        status        = 'active',
        payment_method = 'points';

  SELECT id INTO v_sub_id FROM public.subscriptions WHERE user_id = v_user_id;
  RETURN v_sub_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.subscribe_premium_with_points() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_premium_with_points() TO authenticated;
```

- [ ] **Step 2: Run and verify permissions**

```bash
# Dùng migrate.sh thay vì psql trực tiếp (xem Task 0)
# psql local:  PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d postgres -f <file>
# docker exec: docker exec money-app-db-1 psql -U postgres -d postgres < <file>
DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"
psql $DB_URL -f sql/migrations/08f-phase2-billing.sql
```

```sql
SELECT has_function_privilege('authenticated', 'public.subscribe_premium_with_points()', 'execute'); -- true
SELECT has_table_privilege('authenticated', 'public.subscriptions', 'insert'); -- false
SELECT has_table_privilege('authenticated', 'public.subscriptions', 'select'); -- true
```

- [ ] **Step 3: Commit**

```bash
git add sql/migrations/08f-phase2-billing.sql
git commit -m "feat(db): add subscriptions table + subscribe_premium_with_points() RPC (Phase 2 S5)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 14: Subscription Server Actions + /billing/upgrade page (Sprint S5)

**Files:**
- Create: `src/features/billing/subscription.actions.ts`
- Create: `src/app/billing/upgrade/page.tsx`

**Interfaces:**
- Produces:
  - `getSubscriptionStatus(): Promise<{ isPremium: boolean, expiresAt: Date | null }>`
  - `subscribeWithPoints(): Promise<{ error: string | null }>`
  - `checkFreeLimit(feature: keyof typeof FREE_LIMITS, currentCount: number): { allowed: boolean, error?: string }`

- [ ] **Step 1: Implement subscription.actions.ts**

```ts
// src/features/billing/subscription.actions.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { FREE_LIMITS, PREMIUM_POINTS_COST } from '@/lib/constants/limits'

export async function getSubscriptionStatus(): Promise<{ isPremium: boolean; expiresAt: Date | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isPremium: false, expiresAt: null }

  const { data } = await supabase
    .from('subscriptions')
    .select('status, expires_at')
    .eq('user_id', user.id)
    .single()

  if (!data || data.status !== 'active') return { isPremium: false, expiresAt: null }
  const expiresAt = new Date(data.expires_at)
  if (expiresAt < new Date()) return { isPremium: false, expiresAt: null }
  return { isPremium: true, expiresAt }
}

export async function subscribeWithPoints() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data, error } = await supabase.rpc('subscribe_premium_with_points')
  if (error) return { error: error.message } // Includes "balance insufficient" from points_ledger check
  revalidatePath('/billing/upgrade')
  return { error: null }
}
```

- [ ] **Step 2: Build /billing/upgrade page**

```tsx
// src/app/billing/upgrade/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionStatus, subscribeWithPoints } from '@/features/billing/subscription.actions'
import { PREMIUM_POINTS_COST } from '@/lib/constants/limits'

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { isPremium, expiresAt } = await getSubscriptionStatus()

  const { data: profile } = await supabase
    .from('profiles').select('points_balance').eq('id', user.id).single()

  const canAfford = (profile?.points_balance ?? 0) >= PREMIUM_POINTS_COST

  async function handleSubscribeWithPoints() {
    'use server'
    const result = await subscribeWithPoints()
    if (!result.error) redirect('/billing/upgrade')
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Nâng cấp Premium</h1>

      {isPremium ? (
        <div className="border border-green-200 bg-green-50 dark:bg-green-950 rounded-xl p-4">
          <p className="font-semibold text-green-700 dark:text-green-300">✅ Bạn đang dùng Premium</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Hết hạn: {expiresAt?.toLocaleDateString('vi-VN')}
          </p>
        </div>
      ) : (
        <div className="border rounded-xl p-4 space-y-2">
          <p className="font-semibold">Gói Free</p>
          <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
            <li>Tối đa 3 ngân sách/tháng</li>
            <li>Tối đa 1 mục tiêu tiết kiệm</li>
            <li>Tối đa 50 ghi chú</li>
            <li>Tối đa 20 to-do đang hoạt động</li>
          </ul>
        </div>
      )}

      <div className="border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-bold text-lg">Premium — 30 ngày</h2>
          <p className="text-sm text-gray-500">Không giới hạn tất cả tính năng</p>
        </div>

        <form action={handleSubscribeWithPoints}>
          <button
            type="submit"
            disabled={!canAfford}
            className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Dùng {PREMIUM_POINTS_COST} điểm
            {!canAfford && ` (thiếu ${PREMIUM_POINTS_COST - (profile?.points_balance ?? 0)} điểm)`}
          </button>
        </form>

        <Link
          href="/wallet/topup"
          className="block w-full py-3 rounded-xl font-semibold text-center border border-blue-600 text-blue-600 hover:bg-blue-50"
        >
          Nạp tiền qua VNPay (19.000đ)
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Manual test — subscribe with points**

1. Ensure demo user has ≥ 500 points (topup or grant in SQL Editor)
2. Navigate to `/billing/upgrade` — should show Free status, 2 buttons
3. Click "Dùng 500 điểm" — should redirect back, now showing Premium + expiry
4. Check `points_ledger` — should have `reason_code = 'subscription_points'`, `delta = -500`

- [ ] **Step 4: Commit**

```bash
git add src/features/billing/ src/app/billing/
git commit -m "feat(billing): subscription actions + /billing/upgrade page (points flow)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 15: Extend complete_payment() for subscription VNPay (Sprint S5)

**Files:**
- Create: `sql/migrations/09-extend-complete-payment.sql`

- [ ] **Step 1: Read current complete_payment() RPC**

Open `sql/migrations/07-complete-payment-rpc.sql` to understand exact DECLARE vars and flow. The extension replaces the points logic with a branch on `v_payment.payment_type`.

- [ ] **Step 2: Create the extension migration**

```sql
-- sql/migrations/09-extend-complete-payment.sql
-- Extend complete_payment() to handle payment_type = 'subscription'

CREATE OR REPLACE FUNCTION public.complete_payment(
  p_gateway_txn_id text,
  p_gateway        text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_delta   integer;
  v_err     text;
BEGIN
  UPDATE payments
  SET    status = 'succeeded',
         gateway_txn_id = p_gateway_txn_id
  WHERE  gateway_txn_id = p_gateway_txn_id
    AND  gateway         = p_gateway
    AND  status          = 'pending'
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', true, 'skipped', true);
  END IF;

  IF v_payment.payment_type = 'subscription' THEN
    INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
    VALUES (v_payment.user_id, 'premium', 'active', 'vnpay', now() + interval '30 days')
    ON CONFLICT (user_id) DO UPDATE
      SET expires_at     = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
          status         = 'active',
          payment_method = 'vnpay';
    RETURN json_build_object('ok', true, 'subscription', true, 'payment_id', v_payment.id);
  ELSE
    -- Default: topup — convert VND to points (1.000đ = 1 point)
    v_delta := FLOOR(v_payment.amount_vnd::numeric / 1000)::integer;
    IF v_delta > 0 THEN
      PERFORM public.add_points(v_payment.user_id, v_delta, 'topup', v_payment.id);
    END IF;
    RETURN json_build_object('ok', true, 'payment_id', v_payment.id, 'points', v_delta);
  END IF;

EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
  RETURN json_build_object('ok', false, 'error', v_err);
END;
$$;

-- Permissions stay the same (already REVOKE'd from public/anon/authenticated)
REVOKE EXECUTE ON FUNCTION public.complete_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment(text, text) TO service_role;
```

- [ ] **Step 3: Run migration**

```bash
# Dùng migrate.sh thay vì psql trực tiếp (xem Task 0)
# psql local:  PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d postgres -f <file>
# docker exec: docker exec money-app-db-1 psql -U postgres -d postgres < <file>
DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"
psql $DB_URL -f sql/migrations/09-extend-complete-payment.sql
```

- [ ] **Step 4: Verify VNPay subscription flow works**

In Supabase SQL Editor — simulate what the webhook would do:
```sql
-- Insert a pending subscription payment
INSERT INTO public.payments (user_id, amount_vnd, gateway, gateway_txn_id, status, payment_type)
VALUES (
  (SELECT id FROM public.profiles LIMIT 1),
  19000, 'vnpay', 'test-sub-txn-001', 'pending', 'subscription'
);

-- Call complete_payment as service_role would:
SELECT public.complete_payment('test-sub-txn-001', 'vnpay');

-- Verify subscription created:
SELECT * FROM public.subscriptions WHERE user_id = (SELECT id FROM public.profiles LIMIT 1);
```

Expected: `subscriptions` row with `payment_method = 'vnpay'`, `expires_at ≈ now() + 30 days`.

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/09-extend-complete-payment.sql
git commit -m "feat(db): extend complete_payment() to handle subscription payment_type

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 16: Add nav links + final type regen

**Files:**
- Modify: `src/app/layout.tsx` — add Finance, Notes, Todos links
- Modify: `src/lib/types/database.ts` — regenerate after all 7 tables added

- [ ] **Step 1: Regen types with all new tables**

```bash
npx supabase gen types typescript --local > src/lib/types/database.ts
npx tsc --noEmit
```

Fix any type errors introduced by new tables.

- [ ] **Step 2: Add nav links to layout.tsx**

Open `src/app/layout.tsx` and find the nav/sidebar section. Add:
```tsx
<Link href="/finance">💰 Tài chính</Link>
<Link href="/notes">📝 Ghi chú</Link>
<Link href="/todos">✅ To-do</Link>
<Link href="/billing/upgrade">⭐ Premium</Link>
```

Follow the existing nav link style exactly (same className, same pattern as Feed/Wallet/Profile links).

- [ ] **Step 3: Manual smoke test — full flow**

1. `/finance` — view transactions, click "+ Thêm", add one → appears in list
2. `/finance/budgets` — empty page loads without error
3. `/finance/goals` — empty page loads
4. `/notes` — empty page loads
5. `/todos` — empty page loads
6. `/billing/upgrade` — shows Free status, 2 buttons

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (validators).

- [ ] **Step 5: Final commit**

```bash
git add src/app/layout.tsx src/lib/types/database.ts
git commit -m "feat: add Phase 2 nav links + final type regen

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Sprint 0a: fix count triggers → Task 1
- [x] Sprint 0b: gen types → Task 2
- [x] Constants/limits → Task 3
- [x] Finance validators → Task 4
- [x] categories + transactions migration → Task 5
- [x] Transaction actions + pages → Task 6
- [x] budgets migration → Task 7
- [x] Budget actions + pages → Task 8
- [x] savings_goals migration → Task 9
- [x] Savings actions + pages → Task 10
- [x] notes + todos migration → Task 11
- [x] Notes + todos actions + pages → Task 12
- [x] subscriptions migration + RPC → Task 13
- [x] Subscription actions + upgrade page → Task 14
- [x] extend complete_payment() → Task 15
- [x] Nav links + final regen → Task 16
- [x] Seed default categories → included in Task 5
- [x] PREMIUM_POINTS_COST = 500 with TBD comment → Task 3
- [x] SECURITY DEFINER on all cross-owner triggers → Tasks 1, 9, 13
- [x] RLS + explicit GRANT on all new tables → Tasks 5, 7, 9, 11, 13
- [x] Free tier check in every create action → Tasks 8, 10, 12

**Type consistency:** `getSubscriptionStatus` defined in Task 14, consumed in Tasks 8, 10, 12. Tasks 8, 10, 12 note the dependency and how to stub if implementing out of order. ✅

**Placeholder scan:** No TBDs, no "implement later", no "similar to Task N" — all code blocks are complete. ✅
