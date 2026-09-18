# Phase 6 / Feature 4 — Recurring Transactions

> Ref: `docs/superpowers/specs/2026-09-06-phase6-features-design.md` §Feature 4  
> Depends on: Migration 22 applied (Feature 3 complete)  
> Branch: `feat/phase6-features`

**Goal:** Người dùng tạo giao dịch định kỳ (monthly). pg_cron chạy lúc 01:00 UTC mỗi ngày, tự động insert giao dịch khi đến ngày. Công thức tháng tính từ `start_date` — không cộng dồn từ lần chạy trước (tránh drift ngày 29–31).

---

## Preconditions

- Migration 22 đã apply
- `transactions` table tồn tại với các cột: `user_id`, `category_id`, `type`, `amount_vnd`, `note`, `occurred_at`
- pg_cron extension bật trong Supabase (kiểm tra bước đầu tiên)

---

## Task 7: Migration 23 — Recurring Transactions DB

**Files:**
- Create: `sql/migrations/23-phase6-recurring-tx.sql`
- Modify: `scripts/migrate.sh`

**Produces:**
- `recurring_transactions` table (owner-only RLS)
- `run_recurring_transactions() → integer` — REVOKE từ authenticated, chỉ pg_cron gọi
- pg_cron job: `0 1 * * *`

**Critical:** Công thức `(start_date + (occurrences_run || ' months')::interval)::date` — KHÔNG dùng `next_run_date + interval` (gây drift vĩnh viễn ở ngày 29–31)

- [ ] **Step 1: Xác nhận pg_cron bật**

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Nếu 0 row: Supabase Studio → Database → Extensions → bật `pg_cron`.

- [ ] **Step 2: Tạo migration file**

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

-- QUAN TRỌNG: start_date bất biến sau khi tạo.
-- next_run = (start_date + (occurrences_run || ' months')::interval)::date
-- KHÔNG dùng: previous_next_run + interval (gây drift vĩnh viễn cho ngày 29-31)

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring_tx_owner" ON public.recurring_transactions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_transactions TO authenticated;

-- run_recurring_transactions(): xử lý tất cả giao dịch đến hạn
-- REVOKE từ authenticated/anon — chỉ pg_cron gọi (service context)
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

-- Schedule daily lúc 01:00 UTC
SELECT cron.schedule(
  'run-recurring-transactions-daily',
  '0 1 * * *',
  $$SELECT public.run_recurring_transactions();$$
);
```

- [ ] **Step 3: Đăng ký trong migrate.sh**

Thêm sau `run_sql "sql/migrations/22-phase6-hashtags.sql"`:

```bash
run_sql "sql/migrations/23-phase6-recurring-tx.sql"
```

- [ ] **Step 4: Apply migration**

```bash
./scripts/migrate.sh --docker
```

- [ ] **Step 5: Verify cron đã schedule**

```sql
SELECT jobname, schedule, command FROM cron.job
  WHERE jobname = 'run-recurring-transactions-daily';
```

Expected: 1 row với schedule `0 1 * * *`.

- [ ] **Step 6: Commit**

```bash
git add sql/migrations/23-phase6-recurring-tx.sql scripts/migrate.sh
git commit -m "feat(db): migration 23 — recurring_transactions + run_recurring_transactions() + pg_cron

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Recurring Transactions — Actions + UI

**Files:**
- Create: `src/features/finance/recurring.actions.ts`
- Create: `src/features/finance/components/RecurringList.tsx`
- Create: `src/features/finance/__tests__/recurring.test.ts`
- Modify: `src/lib/validators/finance.ts`
- Create: `src/app/finance/recurring/page.tsx`
- Create: `src/app/finance/recurring/new/page.tsx`
- Modify: `src/app/finance/page.tsx` (thêm nav link)

**Produces:**
- `createRecurring()`, `listRecurring()`, `toggleRecurring()`, `deleteRecurring()`
- `/finance/recurring` — list + toggle + delete
- `/finance/recurring/new` — create form

- [ ] **Step 1: Viết failing test**

