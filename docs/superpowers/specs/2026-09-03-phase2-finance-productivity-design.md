# Money App Phase 2 — Design Spec
# Tài chính cá nhân + Năng suất + Gói Premium

> Ngày: 03-09-2026 | Trạng thái: Approved, chờ implementation plan

---

## 0. Mục tiêu

Thêm 3 module vào Money App Phase 1 đã ổn định:

1. **Tài chính cá nhân** — ghi giao dịch, ngân sách tháng, mục tiêu tiết kiệm
2. **Năng suất nhẹ** — ghi chú, to-do list
3. **Gói Premium** — giới hạn Free tier, nâng cấp bằng điểm hoặc VNPay

Tái sử dụng toàn bộ hạ tầng ví điểm/thanh toán Phase 1. Không xây cơ chế điểm/payment riêng.

---

## 1. Nguyên tắc bất biến (kế thừa từ Phase 1)

1. **RLS + GRANT tường minh**: bật RLS chưa đủ — phải `GRANT SELECT/INSERT/...` tường minh cho `authenticated`.
2. **Hàm nhận `user_id` param mà không check `auth.uid()` nội bộ** → chỉ gọi từ trigger/service_role, không GRANT cho client.
3. **`points_ledger` append-only tuyệt đối** — mọi thay đổi điểm đi qua `add_points()`.
4. **Trigger chỉnh sửa dữ liệu không thuộc người gọi** → BẮT BUỘC `SECURITY DEFINER SET search_path = public`.

---

## 2. Sprint 0 — Sửa bug + dọn nợ (làm trước hết)

### 2a. Fix trigger SECURITY DEFINER (bug đang chạy thật)

**Vấn đề:** `sync_post_like_count()` và `sync_post_comment_count()` trong `schema.sql` thiếu `SECURITY DEFINER`. Bob like bài Alice → trigger UPDATE posts bị RLS chặn → 0 rows updated, không có error. `like_count`/`comment_count` hiện tại sai.

**Fix:** Tạo `sql/migrations/08a-fix-count-triggers.sql` — recreate 2 functions với `SECURITY DEFINER SET search_path = public`, giữ nguyên body logic. Không cần recreate trigger.

### 2b. Gen TypeScript types

```bash
npx supabase gen types typescript --local > src/lib/types/database.ts
```

Sau đó xóa cast `as any[]` trong `FeedList.tsx` và `LoadMoreFeed.tsx`. Chạy `npx tsc --noEmit` để xác nhận 0 errors. Từ đây, mỗi lần thêm bảng mới → gen lại types.

---

## 3. Schema — 7 bảng mới

### 3a. Chuẩn bị bảng payments

```sql
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'topup'
  CHECK (payment_type IN ('topup', 'subscription'));
```

### 3b. Mở rộng constraints

```sql
-- points_ledger.reason_code
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_code_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_code_check
  CHECK (reason_code IN ('signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved','subscription_points'));

-- notifications.type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow','like','comment','points','referral','finance','todo'));
```

### 3c. Bảng mới

```sql
-- categories (danh mục thu/chi, user_id null = system default)
CREATE TABLE public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  icon       text,
  type       text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- transactions
CREATE TABLE public.transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id),
  type        text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_vnd  integer NOT NULL CHECK (amount_vnd > 0),
  note        text CHECK (note IS NULL OR char_length(note) <= 200),
  occurred_at date NOT NULL DEFAULT current_date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- budgets (unique per user+category+month)
CREATE TABLE public.budgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.categories(id),
  month        date NOT NULL, -- luôn lưu ngày 1 của tháng, vd 2026-09-01
  limit_amount integer NOT NULL CHECK (limit_amount > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);

-- savings_goals
CREATE TABLE public.savings_goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  target_amount  integer NOT NULL CHECK (target_amount > 0),
  current_amount integer NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date    date,
  achieved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- notes
CREATE TABLE public.notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text CHECK (title IS NULL OR char_length(title) <= 100),
  content    text CHECK (content IS NULL OR char_length(content) <= 5000),
  pinned     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- todos
CREATE TABLE public.todos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  done       boolean NOT NULL DEFAULT false,
  due_date   date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- subscriptions (INSERT/UPDATE chỉ qua RPC hoặc webhook service_role)
CREATE TABLE public.subscriptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan           text NOT NULL DEFAULT 'premium' CHECK (plan IN ('premium')),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  payment_method text NOT NULL CHECK (payment_method IN ('points', 'vnpay')),
  started_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL
);
```

