# Phase 6 — Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 cross-module features — gift points, shared savings goals, hashtags, recurring transactions, and premium report export — connecting Social, Fintech, and SaaS modules already built in Phases 1–5.

**Architecture:** Sequential sprints, one DB migration per feature (migrations 20–24), new Server Actions follow the existing `'use server'` + `createClient()` + return `{ error: string | null }` pattern, new routes follow App Router conventions already in `src/app/`.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL + RPC, Tailwind CSS v4, Radix UI, Zod, Vitest, Playwright. New dependency in Task 10 only: `@react-pdf/renderer`.

**Spec:** `docs/superpowers/specs/2026-09-06-phase6-features-design.md`

## Global Constraints

- All Server Actions: `'use server'` directive, call `createClient()` from `@/lib/supabase/server`, return `{ error: string | null }` or typed data
- Auth check in every action: `const { data: { user } } = await supabase.auth.getUser()` — return `{ error: 'Chưa đăng nhập' }` if null
- Validators: Zod, added to `src/lib/validators/finance.ts` (existing file)
- Utility class: use `cn()` from `@/lib/cn` for className composition
- Each migration added to `scripts/migrate.sh` immediately after creating the SQL file
- Never call `supabase.rpc('run_recurring_transactions', ...)` from client — REVOKE'd from `authenticated`
- `savings_goals` owner field is `user_id` (not `owner_id` — verified in `08d-phase2-savings.sql`)
- Run `npx tsc --noEmit` after each task before committing

---

## File Map

| File | Status | Task |
|---|---|---|
| `sql/migrations/20-phase6-gift-points.sql` | Create | 1 |
| `sql/migrations/21-phase6-shared-savings.sql` | Create | 3 |
| `sql/migrations/22-phase6-hashtags.sql` | Create | 5 |
| `sql/migrations/23-phase6-recurring-tx.sql` | Create | 7 |
| `scripts/migrate.sh` | Modify (×4) | 1, 3, 5, 7 |
| `src/lib/validators/finance.ts` | Modify | 2, 8 |
| `src/features/wallet/actions/gift.actions.ts` | Create | 2 |
| `src/features/wallet/__tests__/gift.validators.test.ts` | Create | 2 |
| `src/app/u/[username]/page.tsx` | Modify | 2 |
| `src/features/finance/savings.actions.ts` | Modify | 4 |
| `src/features/finance/__tests__/shared-savings.validators.test.ts` | Create | 4 |
| `src/features/finance/recurring.actions.ts` | Create | 8 |
| `src/features/finance/__tests__/recurring.test.ts` | Create | 8 |
| `src/app/finance/recurring/page.tsx` | Create | 8 |
| `src/features/feed/components/PostCard.tsx` | Modify | 6 |
| `src/features/search/actions/search.actions.ts` | Modify | 6 |
| `src/app/explore/tag/[tag]/page.tsx` | Create | 6 |
| `src/features/finance/export.actions.ts` | Create | 9 |
| `src/features/finance/__tests__/export.test.ts` | Create | 9 |
| `src/app/finance/export/route.ts` | Create | 9 |
| `src/app/finance/trends/page.tsx` | Modify | 9 |
| `tests/e2e/gift.spec.ts` | Create | 11 |
| `tests/e2e/hashtag.spec.ts` | Create | 11 |

---

## Task 1: Migration 20 — Gift Points DB

**Files:**
- Create: `sql/migrations/20-phase6-gift-points.sql`
- Modify: `scripts/migrate.sh`

**Interfaces:**
- Produces: `public.gift_points(p_to_user_id uuid, p_amount integer) → void` RPC callable by `authenticated`
- Produces: `public.gift_daily_limit` table tracking per-user daily totals

- [ ] **Step 1: Create migration file**

```sql
-- sql/migrations/20-phase6-gift-points.sql

-- 1. Extend points_ledger reason codes to include gift variants
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_code_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_code_check
  CHECK (reason_code IN (
    'signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved',
    'subscription_points','shop_purchase_points','gift_sent','gift_received'
  ));

-- 2. Extend notifications type to include gift
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow','like','comment','points','referral','finance','todo','shop','gift'));

-- 3. Daily limit tracker (one row per sender, reset when day changes)
CREATE TABLE IF NOT EXISTS public.gift_daily_limit (
  user_id    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  day        date NOT NULL DEFAULT current_date,
  total_sent integer NOT NULL DEFAULT 0
);

-- 4. gift_points() RPC
-- Security: reads auth.uid() internally → safe to GRANT to authenticated
-- Atomicity: both add_points() calls in same transaction — no partial state possible
-- ponytail: daily_limit constant=200, move to config table if product needs runtime adjustment
CREATE OR REPLACE FUNCTION public.gift_points(p_to_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from        uuid := auth.uid();
  v_daily_limit CONSTANT integer := 200;
  v_sent_today  integer;
BEGIN
  IF v_from IS NULL THEN RAISE EXCEPTION 'Yeu cau dang nhap'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'So diem tang phai duong'; END IF;
  IF p_to_user_id = v_from THEN RAISE EXCEPTION 'Khong the tu tang diem cho chinh minh'; END IF;

  -- Upsert daily limit row; reset total_sent if day changed
  INSERT INTO public.gift_daily_limit (user_id, day, total_sent)
  VALUES (v_from, current_date, 0)
  ON CONFLICT (user_id) DO UPDATE
    SET total_sent = CASE
          WHEN gift_daily_limit.day = current_date THEN gift_daily_limit.total_sent
          ELSE 0
        END,
        day = current_date
  RETURNING total_sent INTO v_sent_today;

  IF v_sent_today + p_amount > v_daily_limit THEN
    RAISE EXCEPTION 'Vuot han muc tang diem trong ngay (con lai % diem)', v_daily_limit - v_sent_today;
  END IF;

  PERFORM public.add_points(v_from, -p_amount, 'gift_sent', p_to_user_id);
  PERFORM public.add_points(p_to_user_id, p_amount, 'gift_received', v_from);

  UPDATE public.gift_daily_limit
  SET total_sent = total_sent + p_amount
  WHERE user_id = v_from;

  -- Notify recipient
  INSERT INTO public.notifications (user_id, type, data)
  VALUES (p_to_user_id, 'gift', jsonb_build_object('from_user_id', v_from, 'amount', p_amount));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gift_points(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gift_points(uuid, integer) TO authenticated;
```

