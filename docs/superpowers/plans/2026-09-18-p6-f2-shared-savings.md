# Phase 6 / Feature 2 — Shared Savings Goals

> Ref: `docs/superpowers/specs/2026-09-06-phase6-features-design.md` §Feature 2  
> Depends on: Migration 20 applied (Feature 1 complete)  
> Branch: `feat/phase6-features`

**Goal:** Chủ sở hữu mục tiêu tiết kiệm có thể mời thành viên. Mọi thành viên đều đóng góp. Khi mục tiêu đạt, tất cả thành viên nhận 30 điểm.

---

## Preconditions

- Migration 20 đã apply
- `savings_goals` table tồn tại với cột `user_id` (owner) — xác nhận từ `08d-phase2-savings.sql`
- `public.add_points()` function tồn tại

---

## Task 3: Migration 21 — Shared Savings Goals DB

**Files:**
- Create: `sql/migrations/21-phase6-shared-savings.sql`
- Modify: `scripts/migrate.sh`

**Produces:**
- `savings_goal_members(goal_id, user_id)` — membership table
- `savings_goal_contributions(id, goal_id, user_id, amount)` — contribution log
- `is_goal_member(p_goal_id) → boolean` — SECURITY DEFINER (tránh RLS infinite recursion)
- `sync_goal_amount()` trigger — cộng dồn vào `savings_goals.current_amount`
- Extended `check_savings_goal_achieved()` — trao điểm cho tất cả thành viên

- [ ] **Step 1: Tạo migration file**

```sql
-- sql/migrations/21-phase6-shared-savings.sql

-- 1. Membership table
CREATE TABLE IF NOT EXISTS public.savings_goal_members (
  goal_id uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, user_id)
);

-- 2. Contributions table
CREATE TABLE IF NOT EXISTS public.savings_goal_contributions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id    uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount     integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. is_goal_member() — SECURITY DEFINER để tránh RLS infinite recursion
--    (cùng pattern với is_admin() — không dùng EXISTS trực tiếp trong policy
--    của bảng tham chiếu lẫn nhau)
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

-- savings_goals đã có RLS từ 08d — thêm member-visible policy song song
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

-- 5. Trigger sync contribution → current_amount
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

-- 6. Extend check_savings_goal_achieved() — trao điểm cho owner + tất cả members
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
    PERFORM public.add_points(NEW.user_id, 30, 'savings_goal_achieved', NEW.id);
    FOR v_member IN
      SELECT user_id FROM public.savings_goal_members WHERE goal_id = NEW.id
    LOOP
      PERFORM public.add_points(v_member.user_id, 30, 'savings_goal_achieved', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
-- Trigger đã tồn tại từ migration 08d — replace function là đủ
```

- [ ] **Step 2: Đăng ký trong migrate.sh**

Thêm sau `run_sql "sql/migrations/20-phase6-gift-points.sql"`:

```bash
run_sql "sql/migrations/21-phase6-shared-savings.sql"
```

- [ ] **Step 3: Apply migration**

```bash
./scripts/migrate.sh --docker
```

- [ ] **Step 4: Smoke test**

```sql
SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('savings_goal_members', 'savings_goal_contributions');

SELECT proname FROM pg_proc WHERE proname = 'is_goal_member';
```

Expected: 3 kết quả.

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/21-phase6-shared-savings.sql scripts/migrate.sh
git commit -m "feat(db): migration 21 — shared savings (3 tables, is_goal_member, extended trigger)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Shared Savings Goals — Actions + UI

**Files:**
- Modify: `src/features/finance/savings.actions.ts`
- Modify: `src/lib/validators/finance.ts`
- Create: `src/features/finance/__tests__/shared-savings.validators.test.ts`
- Create: `src/features/finance/components/MemberList.tsx`
- Create: `src/features/finance/components/ContributeForm.tsx`

**Produces:**
- `inviteMember(goalId, username): Promise<{ error: string | null }>`
- `contributeToGoal(goalId, amount): Promise<{ error: string | null }>`
- `listGoalMembers(goalId): Promise<{ members: Member[] }>`

- [ ] **Step 1: Viết failing test**

Tạo `src/features/finance/__tests__/shared-savings.validators.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { goalContributionSchema } from '@/lib/validators/finance'

describe('goalContributionSchema', () => {
  it('rejects zero amount', () => {
    expect(goalContributionSchema.safeParse({ amount: 0 }).success).toBe(false)
  })
  it('rejects negative amount', () => {
    expect(goalContributionSchema.safeParse({ amount: -100 }).success).toBe(false)
  })
  it('accepts valid amount', () => {
    expect(goalContributionSchema.safeParse({ amount: 500000 }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Chạy test — verify FAIL**

```bash
npx vitest run src/features/finance/__tests__/shared-savings.validators.test.ts
```

- [ ] **Step 3: Thêm validator**

Append vào `src/lib/validators/finance.ts`:

```typescript
export const goalContributionSchema = z.object({
  amount: z.number().int().positive('Khoản góp phải lớn hơn 0'),
})
```

- [ ] **Step 4: Chạy test — verify PASS**

```bash
npx vitest run src/features/finance/__tests__/shared-savings.validators.test.ts
```

- [ ] **Step 5: Thêm actions vào savings.actions.ts**

Append vào `src/features/finance/savings.actions.ts` (thêm `goalContributionSchema` vào import từ validators trước):

```typescript
export async function inviteMember(
  goalId: string,
  username: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: goal } = await supabase
    .from('savings_goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()
  if (!goal) return { error: 'Không có quyền mời thành viên' }

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

- [ ] **Step 6: Tìm savings goal detail page**

```bash
find src/app -name "*.tsx" | xargs grep -l "savings_goals" 2>/dev/null | head -5
```

Xác định đúng file detail page (ví dụ: `src/app/finance/goals/[id]/page.tsx`).

- [ ] **Step 7: Thêm Members section vào detail page**

Trong detail page, sau progress bar hiện có, thêm:

```tsx
import { listGoalMembers } from '@/features/finance/savings.actions'
import { MemberList } from '@/features/finance/components/MemberList'
import { ContributeForm } from '@/features/finance/components/ContributeForm'

// Fetch members (server-side)
const { members } = await listGoalMembers(goal.id)

// Trong JSX:
<section className="space-y-3 mt-6">
  <h2 className="font-semibold text-sm text-zinc-600 uppercase tracking-wide">Thành viên</h2>
  <MemberList goalId={goal.id} members={members} isOwner={goal.user_id === user.id} />
  <ContributeForm goalId={goal.id} />
</section>
```

Build `MemberList` và `ContributeForm` là Client Components trong `src/features/finance/components/`. Pattern theo `SavingsGoalCard` hoặc component tương tự trong feature.

- [ ] **Step 8: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/features/finance/savings.actions.ts \
        src/lib/validators/finance.ts \
        src/features/finance/__tests__/shared-savings.validators.test.ts \
        src/features/finance/components/
git commit -m "feat(finance): shared savings goals — invite, contribute actions + members UI

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Done when

- [ ] `npx vitest run` — 3 new shared-savings tests pass
- [ ] Chủ goal thấy form invite member trên detail page
- [ ] Member được mời thấy goal trong danh sách `/finance/goals`
- [ ] Đóng góp → `current_amount` tăng ngay lập tức
- [ ] Khi đạt target → tất cả thành viên nhận 30 điểm (kiểm tra `points_ledger`)