### 3d. Indexes

```sql
CREATE INDEX idx_transactions_user_month ON public.transactions (user_id, occurred_at DESC);
CREATE INDEX idx_budgets_user_month ON public.budgets (user_id, month);
CREATE INDEX idx_notes_user_pinned ON public.notes (user_id, pinned, updated_at DESC);
CREATE INDEX idx_todos_user_done ON public.todos (user_id, done, due_date);
CREATE INDEX idx_subscriptions_user ON public.subscriptions (user_id);
```

### 3e. Triggers

```sql
-- notes.updated_at (tái dùng set_updated_at() đã có từ Phase 1)
CREATE TRIGGER trg_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- thưởng điểm khi đạt mục tiêu tiết kiệm (PHẢI security definer)
CREATE OR REPLACE FUNCTION public.check_savings_goal_achieved()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
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

### 3f. RLS + GRANT

```sql
-- Bật RLS
ALTER TABLE public.categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions  ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "budgets_select" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "savings_goals_select" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "savings_goals_insert" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals_update" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notes_select" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete" ON public.notes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "todos_select" ON public.todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "todos_insert" ON public.todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "todos_update" ON public.todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "todos_delete" ON public.todos FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- GRANT tường minh
GRANT SELECT, INSERT ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.savings_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todos TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;

-- subscriptions: client KHÔNG được ghi trực tiếp
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon, public;
```

---

## 4. Free tier limits & constants

**`src/lib/constants/limits.ts`:**
```ts
export const FREE_LIMITS = {
  budgets: 3,
  savingsGoals: 1,
  notes: 50,
  activeTodos: 20,
} as const

export const PREMIUM_POINTS_COST = 500 // ponytail: hardcoded, đổi khi founder xác nhận
```

Pattern check trong mọi Server Action tạo mới:
```ts
const { isPremium } = await getSubscriptionStatus()
if (!isPremium) {
  const count = await getCount(user.id)
  if (count >= FREE_LIMITS.budgets) return { error: 'Nâng cấp Premium để tạo thêm ngân sách' }
}
```

---

## 5. Feature modules

```
src/features/
  finance/
    validators.ts            — Zod: amount_vnd (>0 integer), note (≤200), type, category_id
    transaction.actions.ts   — createTransaction, listTransactions(month), deleteTransaction
    budget.actions.ts        — upsertBudget, listBudgets(month), getBudgetProgress
    savings.actions.ts       — createSavingsGoal, updateSavingsProgress, listSavingsGoals
  productivity/
    notes.actions.ts         — createNote, updateNote, togglePin, deleteNote
    todos.actions.ts         — createTodo, toggleDone, deleteTodo
  billing/
    subscription.actions.ts  — getSubscriptionStatus, subscribeWithPoints, checkFreeLimit
```

**`getSubscriptionStatus()`** — dùng chung ở mọi nơi cần check Premium:
```ts
export async function getSubscriptionStatus() {
  // SELECT từ subscriptions WHERE user_id = current user AND status = 'active' AND expires_at > now()
  return { isPremium: boolean, expiresAt: Date | null }
}
```

---

## 6. Routes mới

```
src/app/
  finance/
    page.tsx           — Danh sách giao dịch tháng + tổng thu/tổng chi
    new/page.tsx       — Form thêm giao dịch (category, amount, date, note)
    budgets/page.tsx   — Ngân sách tháng + progress bar (% đã dùng)
    goals/page.tsx     — Mục tiêu tiết kiệm + nút cập nhật số tiền
  notes/page.tsx       — Danh sách ghi chú (pinned trước)
  todos/page.tsx       — To-do list (lọc: tất cả / chưa xong / quá hạn)
  billing/
    upgrade/page.tsx   — Trạng thái Sub + 2 nút: dùng điểm / VNPay
