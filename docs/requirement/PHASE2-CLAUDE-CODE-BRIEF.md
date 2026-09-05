# Money App — Brief triển khai Giai đoạn 2 (đưa cho Claude Code CLI)

> Đây là bản brief kỹ thuật để dán vào Claude Code CLI trong repo thật của dự án. Được soạn dựa trên `EVALUATION.md` (tóm tắt trạng thái Phase 1, 03/09/2026) và tài liệu *Kế hoạch Giai đoạn 2* — **không phải dựa trên việc đọc trực tiếp source code của bạn**. Việc đầu tiên Claude Code phải làm là tự đọc các file thật được liệt kê bên dưới trước khi sửa bất cứ gì, vì tên constraint/hàm/cột thực tế trong repo có thể khác giả định ở đây.

## 0. Mục tiêu phiên làm việc

Thêm module SaaS đầu tiên vào Money App: **Quản lý tài chính cá nhân** (giao dịch, ngân sách, mục tiêu tiết kiệm) + **Năng suất nhẹ** (ghi chú, to-do) + **Gói Premium** (giới hạn Free tier, nâng cấp bằng điểm hoặc VNPay) — tái sử dụng tối đa hạ tầng ví điểm/thanh toán đã có ở Phase 1, không xây cơ chế riêng.

## 1. Nguyên tắc bắt buộc (đúc kết từ Phase 1 — không được vi phạm)

Đây là các quy tắc đã áp dụng cho `add_points`, `redeem_reward`, `complete_referral`, `points_ledger` ở Phase 1. Mọi bảng/hàm mới trong Giai đoạn 2 phải tuân theo y hệt:

1. **RLS không tự cấp quyền bảng.** Bật `ROW LEVEL SECURITY` xong vẫn phải `GRANT SELECT/INSERT/...` tường minh cho `authenticated`/`anon`, nếu không mọi câu lệnh báo `permission denied for table ...` bất kể policy cho phép gì.
2. **Hàm nhận `user_id` làm tham số mà không tự kiểm tra `auth.uid()` bên trong thì KHÔNG được để client gọi trực tiếp** — chỉ gọi từ trigger nội bộ hoặc service role. Hàm tự lấy `auth.uid()` bên trong (như `redeem_reward`) mới an toàn để `GRANT EXECUTE` cho `authenticated`.
3. **`points_ledger` là append-only tuyệt đối** — mọi thay đổi điểm đi qua `add_points`, không bao giờ `INSERT`/`UPDATE`/`DELETE` trực tiếp từ nơi khác.
4. **Trigger function chỉnh sửa dữ liệu của một bản ghi KHÔNG thuộc về người vừa thực hiện hành động (vd: cập nhật đếm trên bài đăng của người khác khi mình like) BẮT BUỘC phải khai báo `security definer` + `set search_path = public`.** Thiếu điều này, `UPDATE` bên trong trigger sẽ chạy dưới quyền RLS của người gọi và **âm thầm cập nhật 0 dòng — không báo lỗi gì cả**, rất khó phát hiện qua test thủ công vì hành động chính (insert like/comment) vẫn "thành công".

> ⚠️ **Việc đầu tiên cần làm — không phải tính năng mới, mà là audit lỗi đã phát hiện:** khi soạn brief này, dựng lại một bản Postgres cục bộ và test thấy pattern trigger đếm like/comment (nếu bạn dùng đúng dạng `sync_post_like_count()` không khai báo `security definer`) bị đúng lỗi ở mục 4 — Bob like bài của Alice, insert vào `likes` thành công, nhưng `posts.like_count` không hề tăng, không có lỗi nào hiện ra. Hãy mở file trigger like/comment thật trong repo (theo cấu trúc `sql/triggers/`) và kiểm tra: nếu trigger function không có `security definer`, thêm vào ngay — đây có thể là bug đang chạy thật trên dữ liệu hiện tại.

## 2. Đọc trước khi code (bắt buộc)

Trước khi chạy bất kỳ migration nào ở mục 4, đọc các file sau trong repo để đối chiếu với giả định trong brief này:

- `docs/requirement/schema.sql` — xác nhận tên constraint thật của `points_ledger.reason_code` và `notifications.type` (mục 4 dưới đây giả định tên mặc định Postgres `<table>_<column>_check`; nếu bạn đã đặt tên khác, sửa lại 2 lệnh `ALTER TABLE ... DROP CONSTRAINT` cho khớp).
- `sql/triggers/01-04*.sql` — xác nhận các trigger gamification hiện có có đang `security definer` hay không (liên quan cảnh báo ở mục 1.4).
- `sql/migrations/07-complete-payment-rpc.sql` — đọc kỹ chữ ký và logic của `complete_payment()` RPC hiện tại trước khi mở rộng nó để xử lý thêm loại thanh toán "subscription" (mục 6).
- `src/lib/types/database.ts` — xác nhận đây vẫn là stub thủ công như ghi trong EVALUATION.md.