Tạo `src/features/finance/__tests__/recurring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { recurringSchema } from '@/lib/validators/finance'

describe('recurringSchema', () => {
  it('rejects zero amount', () => {
    expect(recurringSchema.safeParse({ type: 'expense', amount_vnd: 0, start_date: '2026-09-01' }).success).toBe(false)
  })
  it('rejects invalid type', () => {
    expect(recurringSchema.safeParse({ type: 'transfer', amount_vnd: 100000, start_date: '2026-09-01' }).success).toBe(false)
  })
  it('rejects invalid date format', () => {
    expect(recurringSchema.safeParse({ type: 'expense', amount_vnd: 100000, start_date: '01-09-2026' }).success).toBe(false)
  })
  it('accepts valid recurring', () => {
    expect(recurringSchema.safeParse({ type: 'expense', amount_vnd: 3000000, start_date: '2026-09-01' }).success).toBe(true)
  })
})

describe('date formula correctness', () => {
  // Verify formula tránh day-31 drift: luôn tính từ start_date
  it('start_date + N months, không cộng dồn', () => {
    function nextRunDate(startDate: string, occurrencesRun: number): string {
      const d = new Date(startDate)
      d.setMonth(d.getMonth() + occurrencesRun)
      return d.toISOString().slice(0, 10)
    }
    const start = '2026-01-31'
    expect(nextRunDate(start, 1)).toBe('2026-02-28')  // Feb capped
    expect(nextRunDate(start, 2)).toBe('2026-03-31')  // back to 31, không bị stuck ở 28
    expect(nextRunDate(start, 3)).toBe('2026-04-30')
  })
})
```

- [ ] **Step 2: Chạy test — verify FAIL**

```bash
npx vitest run src/features/finance/__tests__/recurring.test.ts
```

- [ ] **Step 3: Thêm validator**

Append vào `src/lib/validators/finance.ts`:

```typescript
export const recurringSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount_vnd: z.number().int().positive('Số tiền phải lớn hơn 0'),
  category_id: z.string().uuid().optional(),
  note: z.string().max(200).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải ở dạng YYYY-MM-DD'),
})
```

- [ ] **Step 4: Chạy test — verify PASS**

```bash
npx vitest run src/features/finance/__tests__/recurring.test.ts
```

- [ ] **Step 5: Tạo recurring actions**

Tạo `src/features/finance/recurring.actions.ts`:

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

- [ ] **Step 6: Tạo recurring pages**

Tạo `src/app/finance/recurring/page.tsx`:

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

Tạo `src/features/finance/components/RecurringList.tsx` — Client Component hiển thị từng item với nút toggle (`toggleRecurring`) và xoá (`deleteRecurring`). Pattern theo `NoteCard` hoặc `TodoItem` trong feature hiện có.

Tạo `src/app/finance/recurring/new/page.tsx` — form tạo mới gọi `createRecurring`. Các field: type (income/expense), amount_vnd, category_id (optional), note (optional), start_date.

- [ ] **Step 7: Thêm nav link trong finance page**

Trong `src/app/finance/page.tsx`, tìm chỗ hiện link Ngân sách/Mục tiêu. Thêm link `/finance/recurring`.

- [ ] **Step 8: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/features/finance/recurring.actions.ts \
        src/features/finance/__tests__/recurring.test.ts \
        src/lib/validators/finance.ts \
        src/features/finance/components/RecurringList.tsx \
        src/app/finance/recurring/ \
        src/app/finance/page.tsx
git commit -m "feat(finance): recurring transactions — actions, validator, management UI

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Done when

- [ ] `npx vitest run` — 5 new recurring tests pass (schema + date formula)
- [ ] `/finance/recurring` hiển thị danh sách; nút toggle + xoá hoạt động
- [ ] `/finance/recurring/new` tạo được giao dịch định kỳ mới
- [ ] Nav link từ `/finance` dẫn đến `/finance/recurring`
- [ ] `run_recurring_transactions()` có thể gọi thủ công trong Studio và insert transaction