- [ ] **Step 2: Register migration in migrate.sh**

Open `scripts/migrate.sh` and add after the `run_sql "sql/migrations/19-referral-analytics.sql"` line:

```bash
run_sql "sql/migrations/20-phase6-gift-points.sql"
```

- [ ] **Step 3: Apply migration**

```bash
./scripts/migrate.sh --docker
```

Expected: no errors, migration completes.

- [ ] **Step 4: Smoke test in psql/Studio**

```sql
-- In Supabase Studio SQL editor (as postgres role):
-- Verify constraint updated
SELECT constraint_name FROM information_schema.table_constraints
  WHERE table_name = 'points_ledger' AND constraint_name = 'points_ledger_reason_code_check';

-- Verify table created
SELECT * FROM public.gift_daily_limit LIMIT 1;

-- Verify function exists
SELECT proname FROM pg_proc WHERE proname = 'gift_points';
```

Expected: all 3 rows return results.

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/20-phase6-gift-points.sql scripts/migrate.sh
git commit -m "feat(db): migration 20 — gift_points RPC + daily limit table"
```

---

## Task 2: Gift Points — Actions + Validator + UI

**Files:**
- Create: `src/features/wallet/actions/gift.actions.ts`
- Create: `src/features/wallet/__tests__/gift.validators.test.ts`
- Modify: `src/lib/validators/finance.ts` (add `giftPointsSchema`)
- Modify: `src/app/u/[username]/page.tsx` (add Gift button + modal)

**Interfaces:**
- Consumes: `gift_points(p_to_user_id, p_amount)` RPC from Task 1
- Consumes: `getSubscriptionStatus()` from `@/features/billing/subscription.actions`
- Produces: `giftPoints(toUserId: string, amount: number): Promise<{ error: string | null }>`

- [ ] **Step 1: Write failing validator test**

Create `src/features/wallet/__tests__/gift.validators.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { giftPointsSchema } from '@/lib/validators/finance'