## 3. Xử lý nợ kỹ thuật tối thiểu (làm trước, trong buổi làm việc đầu tiên)

- [ ] Chạy `npx supabase gen types typescript --local > src/lib/types/database.ts`, xóa các chỗ ép kiểu `as any[]` liên quan. Bắt buộc làm trước vì bước 4 thêm 7 bảng mới.
- [ ] Audit trigger like/comment theo cảnh báo ở mục 1 — thêm `security definer set search_path = public` nếu đang thiếu.

## 4. Migration Giai đoạn 2 (đã kiểm thử trên PostgreSQL 16 cục bộ — xem ghi chú cuối file)

Tạo file mới `sql/migrations/08-phase2-finance-productivity.sql` với nội dung sau. **Trước khi chạy**, đối chiếu tên 2 constraint ở đầu file với bước 2 ở trên.

```sql
-- ============================================================================
-- PHASE 2 — BỔ SUNG SCHEMA: TÀI CHÍNH CÁ NHÂN + NĂNG SUẤT NHẸ + SUBSCRIPTIONS
-- ============================================================================

-- 1. Mở rộng constraint có sẵn để nhận reason_code / type mới
alter table public.points_ledger drop constraint if exists points_ledger_reason_code_check;
alter table public.points_ledger add constraint points_ledger_reason_code_check
  check (reason_code in ('signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved','subscription_points'));

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow','like','comment','points','referral','finance','todo'));

-- 2. Bảng mới
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade, -- null = danh mục mặc định hệ thống
  name       text not null check (char_length(name) between 1 and 40),
  icon       text,
  type       text not null check (type in ('income', 'expense')),
  created_at timestamptz not null default now()
);

create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id),
  type        text not null check (type in ('income', 'expense')),
  amount_vnd  integer not null check (amount_vnd > 0),
  note        text check (note is null or char_length(note) <= 200),
  occurred_at date not null default current_date,
  created_at  timestamptz not null default now()
);

create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  category_id  uuid not null references public.categories(id),
  month        date not null, -- quy ước: luôn lưu ngày 1 của tháng, vd 2026-09-01
  limit_amount integer not null check (limit_amount > 0),
  created_at   timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create table public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 60),
  target_amount  integer not null check (target_amount > 0),
  current_amount integer not null default 0 check (current_amount >= 0),
  target_date    date,
  achieved_at    timestamptz,
  created_at     timestamptz not null default now()
);

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text check (title is null or char_length(title) <= 100),
  content    text check (content is null or char_length(content) <= 5000),
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  done       boolean not null default false,
  due_date   date,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  plan           text not null default 'premium' check (plan in ('premium')),
  status         text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  payment_method text not null check (payment_method in ('points', 'vnpay')),
  started_at     timestamptz not null default now(),
  expires_at     timestamptz not null
);

-- 3. Index
create index idx_transactions_user_month on public.transactions (user_id, occurred_at desc);
create index idx_budgets_user_month on public.budgets (user_id, month);
create index idx_notes_user_pinned on public.notes (user_id, pinned, updated_at desc);
create index idx_todos_user_done on public.todos (user_id, done, due_date);
create index idx_subscriptions_user_status on public.subscriptions (user_id, status);

-- 4. Trigger: updated_at cho notes (tái dùng set_updated_at() đã có từ Phase 1 —
-- nếu tên hàm thật trong repo khác, sửa lại cho khớp)
create trigger trg_notes_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

-- 5. Trigger: thưởng điểm khi đạt mục tiêu tiết kiệm lần đầu — PHẢI security definer
create or replace function public.check_savings_goal_achieved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.current_amount >= new.target_amount and old.achieved_at is null and new.achieved_at is null then
    new.achieved_at := now();
    perform public.add_points(new.user_id, 30, 'savings_goal_achieved', new.id);
  end if;
  return new;
end;
$$;

create trigger trg_savings_goal_achieved
before update on public.savings_goals
for each row execute function public.check_savings_goal_achieved();

-- 6. Function: nâng cấp Premium bằng điểm thưởng
-- TODO (CẦN FOUNDER XÁC NHẬN TRƯỚC KHI DÙNG THẬT): với tỉ giá Phase 1
-- (1.000đ = 1 điểm), giá 19.000đ/tháng quy đổi thẳng chỉ ~19 điểm — quá rẻ so
-- với các mốc thưởng (post +10, referral +100), sẽ làm mất giá trị điểm.
-- Tạm đặt 500 điểm/tháng cho có ý nghĩa; PHẢI chốt lại con số thật trước khi launch.
create or replace function public.subscribe_premium_with_points()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_points_cost constant integer := 500; -- TODO: xác nhận giá điểm/tháng
  v_sub_id      uuid;
begin
  if v_user_id is null then
    raise exception 'Yeu cau dang nhap';
  end if;

  perform public.add_points(v_user_id, -v_points_cost, 'subscription_points', null);

  insert into public.subscriptions (user_id, plan, status, payment_method, expires_at)
  values (v_user_id, 'premium', 'active', 'points', now() + interval '30 days')
  returning id into v_sub_id;

  return v_sub_id;
end;
$$;

-- 7. RLS — bật cho toàn bộ bảng mới, CHỈ chủ sở hữu đọc/ghi (KHÔNG public như posts,
-- vì dữ liệu tài chính cá nhân nhạy cảm hơn nội dung social)
alter table public.categories     enable row level security;
alter table public.transactions   enable row level security;
alter table public.budgets        enable row level security;
alter table public.savings_goals  enable row level security;
alter table public.notes          enable row level security;
alter table public.todos          enable row level security;
alter table public.subscriptions  enable row level security;

create policy "categories_select_own_or_system" on public.categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

create policy "budgets_select_own" on public.budgets for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets for update using (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets for delete using (auth.uid() = user_id);

create policy "savings_goals_select_own" on public.savings_goals for select using (auth.uid() = user_id);
create policy "savings_goals_insert_own" on public.savings_goals for insert with check (auth.uid() = user_id);
create policy "savings_goals_update_own" on public.savings_goals for update using (auth.uid() = user_id);

create policy "notes_select_own" on public.notes for select using (auth.uid() = user_id);
create policy "notes_insert_own" on public.notes for insert with check (auth.uid() = user_id);
create policy "notes_update_own" on public.notes for update using (auth.uid() = user_id);
create policy "notes_delete_own" on public.notes for delete using (auth.uid() = user_id);

create policy "todos_select_own" on public.todos for select using (auth.uid() = user_id);
create policy "todos_insert_own" on public.todos for insert with check (auth.uid() = user_id);
create policy "todos_update_own" on public.todos for update using (auth.uid() = user_id);
create policy "todos_delete_own" on public.todos for delete using (auth.uid() = user_id);

create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = user_id);

-- 8. GRANT tường minh (bài học Phase 1: RLS không tự cấp quyền bảng)
grant select, insert on public.categories to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update on public.savings_goals to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.todos to authenticated;
grant select on public.subscriptions to authenticated;

-- Không cho phép client INSERT/UPDATE trực tiếp subscriptions — chỉ qua
-- subscribe_premium_with_points() hoặc webhook VNPay (service role)
revoke insert, update, delete on public.subscriptions from authenticated, anon, public;

-- 9. Khóa quyền gọi function nhạy cảm
revoke execute on function public.subscribe_premium_with_points() from public, anon;
grant execute on function public.subscribe_premium_with_points() to authenticated;
```

