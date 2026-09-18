# Phase 6 / Feature 1 — Gift Points

> Ref: `docs/superpowers/specs/2026-09-06-phase6-features-design.md` §Feature 1  
> Depends on: Phase 1–5 complete (migrations 06–19 applied)  
> Branch: `feat/phase6-features`

**Goal:** Người dùng tặng điểm cho nhau qua modal trên trang public profile. Daily limit 200pts/ngày enforced trong DB RPC.

---

## Preconditions

- Migrations 06–19 đã apply
- `public.add_points()` function tồn tại (từ migration 01–05)
- `public.notifications` table tồn tại với constraint `type`

---

## Task 1: Migration 20 — Gift Points DB

**Files:**
- Create: `sql/migrations/20-phase6-gift-points.sql`
- Modify: `scripts/migrate.sh`

- [ ] **Step 1: Tạo migration file**

```sql
-- sql/migrations/20-phase6-gift-points.sql

-- 1. Extend points_ledger reason codes
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_code_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_code_check
  CHECK (reason_code IN (
    'signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved',
    'subscription_points','shop_purchase_points','gift_sent','gift_received'
  ));

-- 2. Extend notifications type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow','like','comment','points','referral','finance','todo','shop','gift'));

-- 3. Daily limit tracker (reset khi day thay đổi)
CREATE TABLE IF NOT EXISTS public.gift_daily_limit (
  user_id    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  day        date NOT NULL DEFAULT current_date,
  total_sent integer NOT NULL DEFAULT 0
);

-- 4. gift_points() RPC
-- Atomicity: cả 2 add_points() trong cùng 1 transaction
-- Security: reads auth.uid() internally → safe GRANT to authenticated
-- ponytail: daily_limit constant=200, đổi thành config table nếu cần tuỳ chỉnh runtime
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

  INSERT INTO public.notifications (user_id, type, data)
  VALUES (p_to_user_id, 'gift', jsonb_build_object('from_user_id', v_from, 'amount', p_amount));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gift_points(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gift_points(uuid, integer) TO authenticated;
```

- [ ] **Step 2: Đăng ký trong migrate.sh**

Thêm sau dòng `run_sql "sql/migrations/19-referral-analytics.sql"`:

```bash
run_sql "sql/migrations/20-phase6-gift-points.sql"
```

- [ ] **Step 3: Apply migration**

```bash
./scripts/migrate.sh --docker
```

- [ ] **Step 4: Smoke test trong Supabase Studio**

```sql
SELECT constraint_name FROM information_schema.table_constraints
  WHERE table_name = 'points_ledger' AND constraint_name = 'points_ledger_reason_code_check';

SELECT * FROM public.gift_daily_limit LIMIT 1;

SELECT proname FROM pg_proc WHERE proname = 'gift_points';
```

Expected: 3 kết quả trả về.

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/20-phase6-gift-points.sql scripts/migrate.sh
git commit -m "feat(db): migration 20 — gift_points RPC + daily limit table

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Gift Points — Actions + Validator + UI

**Files:**
- Create: `src/features/wallet/actions/gift.actions.ts`
- Create: `src/features/wallet/components/GiftPointsButton.tsx`
- Create: `src/features/wallet/__tests__/gift.validators.test.ts`
- Modify: `src/lib/validators/finance.ts`
- Modify: `src/app/u/[username]/page.tsx`

**Interfaces:**
- Consumes: `gift_points(p_to_user_id, p_amount)` RPC từ Task 1
- Produces: `giftPoints(toUserId, amount): Promise<{ error: string | null }>`

- [ ] **Step 1: Viết failing test**

Tạo `src/features/wallet/__tests__/gift.validators.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { giftPointsSchema } from '@/lib/validators/finance'

describe('giftPointsSchema', () => {
  it('rejects zero amount', () => {
    expect(giftPointsSchema.safeParse({ amount: 0 }).success).toBe(false)
  })
  it('rejects negative amount', () => {
    expect(giftPointsSchema.safeParse({ amount: -10 }).success).toBe(false)
  })
  it('rejects amount above daily limit', () => {
    expect(giftPointsSchema.safeParse({ amount: 201 }).success).toBe(false)
  })
  it('accepts valid amount', () => {
    expect(giftPointsSchema.safeParse({ amount: 100 }).success).toBe(true)
  })
})
```

- [ ] **Step 2: Chạy test — verify FAIL**

```bash
npx vitest run src/features/wallet/__tests__/gift.validators.test.ts
```

- [ ] **Step 3: Thêm validator vào finance.ts**

Append vào `src/lib/validators/finance.ts`:

```typescript
export const giftPointsSchema = z.object({
  amount: z.number().int().positive('Số điểm phải lớn hơn 0').max(200, 'Tối đa 200 điểm/lần tặng'),
})
```

- [ ] **Step 4: Chạy test — verify PASS**

```bash
npx vitest run src/features/wallet/__tests__/gift.validators.test.ts
```

- [ ] **Step 5: Tạo gift action**

Tạo `src/features/wallet/actions/gift.actions.ts`:

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
  revalidatePath('/u')
  return { error: null }
}
```

- [ ] **Step 6: Tạo GiftPointsButton component**

Tạo `src/features/wallet/components/GiftPointsButton.tsx`:

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
                <button type="button" className="px-3 py-1.5 text-sm rounded-lg border">Huỷ</button>
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

- [ ] **Step 7: Thêm button vào profile page**

Trong `src/app/u/[username]/page.tsx`, tìm nơi render nút Follow/Unfollow. Import và thêm `GiftPointsButton` cạnh nút đó, chỉ render khi `user.id !== profile.id`:

```tsx
import { GiftPointsButton } from '@/features/wallet/components/GiftPointsButton'

// Trong JSX, cạnh nút follow:
{user.id !== profile.id && <GiftPointsButton toUserId={profile.id} />}
```

- [ ] **Step 8: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/validators/finance.ts \
        src/features/wallet/actions/gift.actions.ts \
        src/features/wallet/__tests__/gift.validators.test.ts \
        src/features/wallet/components/GiftPointsButton.tsx \
        src/app/u/[username]/page.tsx
git commit -m "feat(wallet): gift points — action, validator, UI modal on profile page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Done when

- [ ] `npx vitest run` — 4 new gift tests pass
- [ ] `/u/[username]` hiện nút "🎁 Tặng điểm" (ẩn khi xem profile chính mình)
- [ ] Modal mở, nhập số điểm, submit → balance cập nhật trên `/wallet`
- [ ] Self-gift blocked, daily limit 200pts enforced với thông báo lỗi rõ