describe('giftPointsSchema', () => {
  it('rejects zero amount', () => {
    const r = giftPointsSchema.safeParse({ amount: 0 })
    expect(r.success).toBe(false)
  })
  it('rejects negative amount', () => {
    const r = giftPointsSchema.safeParse({ amount: -10 })
    expect(r.success).toBe(false)
  })
  it('rejects amount above daily limit', () => {
    const r = giftPointsSchema.safeParse({ amount: 201 })
    expect(r.success).toBe(false)
  })
  it('accepts valid amount', () => {
    const r = giftPointsSchema.safeParse({ amount: 100 })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/wallet/__tests__/gift.validators.test.ts
```

Expected: FAIL with "giftPointsSchema is not exported".

- [ ] **Step 3: Add validator to finance.ts**

In `src/lib/validators/finance.ts`, append:

```typescript
export const giftPointsSchema = z.object({
  amount: z.number().int().positive('Số điểm phải lớn hơn 0').max(200, 'Tối đa 200 điểm/lần tặng'),
})
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/features/wallet/__tests__/gift.validators.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Create gift action**

Create `src/features/wallet/actions/gift.actions.ts`:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { giftPointsSchema } from '@/lib/validators/finance'

export async function giftPoints(
  toUserId: string,
  rawAmount: unknown
): Promise<{ error: string | null }> {
  const parsed = giftPointsSchema.safeParse({ amount: rawAmount })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // ponytail: cast until supabase gen types regenerates with gift_points def
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('gift_points', {
    p_to_user_id: toUserId,
    p_amount: parsed.data.amount,
  })

  if (error) return { error: error.message }

  revalidatePath('/wallet')
  revalidatePath(`/u`)
  return { error: null }
}
```

- [ ] **Step 6: Add Gift button to profile page**

Open `src/app/u/[username]/page.tsx`. Find where the profile header renders (look for the `display_name` heading or follow/unfollow button area). Add a `GiftPointsButton` client component import and render it next to the existing buttons, passing the profile's `id`.

First, create `src/features/wallet/components/GiftPointsButton.tsx`:

```typescript
'use client'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { giftPoints } from '@/features/wallet/actions/gift.actions'

export function GiftPointsButton({ toUserId }: { toUserId: string }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(10)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await giftPoints(toUserId, amount)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50">
          🎁 Tặng điểm
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-xl w-80 space-y-4">
          <Dialog.Title className="font-bold text-lg">Tặng điểm</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-zinc-600">Số điểm (tối đa 200/ngày)</label>
              <input
                type="number"
                min={1}
                max={200}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Dialog.Close asChild>
                <button type="button" className="px-3 py-1.5 text-sm rounded-lg border">
                  Huỷ
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 text-sm rounded-lg bg-yellow-500 text-white font-medium disabled:opacity-50"
              >
                {loading ? 'Đang gửi...' : 'Tặng'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

Then in `src/app/u/[username]/page.tsx`, import and add `<GiftPointsButton toUserId={profile.id} />` next to the follow button. Only render it when `user.id !== profile.id` (don't show to self — the RPC will also block it, but hide the button too).

- [ ] **Step 7: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/validators/finance.ts \
        src/features/wallet/actions/gift.actions.ts \
        src/features/wallet/__tests__/gift.validators.test.ts \
        src/features/wallet/components/GiftPointsButton.tsx \
        src/app/u/[username]/page.tsx
git commit -m "feat(wallet): gift points — action, validator, UI modal on profile page"
```

---

## Task 3: Migration 21 — Shared Savings Goals DB

**Files:**
- Create: `sql/migrations/21-phase6-shared-savings.sql`
- Modify: `scripts/migrate.sh`

**Interfaces:**
- Produces: `public.savings_goal_members(goal_id, user_id)` table
- Produces: `public.savings_goal_contributions(id, goal_id, user_id, amount, created_at)` table
- Produces: `public.is_goal_member(p_goal_id uuid) → boolean` function
- Produces: extended `check_savings_goal_achieved()` that awards all members 30pts

- [ ] **Step 1: Create migration file**

```sql
-- sql/migrations/21-phase6-shared-savings.sql

-- 1. Membership table
CREATE TABLE IF NOT EXISTS public.savings_goal_members (
  goal_id uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, user_id)
);

-- 2. Contributions table (manual logging, not real money transfer)
CREATE TABLE IF NOT EXISTS public.savings_goal_contributions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id    uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount     integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Membership check — SECURITY DEFINER to avoid RLS infinite recursion
--    (same pattern as is_admin() — never write EXISTS directly in policy of tables
--    that reference each other: savings_goals ↔ savings_goal_members ↔ savings_goal_contributions)
CREATE OR REPLACE FUNCTION public.is_goal_member(p_goal_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.savings_goal_members
    WHERE goal_id = p_goal_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.savings_goals
    WHERE id = p_goal_id AND user_id = auth.uid()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_goal_member(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_goal_member(uuid) TO authenticated;

-- 4. RLS
ALTER TABLE public.savings_goal_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goal_contributions ENABLE ROW LEVEL SECURITY;

-- savings_goals already has RLS from migration 08d — add member-visible policy alongside owner policy
CREATE POLICY "goals_select_member"
  ON public.savings_goals FOR SELECT
  USING (public.is_goal_member(id));

CREATE POLICY "members_select_member"
  ON public.savings_goal_members FOR SELECT
  USING (public.is_goal_member(goal_id));

CREATE POLICY "members_insert_owner"
  ON public.savings_goal_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.savings_goals WHERE id = goal_id AND user_id = auth.uid())
  );

CREATE POLICY "contributions_select_member"
  ON public.savings_goal_contributions FOR SELECT
  USING (public.is_goal_member(goal_id));

CREATE POLICY "contributions_insert_member"
  ON public.savings_goal_contributions FOR INSERT
  WITH CHECK (public.is_goal_member(goal_id) AND user_id = auth.uid());

GRANT SELECT ON public.savings_goal_members TO authenticated;
GRANT SELECT, INSERT ON public.savings_goal_contributions TO authenticated;

-- 5. Trigger: sync contribution amount to goal's current_amount
CREATE OR REPLACE FUNCTION public.sync_goal_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.savings_goals
  SET current_amount = current_amount + NEW.amount
  WHERE id = NEW.goal_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_goal_amount
AFTER INSERT ON public.savings_goal_contributions
FOR EACH ROW EXECUTE FUNCTION public.sync_goal_amount();

-- 6. Extend check_savings_goal_achieved() to award points to ALL members
--    (owner + invited members) when goal is reached
CREATE OR REPLACE FUNCTION public.check_savings_goal_achieved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member record;
BEGIN
  IF NEW.current_amount >= NEW.target_amount
     AND OLD.achieved_at IS NULL
     AND NEW.achieved_at IS NULL THEN
    NEW.achieved_at := now();
    -- Award owner
    PERFORM public.add_points(NEW.user_id, 30, 'savings_goal_achieved', NEW.id);
    -- Award invited members (if any)
    FOR v_member IN
      SELECT user_id FROM public.savings_goal_members WHERE goal_id = NEW.id
    LOOP
      PERFORM public.add_points(v_member.user_id, 30, 'savings_goal_achieved', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
-- Trigger already exists from migration 08d — function replacement is enough
```

- [ ] **Step 2: Register migration in migrate.sh**

After `run_sql "sql/migrations/20-phase6-gift-points.sql"` add:

```bash
run_sql "sql/migrations/21-phase6-shared-savings.sql"
```

- [ ] **Step 3: Apply migration**

```bash
./scripts/migrate.sh --docker
```

Expected: no errors.

- [ ] **Step 4: Smoke test**

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('savings_goal_members', 'savings_goal_contributions');

-- Verify function exists
SELECT proname FROM pg_proc WHERE proname = 'is_goal_member';
```

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/21-phase6-shared-savings.sql scripts/migrate.sh
git commit -m "feat(db): migration 21 — shared savings goals (3 tables, is_goal_member, extended trigger)"
```

---

## Task 4: Shared Savings Goals — Actions + UI

**Files:**
- Modify: `src/features/finance/savings.actions.ts`
- Modify: `src/lib/validators/finance.ts`
- Create: `src/features/finance/__tests__/shared-savings.validators.test.ts`

**Interfaces:**
- Consumes: `savings_goal_members`, `savings_goal_contributions` tables + `is_goal_member()` from Task 3
- Produces: `inviteMember(goalId: string, username: string): Promise<{ error: string | null }>`
- Produces: `contributeToGoal(goalId: string, amount: number): Promise<{ error: string | null }>`
- Produces: `listGoalMembers(goalId: string): Promise<{ members: Member[] }>`

- [ ] **Step 1: Write failing validator tests**

Create `src/features/finance/__tests__/shared-savings.validators.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { goalContributionSchema } from '@/lib/validators/finance'

describe('goalContributionSchema', () => {
  it('rejects zero amount', () => {
    const r = goalContributionSchema.safeParse({ amount: 0 })
    expect(r.success).toBe(false)
  })
  it('rejects negative amount', () => {
    const r = goalContributionSchema.safeParse({ amount: -100 })
    expect(r.success).toBe(false)
  })
  it('accepts valid amount', () => {
    const r = goalContributionSchema.safeParse({ amount: 500000 })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/features/finance/__tests__/shared-savings.validators.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Add validator**

In `src/lib/validators/finance.ts`, append:

```typescript
export const goalContributionSchema = z.object({
  amount: z.number().int().positive('Khoản góp phải lớn hơn 0'),
})
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run src/features/finance/__tests__/shared-savings.validators.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add actions to savings.actions.ts**

Append to `src/features/finance/savings.actions.ts`:

```typescript
export async function inviteMember(
  goalId: string,
  username: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Verify caller is goal owner
  const { data: goal } = await supabase
    .from('savings_goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()
  if (!goal) return { error: 'Không có quyền mời thành viên' }

  // Resolve username to user_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()
  if (!profile) return { error: 'Không tìm thấy người dùng' }
  if (profile.id === user.id) return { error: 'Không thể mời chính mình' }

  const { error } = await supabase
    .from('savings_goal_members')
    .insert({ goal_id: goalId, user_id: profile.id })

  if (error) {
    if (error.code === '23505') return { error: 'Người này đã là thành viên' }
    return { error: error.message }
  }

  revalidatePath(`/finance/goals/${goalId}`)
  return { error: null }
}

export async function contributeToGoal(
  goalId: string,
  rawAmount: unknown
): Promise<{ error: string | null }> {
  const parsed = goalContributionSchema.safeParse({ amount: rawAmount })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase
    .from('savings_goal_contributions')
    .insert({ goal_id: goalId, user_id: user.id, amount: parsed.data.amount })

  if (error) return { error: error.message }

  revalidatePath(`/finance/goals/${goalId}`)
  return { error: null }
}

export async function listGoalMembers(goalId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('savings_goal_members')
    .select('user_id, profiles(display_name, avatar_url, username)')
    .eq('goal_id', goalId)
  return { members: data ?? [] }
}
```

Also add `goalContributionSchema` to the import from `@/lib/validators/finance` at the top of the file.

- [ ] **Step 6: Add invite/contribute UI to savings goal detail page**

Find the existing savings goal detail page (likely `src/app/finance/goals/[id]/page.tsx` or similar — check with `find src/app -name "*.tsx" | xargs grep -l "savings_goals" | head -5`).

Add a "Thành viên" section below the existing progress bar:

```tsx
{/* Members section */}
<section className="space-y-3">
  <h2 className="font-semibold text-sm text-zinc-600 uppercase tracking-wide">Thành viên</h2>
  {/* List existing members */}
  <MemberList goalId={goal.id} members={members} isOwner={goal.user_id === user.id} />
  {/* Contribute form (all members) */}
  <ContributeForm goalId={goal.id} />
</section>
```

Build `MemberList` and `ContributeForm` as Client Components in `src/features/finance/components/`. Each component calls the actions from Step 5 on submit. Pattern follows existing `SavingsGoalCard` or similar component in the feature.

- [ ] **Step 7: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/features/finance/savings.actions.ts \
        src/lib/validators/finance.ts \
        src/features/finance/__tests__/shared-savings.validators.test.ts \
        src/features/finance/components/
git commit -m "feat(finance): shared savings goals — invite, contribute actions + UI"
```

---

## Task 5: Migration 22 — Hashtags DB

**Files:**
- Create: `sql/migrations/22-phase6-hashtags.sql`
- Modify: `scripts/migrate.sh`

**Interfaces:**
- Produces: `posts.tags text[]` column populated automatically by `trg_extract_hashtags` trigger
- Produces: GIN index `posts_tags_idx` for `tags @> array[tag]` queries

- [ ] **Step 1: Create migration file**

```sql
-- sql/migrations/22-phase6-hashtags.sql

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Extracts #hashtags from post content into tags[]
-- Rules: lowercase, deduplicated, max 10 tags per post, preserves Vietnamese diacritics
-- Tested: #DuLich and #dulich → {dulich}; #ăn_uống preserved correctly
CREATE OR REPLACE FUNCTION public.extract_hashtags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tags text[];
BEGIN
  SELECT COALESCE(
    (SELECT array_agg(DISTINCT lower(m[1]))
     FROM regexp_matches(NEW.content, '#([[:alnum:]_]+)', 'g') AS m),
    '{}'
  ) INTO v_tags;

  -- Cap at 10 tags to prevent spam
  IF array_length(v_tags, 1) > 10 THEN
    v_tags := v_tags[1:10];
  END IF;

  NEW.tags := v_tags;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_extract_hashtags
BEFORE INSERT OR UPDATE OF content ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.extract_hashtags();

CREATE INDEX IF NOT EXISTS posts_tags_idx ON public.posts USING GIN(tags);
```

- [ ] **Step 2: Register in migrate.sh**

After `run_sql "sql/migrations/21-phase6-shared-savings.sql"`:

```bash
run_sql "sql/migrations/22-phase6-hashtags.sql"
```

- [ ] **Step 3: Apply migration**

```bash
./scripts/migrate.sh --docker
```

- [ ] **Step 4: Smoke test**

```sql
-- Verify column added
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'posts' AND column_name = 'tags';

-- Test trigger works
INSERT INTO public.posts (user_id, content)
VALUES (auth.uid(), 'Test #Phase6 #ăn_uống great #Phase6')
RETURNING tags;
-- Expected: {phase6, ăn_uống}  (deduped, lowercased)
```

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/22-phase6-hashtags.sql scripts/migrate.sh
git commit -m "feat(db): migration 22 — posts.tags column, extract_hashtags trigger, GIN index"
```

---

## Task 6: Hashtag UI + Explore Route

**Files:**
- Modify: `src/features/feed/components/PostCard.tsx`
- Modify: `src/features/search/actions/search.actions.ts`
- Create: `src/app/explore/tag/[tag]/page.tsx`

**Interfaces:**
- Consumes: `posts.tags` from Task 5
- Produces: `searchByTag(tag: string): Promise<SearchPost[]>` in search actions
- Produces: `/explore/tag/[tag]` route rendering posts for that tag

- [ ] **Step 1: Render tags in PostCard**

In `src/features/feed/components/PostCard.tsx`, find the line with `post.content` render (currently around line 32). After the content paragraph, add:

```tsx
{post.tags && post.tags.length > 0 && (
  <div className="flex flex-wrap gap-1">
    {post.tags.map(tag => (
      <Link
        key={tag}
        href={`/explore/tag/${encodeURIComponent(tag)}`}
        className="text-xs text-blue-600 hover:underline"
      >
        #{tag}
      </Link>
    ))}
  </div>
)}
```

Add `import Link from 'next/link'` at top if not already present.

Update the `post` prop type to include `tags: string[] | null`. Check the existing `Post` type in the feed feature and add `tags` there too.

- [ ] **Step 2: Add searchByTag action**

In `src/features/search/actions/search.actions.ts`, append:

```typescript
export async function searchByTag(tag: string): Promise<SearchPost[]> {
  if (!tag) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('id, content, created_at, tags, profiles(display_name, avatar_url)')
    .eq('hidden', false)
    .is('deleted_at', null)
    .contains('tags', [tag.toLowerCase()])
    .order('created_at', { ascending: false })
    .limit(30)
  return (data ?? []) as SearchPost[]
}
```

Add `tags: string[] | null` to the `SearchPost` type at the top of the file.

- [ ] **Step 3: Create tag explore page**

Create `src/app/explore/tag/[tag]/page.tsx`:

```typescript
import { searchByTag } from '@/features/search/actions/search.actions'
import { PostCard } from '@/features/feed/components/PostCard'

interface Props {
  params: Promise<{ tag: string }>
}

export default async function TagExplorePage({ params }: Props) {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  const posts = await searchByTag(decoded)

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">#{decoded}</h1>
      <p className="text-sm text-zinc-500">{posts.length} bài đăng</p>
      {posts.length === 0 ? (
        <p className="text-zinc-400 text-sm">Chưa có bài đăng nào với hashtag này.</p>
      ) : (
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/features/feed/components/PostCard.tsx \
        src/features/search/actions/search.actions.ts \
        src/app/explore/tag/
git commit -m "feat(feed,search): hashtag links in PostCard + /explore/tag/[tag] route"
```

---

## Task 7: Migration 23 — Recurring Transactions DB

**Files:**
- Create: `sql/migrations/23-phase6-recurring-tx.sql`
- Modify: `scripts/migrate.sh`

**Interfaces:**
- Produces: `public.recurring_transactions` table (owner-only RLS)
- Produces: `public.run_recurring_transactions() → integer` scheduled by pg_cron at 01:00 UTC daily
- **Critical formula:** `(start_date + (occurrences_run || ' months')::interval)::date` — NOT additive from previous run date (avoids day-31 drift bug documented in KE-HOACH §3.4)

- [ ] **Step 1: Verify pg_cron is enabled**

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Expected: 1 row. If 0 rows, enable via Supabase Studio → Database → Extensions → pg_cron.

- [ ] **Step 2: Create migration file**

```sql
-- sql/migrations/23-phase6-recurring-tx.sql

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id     uuid REFERENCES public.categories(id),
  type            text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_vnd      integer NOT NULL CHECK (amount_vnd > 0),
  note            text,
  start_date      date NOT NULL,
  occurrences_run integer NOT NULL DEFAULT 0 CHECK (occurrences_run >= 0),
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- IMPORTANT: start_date is immutable — never update it after creation.
-- next_run is always: (start_date + (occurrences_run || ' months')::interval)::date
-- NOT: previous_next_run + interval (would cause permanent date drift for day 29-31)

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring_tx_owner" ON public.recurring_transactions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_transactions TO authenticated;

-- run_recurring_transactions: processes all due recurring transactions
-- REVOKED from authenticated/anon — called only by pg_cron (service context)
CREATE OR REPLACE FUNCTION public.run_recurring_transactions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT * FROM public.recurring_transactions
    WHERE active
      AND (start_date + (occurrences_run || ' months')::interval)::date <= current_date
  LOOP
    INSERT INTO public.transactions (user_id, category_id, type, amount_vnd, note, occurred_at)
    VALUES (r.user_id, r.category_id, r.type, r.amount_vnd, r.note, current_date);

    UPDATE public.recurring_transactions
    SET occurrences_run = occurrences_run + 1
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_recurring_transactions() FROM public, anon, authenticated;

-- Schedule daily at 01:00 UTC
SELECT cron.schedule(
  'run-recurring-transactions-daily',
  '0 1 * * *',
  $$SELECT public.run_recurring_transactions();$$
);
```

- [ ] **Step 3: Register in migrate.sh**

After `run_sql "sql/migrations/22-phase6-hashtags.sql"`:

```bash
run_sql "sql/migrations/23-phase6-recurring-tx.sql"
```

- [ ] **Step 4: Apply migration**

```bash
./scripts/migrate.sh --docker
```

- [ ] **Step 5: Verify cron scheduled**

```sql
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'run-recurring-transactions-daily';
```

Expected: 1 row with `0 1 * * *`.

- [ ] **Step 6: Commit**

```bash
git add sql/migrations/23-phase6-recurring-tx.sql scripts/migrate.sh
git commit -m "feat(db): migration 23 — recurring_transactions + run_recurring_transactions() + pg_cron"
```

---

## Task 8: Recurring Transactions — Actions + UI

**Files:**
- Create: `src/features/finance/recurring.actions.ts`
- Modify: `src/lib/validators/finance.ts`
- Create: `src/features/finance/__tests__/recurring.test.ts`
- Create: `src/app/finance/recurring/page.tsx`

**Interfaces:**
- Consumes: `recurring_transactions` table from Task 7
- Produces: `createRecurring(raw)`, `listRecurring()`, `toggleRecurring(id)`, `deleteRecurring(id)`

- [ ] **Step 1: Write failing test**

Create `src/features/finance/__tests__/recurring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { recurringSchema } from '@/lib/validators/finance'

describe('recurringSchema', () => {
  it('rejects zero amount', () => {
    const r = recurringSchema.safeParse({ type: 'expense', amount_vnd: 0, start_date: '2026-09-01' })
    expect(r.success).toBe(false)
  })
  it('rejects invalid type', () => {
    const r = recurringSchema.safeParse({ type: 'transfer', amount_vnd: 100000, start_date: '2026-09-01' })
    expect(r.success).toBe(false)
  })
  it('rejects invalid date format', () => {
    const r = recurringSchema.safeParse({ type: 'expense', amount_vnd: 100000, start_date: '01-09-2026' })
    expect(r.success).toBe(false)
  })
  it('accepts valid recurring', () => {
    const r = recurringSchema.safeParse({ type: 'expense', amount_vnd: 3000000, start_date: '2026-09-31' })
    expect(r.success).toBe(true)
  })
})

describe('date formula correctness', () => {
  // Pure logic test: verify formula avoids day-31 drift
  it('day-31 formula: start_date + N months (not additive)', () => {
    // Simulate what PostgreSQL does: always add from start_date
    function nextRunDate(startDate: string, occurrencesRun: number): string {
      const d = new Date(startDate)
      d.setMonth(d.getMonth() + occurrencesRun)
      return d.toISOString().slice(0, 10)
    }
    // Jan 31 + 1 month = Feb 28 (or 29), then + another month from Jan 31 + 2 = Mar 31
    const start = '2026-01-31'
    expect(nextRunDate(start, 1)).toBe('2026-02-28') // or 29 in leap year
    expect(nextRunDate(start, 2)).toBe('2026-03-31') // back to 31, not stuck at 28
    expect(nextRunDate(start, 3)).toBe('2026-04-30')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run src/features/finance/__tests__/recurring.test.ts
```

Expected: FAIL on `recurringSchema` import.

- [ ] **Step 3: Add validator**

In `src/lib/validators/finance.ts`, append:

```typescript
export const recurringSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount_vnd: z.number().int().positive('Số tiền phải lớn hơn 0'),
  category_id: z.string().uuid().optional(),
  note: z.string().max(200).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải ở dạng YYYY-MM-DD'),
})
```

- [ ] **Step 4: Run to verify tests pass**

```bash
npx vitest run src/features/finance/__tests__/recurring.test.ts
```

Expected: PASS (all tests including the date formula test).

- [ ] **Step 5: Create recurring actions**

Create `src/features/finance/recurring.actions.ts`:

```typescript
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { recurringSchema } from '@/lib/validators/finance'

export async function createRecurring(raw: unknown): Promise<{ error: string | null }> {
  const parsed = recurringSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('recurring_transactions').insert({
    user_id: user.id,
    type: parsed.data.type,
    amount_vnd: parsed.data.amount_vnd,
    category_id: parsed.data.category_id ?? null,
    note: parsed.data.note ?? null,
    start_date: parsed.data.start_date,
  })

  if (error) return { error: error.message }
  revalidatePath('/finance/recurring')
  return { error: null }
}

export async function listRecurring() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('recurring_transactions')
    .select('*, categories(name, icon)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function toggleRecurring(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data } = await supabase
    .from('recurring_transactions')
    .select('active')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!data) return { error: 'Không tìm thấy giao dịch' }

  const { error } = await supabase
    .from('recurring_transactions')
    .update({ active: !data.active })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/finance/recurring')
  return { error: null }
}

export async function deleteRecurring(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/finance/recurring')
  return { error: null }
}
```

- [ ] **Step 6: Create recurring page**

Create `src/app/finance/recurring/page.tsx`:

```typescript
import { listRecurring } from '@/features/finance/recurring.actions'
import { RecurringList } from '@/features/finance/components/RecurringList'
import Link from 'next/link'

export default async function RecurringPage() {
  const items = await listRecurring()
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Giao dịch định kỳ</h1>
        <Link
          href="/finance/recurring/new"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          + Thêm mới
        </Link>
      </div>
      <RecurringList items={items} />
    </div>
  )
}
```

Build `RecurringList` as a Client Component in `src/features/finance/components/RecurringList.tsx` that renders each item with a toggle (calls `toggleRecurring`) and delete button (calls `deleteRecurring`). Build `src/app/finance/recurring/new/page.tsx` as a form page calling `createRecurring`.

Add a link to `/finance/recurring` from the `/finance` page nav (alongside Budgets, Mục tiêu).

- [ ] **Step 7: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/features/finance/recurring.actions.ts \
        src/features/finance/__tests__/recurring.test.ts \
        src/lib/validators/finance.ts \
        src/features/finance/components/RecurringList.tsx \
        src/app/finance/recurring/
git commit -m "feat(finance): recurring transactions — actions, validator, management UI"
```

---

## Task 9: Premium Export (CSV + PDF)

**Files:**
- Create: `src/features/finance/export.actions.ts`
- Create: `src/features/finance/__tests__/export.test.ts`
- Create: `src/app/finance/export/route.ts`
- Modify: `src/app/finance/trends/page.tsx`

**Interfaces:**
- Consumes: `listTransactions(month)` from `transaction.actions.ts`
- Consumes: `getSubscriptionStatus()` from `@/features/billing/subscription.actions`
- Produces: GET `/finance/export?month=YYYY-MM&format=csv|pdf` route handler

- [ ] **Step 1: Install PDF library**

```bash
npm install @react-pdf/renderer
```

- [ ] **Step 2: Write failing test**

Create `src/features/finance/__tests__/export.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildCsvString } from '@/features/finance/export.actions'

describe('buildCsvString', () => {
  it('produces correct CSV headers', () => {
    const csv = buildCsvString([])
    expect(csv).toBe('Ngày,Loại,Danh mục,Số tiền (VND),Ghi chú\n')
  })

  it('produces correct rows', () => {
    const tx = [{
      occurred_at: '2026-09-01',
      type: 'expense' as const,
      categories: { name: 'Ăn uống', icon: '🍜', type: 'expense' },
      amount_vnd: 50000,
      note: 'Phở',
    }]
    const csv = buildCsvString(tx as Parameters<typeof buildCsvString>[0])
    expect(csv).toContain('2026-09-01,expense,Ăn uống,50000,Phở')
  })

  it('escapes commas in note', () => {
    const tx = [{
      occurred_at: '2026-09-01',
      type: 'income' as const,
      categories: null,
      amount_vnd: 1000000,
      note: 'Lương, thưởng',
    }]
    const csv = buildCsvString(tx as Parameters<typeof buildCsvString>[0])
    expect(csv).toContain('"Lương, thưởng"')
  })
})
```

- [ ] **Step 3: Run to verify it fails**

```bash
npx vitest run src/features/finance/__tests__/export.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Create export actions**

Create `src/features/finance/export.actions.ts`:

```typescript
// Not 'use server' — buildCsvString is a pure helper exported for testing
import { listTransactions } from '@/features/finance/transaction.actions'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'

type Tx = Awaited<ReturnType<typeof listTransactions>>['transactions'][number]

function escapeCell(val: string | null | undefined): string {
  const s = val ?? ''
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsvString(transactions: Tx[]): string {
  const header = 'Ngày,Loại,Danh mục,Số tiền (VND),Ghi chú\n'
  const rows = transactions.map(tx => [
    tx.occurred_at,
    tx.type,
    tx.categories?.name ?? '',
    tx.amount_vnd,
    escapeCell(tx.note),
  ].join(','))
  return header + rows.join('\n') + (rows.length > 0 ? '\n' : '')
}
```

- [ ] **Step 5: Run to verify tests pass**

```bash
npx vitest run src/features/finance/__tests__/export.test.ts
```

Expected: PASS.

- [ ] **Step 6: Create export route handler**

Create `src/app/finance/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { listTransactions } from '@/features/finance/transaction.actions'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'
import { buildCsvString } from '@/features/finance/export.actions'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinanceReportPdf } from '@/features/finance/components/FinanceReportPdf'

export async function GET(req: NextRequest) {
  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    return NextResponse.json({ error: 'premium_required' }, { status: 403 })
  }

  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const format = req.nextUrl.searchParams.get('format') ?? 'csv'
  const { transactions, totalIncome, totalExpense } = await listTransactions(month)

  if (format === 'pdf') {
    const buffer = await renderToBuffer(
      FinanceReportPdf({ transactions, totalIncome, totalExpense, month })
    )
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bao-cao-${month}.pdf"`,
      },
    })
  }

  const csv = buildCsvString(transactions)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bao-cao-${month}.csv"`,
    },
  })
}
```

Create `src/features/finance/components/FinanceReportPdf.tsx`:

```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { listTransactions } from '@/features/finance/transaction.actions'

type Props = {
  transactions: Awaited<ReturnType<typeof listTransactions>>['transactions']
  totalIncome: number
  totalExpense: number
  month: string
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#e5e7eb', paddingVertical: 4 },
  cell: { flex: 1 },
  header: { fontWeight: 'bold', backgroundColor: '#f3f4f6', paddingVertical: 6 },
  summary: { marginTop: 16, padding: 12, backgroundColor: '#f9fafb' },
})

export function FinanceReportPdf({ transactions, totalIncome, totalExpense, month }: Props) {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫'

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Báo cáo thu chi — {month}</Text>

        <View style={[s.row, s.header]}>
          <Text style={s.cell}>Ngày</Text>
          <Text style={s.cell}>Loại</Text>
          <Text style={s.cell}>Danh mục</Text>
          <Text style={{ ...s.cell, textAlign: 'right' }}>Số tiền</Text>
        </View>

        {transactions.map(tx => (
          <View key={tx.id} style={s.row}>
            <Text style={s.cell}>{tx.occurred_at}</Text>
            <Text style={s.cell}>{tx.type === 'income' ? 'Thu' : 'Chi'}</Text>
            <Text style={s.cell}>{tx.categories?.name ?? '—'}</Text>
            <Text style={{ ...s.cell, textAlign: 'right' }}>{fmt(tx.amount_vnd)}</Text>
          </View>
        ))}

        <View style={s.summary}>
          <Text>Tổng thu: {fmt(totalIncome)}</Text>
          <Text>Tổng chi: {fmt(totalExpense)}</Text>
          <Text>Tiết kiệm: {fmt(totalIncome - totalExpense)}</Text>
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 7: Add export button to trends page**

In `src/app/finance/trends/page.tsx`, after the `TrendChart` section, add (inside the Premium-success render branch, before the closing `</div>`):

```tsx
{/* Export — Premium only, same gate already passed above */}
<div className="flex gap-2">
  <a
    href={`/finance/export?format=csv&month=${new Date().toISOString().slice(0, 7)}`}
    className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
  >
    ↓ Xuất CSV
  </a>
  <a
    href={`/finance/export?format=pdf&month=${new Date().toISOString().slice(0, 7)}`}
    className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
  >
    ↓ Xuất PDF
  </a>
</div>
```

For Free users (the existing premium_required branch), the export buttons are not shown — the whole premium content block is already hidden behind the upgrade prompt.

- [ ] **Step 8: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/features/finance/export.actions.ts \
        src/features/finance/__tests__/export.test.ts \
        src/features/finance/components/FinanceReportPdf.tsx \
        src/app/finance/export/route.ts \
        src/app/finance/trends/page.tsx \
        package.json package-lock.json
git commit -m "feat(finance): Premium export — CSV route + PDF (@react-pdf/renderer)"
```

---

## Task 10: Migration 24 Placeholder

**Files:**
- Create: `sql/migrations/24-phase6-export.sql`
- Modify: `scripts/migrate.sh`

Export is app-layer only (no new tables). Migration 24 is a documented no-op placeholder to keep the numbering consistent with the spec.

- [ ] **Step 1: Create placeholder migration**

```sql
-- sql/migrations/24-phase6-export.sql
-- Phase 6 export feature: no DB changes required.
-- This file exists to keep migration numbering consistent with the Phase 6 spec.
```

- [ ] **Step 2: Register in migrate.sh**

After `run_sql "sql/migrations/23-phase6-recurring-tx.sql"`:

```bash
run_sql "sql/migrations/24-phase6-export.sql"
```

- [ ] **Step 3: Apply**

```bash
./scripts/migrate.sh --docker
```

- [ ] **Step 4: Commit**

```bash
git add sql/migrations/24-phase6-export.sql scripts/migrate.sh
git commit -m "chore(db): migration 24 placeholder — export is app-layer only"
```

---

## Task 11: E2E Tests

**Files:**
- Create: `tests/e2e/gift.spec.ts`
- Create: `tests/e2e/hashtag.spec.ts`

**Interfaces:**
- Consumes: `loginAs` helper from `tests/e2e/helpers/auth`
- All app features from Tasks 1–9

- [ ] **Step 1: Write gift E2E test**

Create `tests/e2e/gift.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const senderEmail = `e2e+gift+sender+${Date.now()}@example.com`
const receiverEmail = `e2e+gift+receiver+${Date.now()}@example.com`

test.describe('gift points flow', () => {
  test('sender gifts points → recipient balance increases', async ({ browser }) => {
    // Two separate browser contexts = two sessions
    const senderCtx = await browser.newContext()
    const receiverCtx = await browser.newContext()
    const senderPage = await senderCtx.newPage()
    const receiverPage = await receiverCtx.newPage()

    await loginAs(senderPage, senderEmail)
    await loginAs(receiverPage, receiverEmail)

    // Get receiver's username (needed to navigate to their profile)
    await receiverPage.goto('/profile')
    const username = await receiverPage.locator('[data-testid="username"]').textContent()
    expect(username).toBeTruthy()

    // Get receiver's balance before
    await receiverPage.goto('/wallet')
    const balanceBefore = await receiverPage.locator('[data-testid="balance"]').textContent()

    // Sender navigates to receiver's profile and gifts points
    await senderPage.goto(`/u/${username}`)
    await senderPage.getByText('Tặng điểm').click()
    await senderPage.locator('input[type="number"]').fill('10')
    await senderPage.getByText('Tặng').click()

    // Wait for success (modal closes)
    await expect(senderPage.getByText('Tặng điểm')).toBeVisible({ timeout: 5000 })

    // Receiver balance should increase
    await receiverPage.reload()
    const balanceAfter = await receiverPage.locator('[data-testid="balance"]').textContent()
    expect(balanceAfter).not.toBe(balanceBefore)

    await senderCtx.close()
    await receiverCtx.close()
  })
})
```

- [ ] **Step 2: Write hashtag E2E test**

Create `tests/e2e/hashtag.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const email = `e2e+hashtag+${Date.now()}@example.com`
const tag = `e2etest${Date.now()}`

test.describe('hashtag flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, email)
  })

  test('post with hashtag → tag link appears → explore page shows post', async ({ page }) => {
    // Create a post with a unique hashtag
    await page.goto('/feed')
    await page.locator('[data-testid="post-composer"]').click()
    await page.locator('textarea').fill(`Testing hashtags #${tag}`)
    await page.getByText('Đăng').click()

    // Tag link should appear in the new post
    await expect(page.locator(`a[href="/explore/tag/${tag}"]`)).toBeVisible({ timeout: 5000 })

    // Navigate to explore page for this tag
    await page.click(`a[href="/explore/tag/${tag}"]`)
    await page.waitForURL(`/explore/tag/${tag}`)

    // Post should appear on explore page
    await expect(page.locator(`text=#${tag}`).first()).toBeVisible()
    await expect(page.locator(`text=Testing hashtags`)).toBeVisible()
  })
})
```

- [ ] **Step 3: Run all unit tests to confirm nothing broken**

```bash
npx vitest run
```

Expected: all existing tests + 4 new test suites pass.

- [ ] **Step 4: Run E2E (manual gate — requires running app)**

```bash
./scripts/dev.sh --no-migrate &
npx playwright test tests/e2e/gift.spec.ts tests/e2e/hashtag.spec.ts
```

Expected: 2 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/gift.spec.ts tests/e2e/hashtag.spec.ts
git commit -m "test(e2e): gift points flow + hashtag explore flow (2 new tests)"
```

---

## Task 12: Final Polish + PR

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run && npx tsc --noEmit && npm run lint
```

Expected: all pass, no lint errors.

- [ ] **Step 2: Manual smoke test checklist**

Start app: `./scripts/dev.sh --no-migrate`

- [ ] Gift points: visit `/u/[any-user]`, gift 10 pts, verify balance on `/wallet`
- [ ] Gift self-block: try to visit your own profile, gift button should be hidden
- [ ] Daily limit: gift 200pts in one day, next gift should show error with remaining amount
- [ ] Shared savings: create goal, invite a friend by username, contribute, verify `current_amount` updates
- [ ] Hashtag: post `#smoke_test`, click tag link, verify explore page shows post
- [ ] Tag max: post with 11 tags, verify only 10 stored
- [ ] Recurring: create a monthly recurring expense with start date today, verify it appears in list
- [ ] Export CSV: go to `/finance/trends` (as Premium), click "Xuất CSV", verify file downloads
- [ ] Export PDF: click "Xuất PDF", verify PDF opens/downloads
- [ ] Export gate: log in as free user, GET `/finance/export?format=csv&month=2026-09` → 403

- [ ] **Step 3: Update EVALUATION.md**

Add Phase 6 completion status when all smoke tests pass:

```markdown
## Phase 6 — Feature Connections (Complete ✅)
- Sprint 0–1: Gift Points — `gift_points()` RPC + daily limit (migration 20)
- Sprint 2–3: Shared Savings Goals — 3 tables + `is_goal_member()` (migration 21)
- Sprint 4–5: Hashtags — `posts.tags` + GIN index + `/explore/tag/[tag]` (migration 22)
- Sprint 6–7: Recurring Transactions — `recurring_transactions` + pg_cron (migration 23)
- Sprint 8–9: Premium Export — CSV + PDF (`@react-pdf/renderer`)
- Tests: ~44 Vitest unit tests, ~12 Playwright E2E tests
```

- [ ] **Step 4: Final commit + PR**

```bash
git add docs/EVALUATION.md
git commit -m "docs: Phase 6 complete — 5 features, migrations 20-24, 12 E2E tests"
git push origin feat/phase6-features
gh pr create --title "feat: Phase 6 — Cross-module feature connections" \
  --body "Implements 5 features connecting Social × Fintech × SaaS modules.

## Features
- **Gift Points**: \`gift_points()\` RPC with 200pt/day limit, modal on profile pages
- **Shared Savings Goals**: 3 tables, \`is_goal_member()\` SECURITY DEFINER, extended achievement trigger
- **Hashtags**: \`posts.tags\` auto-extracted, GIN index, \`/explore/tag/[tag]\` route
- **Recurring Transactions**: \`recurring_transactions\` table, pg_cron daily runner at 01:00 UTC
- **Premium Export**: CSV (native Response) + PDF (@react-pdf/renderer), gated by \`getSubscriptionStatus()\`

## Migrations
20 → 21 → 22 → 23 → 24 (placeholder)

## Tests
~44 Vitest unit + ~12 Playwright E2E

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01R8pVJ4p1DnQvB2YQfX4Zmc"
```