**Seed danh mục mặc định** (chạy sau migration trên, điều chỉnh danh sách theo ý muốn):

```sql
insert into public.categories (user_id, name, icon, type) values
  (null, 'Ăn uống', '🍜', 'expense'),
  (null, 'Di chuyển', '🚗', 'expense'),
  (null, 'Hóa đơn', '🧾', 'expense'),
  (null, 'Giải trí', '🎮', 'expense'),
  (null, 'Lương', '💰', 'income'),
  (null, 'Khác', '📦', 'expense');
```

## 5. Mở rộng `complete_payment()` cho subscription qua VNPay

Sau khi đọc file thật ở mục 2, mở rộng logic webhook để khi loại giao dịch là "subscription" (thêm cột `payment_type` vào bảng `payments` nếu chưa có, hoặc dùng cách phân biệt hiện có của bạn), thay vì cộng điểm thì tạo/gia hạn bản ghi trong `subscriptions` với `payment_method = 'vnpay'`, `status = 'active'`, `expires_at = now() + interval '30 days'` (hoặc cộng thêm 30 ngày vào `expires_at` cũ nếu đang gia hạn trước khi hết hạn). Giữ nguyên tính atomic (toàn bộ trong 1 transaction) như `complete_payment()` gốc đã làm cho luồng nạp điểm.