```

Nav hiện có (`layout.tsx`) — thêm links Finance, Notes, Todos. Không tạo layout riêng.

---

## 7. Billing — subscribe_premium_with_points() RPC

```sql
CREATE OR REPLACE FUNCTION public.subscribe_premium_with_points()
RETURNS uuid LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_points_cost CONSTANT integer := 500; -- ponytail: đổi khi chốt giá
  v_sub_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Yeu cau dang nhap'; END IF;
  PERFORM public.add_points(v_user_id, -v_points_cost, 'subscription_points', NULL);
  INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
  VALUES (v_user_id, 'premium', 'active', 'points', now() + interval '30 days')
  ON CONFLICT (user_id) DO UPDATE
    SET expires_at = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
        status = 'active',
        payment_method = 'points';
  SELECT id INTO v_sub_id FROM public.subscriptions WHERE user_id = v_user_id;
  RETURN v_sub_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.subscribe_premium_with_points() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_premium_with_points() TO authenticated;
```

---

## 8. Billing — mở rộng complete_payment() cho subscription VNPay

Thêm nhánh vào `complete_payment()` RPC hiện có (file `sql/migrations/09-extend-complete-payment.sql`):

```sql
-- Sau khi UPDATE payments thành công, phân nhánh theo payment_type:
IF v_payment.payment_type = 'subscription' THEN
  INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
  VALUES (v_payment.user_id, 'premium', 'active', 'vnpay', now() + interval '30 days')
  ON CONFLICT (user_id) DO UPDATE
    SET expires_at = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
        status = 'active',
        payment_method = 'vnpay';
  RETURN json_build_object('ok', true, 'subscription', true);
ELSE
  -- logic topup gốc: add_points
  v_delta := FLOOR(v_payment.amount_vnd::numeric / 1000)::integer;
  IF v_delta > 0 THEN PERFORM public.add_points(v_payment.user_id, v_delta, 'topup', v_payment.id); END IF;
  RETURN json_build_object('ok', true, 'payment_id', v_payment.id, 'points', v_delta);
END IF;
```

---

## 9. Seed danh mục mặc định

```sql
INSERT INTO public.categories (user_id, name, icon, type) VALUES
  (NULL, 'Ăn uống',   '🍜', 'expense'),
  (NULL, 'Di chuyển', '🚗', 'expense'),
  (NULL, 'Hóa đơn',   '🧾', 'expense'),
  (NULL, 'Giải trí',  '🎮', 'expense'),
  (NULL, 'Lương',     '💰', 'income'),
  (NULL, 'Khác',      '📦', 'expense');
```

---

## 10. Checklist sau mỗi sprint

```sql
-- S0: triggers đã SECURITY DEFINER?
SELECT proname, prosecdef FROM pg_proc
WHERE proname IN ('sync_post_like_count','sync_post_comment_count');
-- prosecdef = true ✅

-- S5: phân quyền subscriptions đúng?
SELECT has_function_privilege('authenticated','public.subscribe_premium_with_points()','execute'); -- true
SELECT has_table_privilege('authenticated','public.subscriptions','insert'); -- false

-- S5: RLS isolation (chạy dưới 2 user khác nhau)
-- user A không SELECT được transactions của user B
```

---

## 11. Thứ tự sprint

| Sprint | Việc | File migrations |
|---|---|---|
| S0 | Fix like/comment triggers + gen types | `08a-fix-count-triggers.sql` |
| S1 | payments.payment_type + categories + transactions + UI | `08b-phase2-part1.sql` |
| S2 | budgets + báo cáo tháng | `08c-phase2-part2.sql` |
| S3 | savings_goals + trigger thưởng điểm | `08d-phase2-part3.sql` |
| S4 | notes + todos | `08e-phase2-part4.sql` |
| S5 | subscriptions + RPC + extend complete_payment | `08f-phase2-billing.sql`, `09-extend-complete-payment.sql` |