## 6. Server Actions cần tạo (theo cấu trúc `features/` hiện có)

Tạo 2 feature mới, theo đúng pattern `features/wallet/` và `features/auth/` đã có (Server Actions + Zod validate + form React):

```
features/
  finance/
    transaction.actions.ts   — createTransaction, listTransactions(month), deleteTransaction
    budget.actions.ts        — upsertBudget, listBudgets(month), getBudgetProgress
    savings.actions.ts       — createSavingsGoal, updateSavingsProgress, listSavingsGoals
    validators.ts            — Zod schema cho amount_vnd (>0, số nguyên), note (≤200 ký tự)
  productivity/
    notes.actions.ts         — createNote, updateNote, togglePin, deleteNote
    todos.actions.ts         — createTodo, toggleDone, deleteTodo
  billing/
    subscription.actions.ts  — subscribeWithPoints() gọi RPC subscribe_premium_with_points,
                                getSubscriptionStatus(), kiểm tra free-tier limit trước khi cho tạo
                                mới (xem bảng giới hạn ở mục 7)
```

Route mới trong `src/app/`: `/finance` (giao dịch + báo cáo), `/finance/budgets`, `/finance/goals`, `/notes`, `/todos`, `/billing/upgrade`.

## 7. Giới hạn Free tier (đặt thành constant dùng chung, vd `lib/constants/limits.ts`)

| Giới hạn | Free | Premium |
|---|---|---|
| Ngân sách đang hoạt động | 3 | Không giới hạn |
| Mục tiêu tiết kiệm | 1 | Không giới hạn |
| Ghi chú | 50 | Không giới hạn |
| To-do đang hoạt động | 20 | Không giới hạn |
| Báo cáo | Biểu đồ cơ bản | Xuất PDF/Excel |

Mỗi Server Action tạo mới (budget/goal/note/todo) phải kiểm tra giới hạn này dựa trên `getSubscriptionStatus()` trước khi insert — chặn ở tầng Server Action, RLS không tự làm việc này.

## 8. Checklist kiểm tra sau khi migration (chạy trong Supabase SQL Editor)

```sql
-- Xác nhận add_points/subscribe vẫn đúng quyền
select has_function_privilege('authenticated', 'public.subscribe_premium_with_points()', 'execute'); -- true
select has_table_privilege('authenticated', 'public.subscriptions', 'insert'); -- false

-- Xác nhận RLS cách ly đúng: đăng nhập bằng 2 tài khoản khác nhau, xác nhận
-- user A không select được transactions/savings_goals của user B.
```

## 9. Thứ tự thực hiện đề xuất (theo sprint trong Kế hoạch Giai đoạn 2)

- [ ] **Sprint 0**: mục 3 (gen types + audit trigger like/comment)
- [ ] **Sprint 1**: chạy migration mục 4 phần `categories` + `transactions`, xây `features/finance/transaction.actions.ts` + UI ghi giao dịch
- [ ] **Sprint 2**: `budgets` + UI cảnh báo 80%/100% + báo cáo biểu đồ cơ bản
- [ ] **Sprint 3**: `savings_goals` + xác nhận trigger thưởng điểm hoạt động đúng (test như mục 8)
- [ ] **Sprint 4**: `notes` + `todos`, mở rộng notification type cho nhắc nhở
- [ ] **Sprint 5**: `subscriptions` + `subscribe_premium_with_points` + mở rộng `complete_payment()` (mục 5) — **chốt giá điểm/tháng ở mục 4.6 trước khi bắt đầu sprint này**
- [ ] **Sprint 6–7**: closed beta, hoàn thiện, quảng bá tới người dùng Phase 1 hiện có

---

*Ghi chú kiểm thử: toàn bộ SQL ở mục 4 đã được chạy thử thành công trên PostgreSQL 16 cục bộ (mô phỏng schema `auth` của Supabase + baseline schema Phase 1), bao gồm test chức năng: tạo mục tiêu tiết kiệm → cập nhật đạt mốc → trigger tự cộng đúng 30 điểm; nâng cấp Premium bằng điểm trừ đúng số dư; client bị chặn insert trực tiếp vào `subscriptions`; và cách ly RLS đúng giữa 2 người dùng khác nhau. Vẫn cần chạy lại kiểm thử này trên schema thật của bạn vì brief này không đọc trực tiếp source code — chỉ dựa trên mô tả trong EVALUATION.md.*
