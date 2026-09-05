# Money App — Brief triển khai Giai đoạn 3 (đưa cho Claude Code CLI)

> Đây là bản brief kỹ thuật để dán vào Claude Code CLI trong repo thật của dự án. Được soạn dựa trên `EVALUATION.md` (tóm tắt trạng thái Phase 1+2, 03/09/2026, commit `34ccd93`) và tài liệu *Kế hoạch Giai đoạn 3* — **không phải dựa trên việc đọc trực tiếp source code của bạn**. Việc đầu tiên Claude Code phải làm là tự đọc các file thật được liệt kê ở mục 2 trước khi sửa bất cứ gì, vì tên constraint/hàm/cột thực tế trong repo có thể khác giả định ở đây.

## 0. Mục tiêu phiên làm việc

Hai track làm song song:

- **Track A (vận hành)**: admin dashboard (doanh thu 2 luồng VNPay, khoá tài khoản, ẩn bài đăng vi phạm), referral hoàn chỉnh (cột mã unique + deep link `/join?ref=CODE`), notification phân loại theo tab.
- **Track B (Shopping)**: mở rộng hạ tầng redeem/rewards hiện có thành marketplace voucher/quà tặng thật từ đối tác, mua bằng điểm hoặc VNPay, có cơ chế gán mã kho hàng an toàn khi nhiều người mua cùng lúc.

## 1. Nguyên tắc bắt buộc (đúc kết từ Phase 1-2 — không được vi phạm)

Mọi bảng/hàm mới trong Giai đoạn 3 phải tuân theo y hệt các quy tắc đã áp dụng cho `add_points`, `redeem_reward`, `complete_referral`, `points_ledger`, `complete_payment()`:

1. **RLS không tự cấp quyền bảng.** Bật `ROW LEVEL SECURITY` xong vẫn phải `GRANT SELECT/INSERT/...` tường minh cho `authenticated`/`anon`, nếu không mọi câu lệnh báo `permission denied for table ...` bất kể policy cho phép gì.
2. **Hàm nhận `user_id` làm tham số mà không tự kiểm tra `auth.uid()` bên trong thì KHÔNG được để client gọi trực tiếp** — chỉ gọi từ trigger nội bộ hoặc service role. Hàm tự lấy `auth.uid()` bên trong (như `redeem_reward`, và cả 2 hàm mới ở mục 5 dưới đây) mới an toàn để `GRANT EXECUTE` cho `authenticated`.
3. **`points_ledger` là append-only tuyệt đối** — mọi thay đổi điểm đi qua `add_points`, không bao giờ `INSERT`/`UPDATE`/`DELETE` trực tiếp từ nơi khác.
4. **Mọi trigger function chỉnh sửa dữ liệu KHÔNG thuộc sở hữu người gọi trực tiếp phải `security definer set search_path = public`** — nếu không, UPDATE bên trong trigger chạy dưới quyền RLS của người gọi và âm thầm cập nhật 0 dòng, không báo lỗi.
5. **Bảng chứa dữ liệu nhạy cảm (mã kho hàng, khoá quyền admin) không bao giờ `GRANT` trực tiếp cho client** — chỉ lộ ra qua hàm `SECURITY DEFINER` có kiểm tra quyền sở hữu bên trong, theo đúng mẫu `get_my_order_code()` ở mục 5.2.
6. **Quyền admin không được cấp qua RLS đơn thuần trên client.** Mọi hành động ghi ảnh hưởng dữ liệu người khác (khoá tài khoản, ẩn bài, sửa reward, nạp kho mã) phải kiểm tra `role = 'admin'` ở tầng Server Action phía server trước; RLS chỉ là lớp phòng thủ thứ hai, không phải lớp duy nhất.

> ⚠️ **Việc đầu tiên cần làm — audit, không phải tính năng mới:** trước khi thêm bảng mới, xác nhận lại 2 vấn đề đã từng bị flag ở Phase 1-2 vẫn còn được xử lý đúng trong repo thật: (a) trigger đếm like/comment (`sync_post_like_count`, `sync_post_comment_count`) có `security definer` hay chưa — EVALUATION.md ghi đã sửa ở `08a-fix-count-triggers.sql`, chỉ cần xác nhận lại; (b) `add_points`/`complete_referral` vẫn bị `REVOKE EXECUTE` khỏi `authenticated`/`anon`/`public`.

## 2. Đọc trước khi code (bắt buộc)

Trước khi chạy bất kỳ migration nào ở mục 4-5, đọc các file sau trong repo để đối chiếu với giả định trong brief này:

- `docs/requirement/schema.sql` — xác nhận tên constraint thật của `points_ledger.reason_code` và `notifications.type` (đã được mở rộng 1 lần ở Phase 2 trong `08b-phase2-core.sql`; mục 4 và 5 dưới đây mở rộng thêm lần nữa — nếu tên constraint thật khác giả định, sửa lại lệnh `ALTER TABLE ... DROP CONSTRAINT` cho khớp).
- `src/lib/types/database.ts` — xác nhận đã được generate thật từ Supabase CLI (theo TODO đã đóng ở Sprint 0 Giai đoạn 2); nếu vẫn là stub thủ công, generate lại sau khi chạy xong migration mục 4-5.
- `sql/migrations/07-complete-payment-rpc.sql` và `09-extend-complete-payment.sql` — đọc kỹ chữ ký và logic hiện tại của `complete_payment()` (đã có nhánh `topup`/`subscription` từ Phase 2) trước khi mở rộng thêm nhánh `shop_purchase` ở mục 6.
- `sql/triggers/01-04*.sql` và `08a-fix-count-triggers.sql` — xác nhận trạng thái `security definer` như cảnh báo ở mục 1.
- `src/app/invite/`, `features/referral/` — đọc cơ chế tính mã referral hiện tại (SHA-256(user.id).slice(0,8), theo EVALUATION.md) trước khi thay bằng cột `referral_code` ở mục 4.2.

## 3. Xử lý nợ kỹ thuật tối thiểu (làm trước, trong buổi làm việc đầu tiên)

- [ ] Audit lại 2 điểm ở cảnh báo mục 1 (trigger security definer, REVOKE EXECUTE trên add_points/complete_referral) — xác nhận bằng truy vấn ở mục 8.
- [ ] Xác nhận `database.ts` đã generate thật (không phải stub) trước khi thêm 6 bảng mới ở mục 4-5.

## 4. Migration Track A — Admin, referral, notification (đã kiểm thử logic trên PostgreSQL 16 cục bộ)

Tạo file mới `sql/migrations/10-phase3-admin-referral.sql`:

```sql
-- ============================================================================
-- PHASE 3 — TRACK A: ADMIN ROLE, REFERRAL CODE, NOTIFICATION TYPE
-- ============================================================================

-- 1. Quyền admin — set thủ công qua SQL Editor sau khi migration chạy xong,
--    KHÔNG có API/UI nào được phép tự đổi role của chính mình
alter table public.profiles
  add column role text not null default 'user' check (role in ('user', 'admin'));

-- 2. Cột khoá tài khoản / ẩn bài — không xoá dữ liệu gốc, phục vụ khiếu nại/khôi phục
alter table public.profiles add column locked boolean not null default false;
alter table public.posts    add column hidden boolean not null default false;

-- 3. Referral code cố định, unique, sinh 1 lần khi tạo profile
alter table public.profiles add column referral_code text unique;

-- Lưu ý: sinh mã rồi kiểm tra tồn tại trước khi gán (thay vì insert-rồi-bắt-lỗi
-- unique_violation), vì lỗi unique trên chính hàng đang insert của BEFORE trigger
-- chỉ lộ ra sau khi trigger đã trả về, không retry được gọn trong cùng lần gọi.
create or replace function public.generate_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_tries integer := 0;
begin
  if new.referral_code is not null then
    return new;
  end if;
  loop
    v_tries := v_tries + 1;
    v_code := lower(substr(md5(new.id::text || clock_timestamp()::text || v_tries::text), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
    if v_tries > 5 then
      raise exception 'Khong sinh duoc ma referral duy nhat sau 5 lan thu';
    end if;
  end loop;
  new.referral_code := v_code;
  return new;
end;
$$;

create trigger trg_generate_referral_code
before insert on public.profiles
for each row execute function public.generate_referral_code();

-- Backfill cho user hiện có (chạy 1 lần, sau khi trigger đã tồn tại)
update public.profiles set referral_code = lower(substr(md5(id::text || clock_timestamp()::text), 1, 8))
where referral_code is null;

-- 4. Mở rộng notifications.type nếu chưa có đủ giá trị (kiểm tra tên constraint thật ở mục 2)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('follow','like','comment','points','referral','finance','todo','shop'));

-- 5. Hàm kiểm tra quyền admin — BẮT BUỘC đi qua hàm SECURITY DEFINER riêng,
--    KHÔNG viết EXISTS(SELECT 1 FROM public.profiles ...) trực tiếp trong policy
--    của chính bảng profiles: đã kiểm thử thực tế và xác nhận cách viết đó gây
--    lỗi "infinite recursion detected in policy for relation profiles" (RLS trên
--    profiles tự gọi lại chính nó qua subquery). Hàm SECURITY DEFINER chạy dưới
--    quyền chủ sở hữu (thường là superuser khi tạo qua SQL Editor), bỏ qua RLS ở
--    bên trong, nên phá được vòng lặp này.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 6. RLS mới cho admin — CỘNG THÊM (OR) vào policy chủ sở hữu hiện có, không thay thế
create policy "admin_select_all_profiles" on public.profiles for select using (public.is_admin());
create policy "admin_update_lock_profiles" on public.profiles for update using (public.is_admin());
create policy "admin_select_all_posts" on public.posts for select using (public.is_admin());
create policy "admin_update_hide_posts" on public.posts for update using (public.is_admin());
create policy "admin_select_all_payments" on public.payments for select using (public.is_admin());
create policy "admin_select_all_subscriptions" on public.subscriptions for select using (public.is_admin());

-- 7. Hàm tra referral_code -> referrer_id, dùng khi xử lý đăng ký qua deep link
--    Tự an toàn: chỉ SELECT, không sửa dữ liệu, không cần REVOKE
create or replace function public.get_referrer_by_code(p_code text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.profiles where referral_code = p_code limit 1;
$$;

grant execute on function public.get_referrer_by_code(text) to authenticated, anon;
```

**✅ Đã kiểm thử chức năng (PostgreSQL 16 cục bộ):**

- Trigger `generate_referral_code()`: tạo 3 profile liên tiếp, cả 3 đều nhận `referral_code` khác nhau, không trùng, không cần chỉ định thủ công.
- RLS admin: **lần thử đầu tiên viết trực tiếp `exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')` bên trong policy của chính bảng `profiles` đã gây lỗi thật `infinite recursion detected in policy for relation "profiles"`** khi test — vì subquery đó cũng bị áp policy của chính bảng đang định nghĩa, tạo vòng lặp. Sau khi tách thành hàm `is_admin()` SECURITY DEFINER như trong migration ở trên, đã test lại và xác nhận: user thường chỉ thấy đúng 1 dòng của chính mình ở `profiles`/`posts`; admin thấy đủ cả 3 profiles và tất cả bài đăng; admin `UPDATE ... SET locked = true` cho user khác thành công; một user thường khác cố `UPDATE` cùng dòng đó bị chặn (`UPDATE 0`, đúng như RLS thiết kế).
- `get_referrer_by_code()`: trả đúng `id` khi mã tồn tại, trả `NULL` khi mã không tồn tại, gọi được với role `authenticated` không cần set `auth.uid()` (mô phỏng người chưa đăng nhập/`anon`).

**Ghi chú áp dụng:**

- Cột `referral_code` được `UNIQUE` nên nếu backfill ở bước 4 gặp trùng (xác suất cực thấp với `md5` + `clock_timestamp()` nhưng không phải bằng 0), chạy lại riêng lẻ cho các dòng lỗi.
- `get_referrer_by_code()` cố ý không kiểm tra `auth.uid()` vì đây là tra cứu công khai cần thiết cho người **chưa đăng nhập** xem `/join?ref=CODE` — không rò rỉ thông tin nhạy cảm vì chỉ trả về `id`, không trả `email`/dữ liệu cá nhân khác.
- **Nguyên tắc chung cần nhớ khi thêm RLS admin cho bảng mới ở tương lai**: không bao giờ viết `EXISTS(SELECT ... FROM profiles ...)` trực tiếp trong policy của chính bảng `profiles` — luôn gọi qua `public.is_admin()`. Với các bảng khác (posts, payments...) viết trực tiếp vẫn an toàn vì không tự tham chiếu chính bảng đang định nghĩa policy, nhưng dùng `is_admin()` cho nhất quán và đỡ lặp code cũng là lựa chọn hợp lý.

## 5. Migration Track B — Shop Marketplace (✅ đã kiểm thử chức năng trên PostgreSQL 16 cục bộ)

Tạo file mới `sql/migrations/11-phase3-shop-marketplace.sql`:

```sql
-- ============================================================================
-- PHASE 3 — TRACK B: SHOP MARKETPLACE (VOUCHER/QUÀ TẶNG ĐỐI TÁC)
-- ============================================================================

-- 1. Mở rộng constraint points_ledger.reason_code (kiểm tra tên thật ở mục 2)
alter table public.points_ledger drop constraint if exists points_ledger_reason_code_check;
alter table public.points_ledger add constraint points_ledger_reason_code_check
  check (reason_code in ('signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved','subscription_points',
    'shop_purchase_points'));

-- 2. Bảng đối tác
create table public.shop_partners (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  logo_url   text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Bảng sản phẩm (voucher/quà tặng) — ít nhất 1 trong 2 giá phải khác NULL
create table public.shop_products (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references public.shop_partners(id) on delete restrict,
  title        text not null check (char_length(title) between 1 and 120),
  description  text,
  image_url    text,
  price_points integer check (price_points is null or price_points > 0),
  price_vnd    integer check (price_vnd is null or price_vnd > 0),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint shop_products_price_check check (price_points is not null or price_vnd is not null)
);

-- 4. Kho mã — KHÔNG BAO GIỜ grant trực tiếp cho client (xem mục 7)
create table public.shop_product_codes (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.shop_products(id) on delete restrict,
  code              text not null,
  assigned_order_id uuid,
  created_at        timestamptz not null default now(),
  unique (product_id, code)
);
create index idx_shop_codes_available on public.shop_product_codes (product_id) where assigned_order_id is null;

-- 5. Đơn hàng
create table public.shop_orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  product_id     uuid not null references public.shop_products(id),
  code_id        uuid references public.shop_product_codes(id),
  payment_method text not null check (payment_method in ('points', 'vnpay')),
  amount_points  integer,
  amount_vnd     integer,
  status         text not null default 'fulfilled' check (status in ('fulfilled', 'failed')),
  created_at     timestamptz not null default now()
);
create index idx_shop_orders_user on public.shop_orders (user_id, created_at desc);

-- 6. Hàm mua bằng điểm — SECURITY DEFINER, tự đọc auth.uid(), dùng SKIP LOCKED
--    để không bao giờ gán trùng 1 mã cho 2 đơn hàng dù nhiều người mua cùng lúc
create or replace function public.purchase_product_with_points(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_price    integer;
  v_code_id  uuid;
  v_order_id uuid;
begin
  if v_user_id is null then
    raise exception 'Yeu cau dang nhap';
  end if;

  select price_points into v_price
    from public.shop_products
   where id = p_product_id and active;
  if v_price is null then
    raise exception 'San pham khong kha dung hoac khong ho tro mua bang diem';
  end if;

  -- khoá đúng 1 mã còn trống, bỏ qua các mã đang bị giao dịch khác khoá
  select id into v_code_id
    from public.shop_product_codes
   where product_id = p_product_id and assigned_order_id is null
   for update skip locked
   limit 1;
  if v_code_id is null then
    raise exception 'Het ma, vui long thu lai sau';
  end if;

  -- trừ điểm qua add_points có sẵn (tự kiểm tra số dư, ghi points_ledger)
  perform public.add_points(v_user_id, -v_price, 'shop_purchase_points', p_product_id);

  insert into public.shop_orders (user_id, product_id, code_id, payment_method, amount_points, status)
  values (v_user_id, p_product_id, v_code_id, 'points', v_price, 'fulfilled')
  returning id into v_order_id;

  update public.shop_product_codes set assigned_order_id = v_order_id where id = v_code_id;

  return v_order_id;
end;
$$;

-- 7. Hàm tiết lộ mã — cách DUY NHẤT client được phép đọc nội dung mã
create or replace function public.get_my_order_code(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  select spc.code into v_code
    from public.shop_orders so
    join public.shop_product_codes spc on spc.id = so.code_id
   where so.id = p_order_id and so.user_id = auth.uid();
  if v_code is null then
    raise exception 'Khong co quyen xem ma nay';
  end if;
  return v_code;
end;
$$;

-- 8. RLS
alter table public.shop_partners      enable row level security;
alter table public.shop_products      enable row level security;
alter table public.shop_product_codes enable row level security;
alter table public.shop_orders        enable row level security;

create policy "shop_partners_select_active" on public.shop_partners for select using (active);
create policy "shop_products_select_active" on public.shop_products for select using (active);

create policy "shop_orders_select_own" on public.shop_orders for select using (auth.uid() = user_id);

create policy "admin_all_shop_partners" on public.shop_partners for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "admin_all_shop_products" on public.shop_products for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "admin_all_shop_codes" on public.shop_product_codes for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- 9. GRANT tường minh (bài học Phase 1: RLS không tự cấp quyền bảng)
grant select on public.shop_partners, public.shop_products to authenticated, anon;
grant select on public.shop_orders to authenticated;

-- shop_product_codes: KHÔNG grant SELECT cho ai ngoài postgres — chỉ đọc qua
-- get_my_order_code(). Admin quản lý qua Server Action dùng service_role, không
-- qua client trực tiếp dù RLS admin đã cho phép — service_role bỏ qua RLS nên
-- vẫn cần Server Action tự kiểm tra role trước khi gọi (nguyên tắc 6 ở mục 1).
revoke all on public.shop_product_codes from authenticated, anon, public;

-- 10. Khoá quyền gọi function nhạy cảm — 2 hàm dưới đây TỰ đọc auth.uid() bên
-- trong nên an toàn để client gọi trực tiếp qua supabase.rpc(...)
grant execute on function public.purchase_product_with_points(uuid) to authenticated;
grant execute on function public.get_my_order_code(uuid) to authenticated;
```

**✅ Đã kiểm thử chức năng (PostgreSQL 16 cục bộ, schema `auth` giả lập + `add_points` rút gọn cùng chữ ký):**

1. *Mua tuần tự*: 1 sản phẩm giá 300 điểm, 2 mã khả dụng, user có 1000 điểm → 2 lượt mua liên tiếp đều trả về `order_id` khác nhau, số dư giảm đúng 1000 → 400, mỗi mã gán đúng 1 đơn hàng; lượt mua thứ 3 khi hết mã báo đúng lỗi `Het ma`.
2. *Mua đồng thời*: 5 tiến trình `psql` độc lập gọi `purchase_product_with_points()` **cùng lúc** khi chỉ còn 2 mã trống → đúng 2 lượt thành công với 2 mã khác nhau và 2 đơn hàng khác nhau, 3 lượt còn lại báo đúng lỗi hết mã — không có trường hợp 1 mã bị gán cho 2 đơn, không trừ điểm sai cho lượt thất bại.
3. *Kiểm soát quyền đọc mã*: chủ đơn gọi `get_my_order_code()` nhận đúng mã; một user khác gọi cùng `order_id` bị chặn với lỗi `Khong co quyen xem ma nay`; truy vấn trực tiếp `shop_product_codes` bằng role `authenticated` bị từ chối với `permission denied for table shop_product_codes` như thiết kế.

**Cần làm lại trước khi launch thật:** chạy lại đúng 3 kịch bản trên trong schema thật của repo (không phải bản rút gọn dùng để kiểm thử), vì `add_points` thật có thêm tham số `p_reference_id` — đã phản ánh đúng trong SQL ở trên (`perform public.add_points(v_user_id, -v_price, 'shop_purchase_points', p_product_id)`), nhưng nên xác nhận lại bằng test thật trên staging trước khi nạp mã voucher thật vào kho.

## 6. Mở rộng `complete_payment()` cho mua voucher bằng VNPay

Sau khi đọc file thật ở mục 2 (`07-complete-payment-rpc.sql`, `09-extend-complete-payment.sql`), mở rộng logic để nhận thêm loại giao dịch `'shop_purchase'` (theo đúng cách đã phân nhánh `topup`/`subscription` ở Phase 2), với luồng bên trong transaction:

1. Xác thực chữ ký/checksum VNPay như hiện có (không đổi).
2. Nếu `payment_type = 'shop_purchase'`: đọc `product_id` từ metadata giao dịch đã lưu lúc tạo link thanh toán, chạy đúng logic `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1` như trong `purchase_product_with_points()` ở mục 5.6 để lấy 1 mã, insert `shop_orders` với `payment_method = 'vnpay'`, `amount_vnd`, rồi gán `code_id` — **không gọi `add_points`** vì đây là mua bằng tiền, không trừ điểm.
3. Giữ nguyên tính atomic (toàn bộ trong 1 transaction) như bản gốc đã làm cho nạp điểm và subscription.

> Vì webhook chạy với `service_role` (bỏ qua RLS), việc bảo vệ nằm ở chỗ toàn bộ logic gán mã nằm trong Edge Function/RPC nội bộ, client không bao giờ tự gọi được nhánh này trực tiếp — giữ nguyên nguyên tắc đã áp dụng cho nhánh `subscription` ở Phase 2.

## 7. Server Actions & route cần tạo

```
features/
  admin/
    dashboard.actions.ts     — getRevenueSummary(range), listRecentPayments(), listUsers(), lockUser(id), unlockUser(id)
    moderation.actions.ts    — hidePost(id), unhidePost(id) — đều PHẢI kiểm tra role='admin' ở đầu action trước khi query
    rewards.actions.ts       — CRUD rewards (đã có bảng từ Phase 1, chỉ thêm UI quản trị)
    shop.actions.ts          — CRUD shop_partners/shop_products, bulkImportCodes(productId, codes[])
  referral/
    join.actions.ts          — resolveReferralCode(code) gọi get_referrer_by_code, lưu vào cookie
    (sửa) registration flow  — đọc cookie referral, tạo bản ghi referrals(status='pending') đúng referrer_id
  notifications/
    (sửa) NotificationList    — thêm filter theo type, markAllRead()
  shop/
    shop.actions.ts           — listProducts(), getProduct(id), purchaseWithPoints(id) gọi RPC,
                                 listMyOrders(), getOrderCode(id) gọi RPC get_my_order_code
```

Route mới trong `src/app/`: `/admin` (+ `/admin/users`, `/admin/posts`, `/admin/rewards`, `/admin/shop`), `/join` (deep link referral), `/referral` (dashboard người dùng — có thể gộp vào `/invite` hiện có), `/shop` (danh sách sản phẩm), `/shop/[id]` (chi tiết + mua), `/shop/orders` (đơn hàng của tôi).

Middleware: thêm kiểm tra `role = 'admin'` cho toàn bộ path `/admin/**` ở tầng middleware/layout, redirect nếu không phải admin — không chỉ dựa vào RLS phía sau.

## 8. Checklist kiểm tra sau khi migration (chạy trong Supabase SQL Editor)

```sql
-- Track A
select has_table_privilege('authenticated', 'public.profiles', 'select');           -- true (đã có sẵn)
select column_name from information_schema.columns
  where table_name = 'profiles' and column_name in ('role','locked','referral_code'); -- đủ 3 dòng

-- Track B
select has_function_privilege('authenticated', 'public.purchase_product_with_points(uuid)', 'execute'); -- true
select has_function_privilege('authenticated', 'public.get_my_order_code(uuid)', 'execute');             -- true
select has_table_privilege('authenticated', 'public.shop_product_codes', 'select');                       -- false

-- Audit lại cảnh báo Phase 1-2 vẫn còn đúng
select has_function_privilege('authenticated', 'public.add_points(uuid,integer,text,uuid)', 'execute');   -- false
select has_function_privilege('authenticated', 'public.complete_referral(uuid)', 'execute');               -- false

-- Xác nhận cách ly RLS đúng: đăng nhập 2 tài khoản khác nhau (1 admin, 1 user thường),
-- xác nhận user thường không SELECT được payments/subscriptions của người khác,
-- còn admin thì được.
```

## 9. Thứ tự thực hiện đề xuất (theo sprint trong Kế hoạch Giai đoạn 3)

- [ ] **Sprint 0**: mục 3 (audit nợ kỹ thuật) + thiết kế wireframe admin dashboard, `/join`
- [ ] **Sprint 1**: chạy phần `role`/`locked`/`hidden` ở mục 4, xây `/admin` (doanh thu + danh sách giao dịch)
- [ ] **Sprint 2**: `/admin` khoá tài khoản/ẩn bài; notification tab lọc type + mark-all-read
- [ ] **Sprint 3**: phần `referral_code` + `/join` ở mục 4; song song bắt đầu thiết kế schema mục 5 cho Track B
- [ ] **Sprint 4-5**: chạy migration mục 5, viết + kiểm thử lại `purchase_product_with_points`/`get_my_order_code` trên schema thật (đối chiếu 3 kịch bản ở mục 5); mở rộng `complete_payment()` theo mục 6
- [ ] **Sprint 6-7**: UI `/shop`, `/shop/[id]`, `/shop/orders`; trang quản trị đối tác/sản phẩm + `bulkImportCodes`; onboard đối tác thật
- [ ] **Sprint 8-9**: closed beta, hoàn thiện, mở public

---

*Ghi chú kiểm thử: toàn bộ SQL cốt lõi ở cả mục 4 (referral code, admin role + RLS qua `is_admin()`, `get_referrer_by_code`) và mục 5 (marketplace) đã được chạy thử thành công trên PostgreSQL 16 cục bộ (mô phỏng schema `auth` của Supabase). Quá trình test mục 4 phát hiện và sửa ngay 1 lỗi thật — policy admin viết EXISTS trực tiếp trên chính bảng `profiles` gây `infinite recursion` — nên bản SQL trong brief này đã là bản đã sửa (dùng `is_admin()`), không phải bản gốc bị lỗi. Mục 5 test qua 3 kịch bản: mua tuần tự, mua đồng thời (5 tiến trình song song tranh 2 mã), và kiểm soát quyền đọc mã. Cả 2 mục đều test trên schema rút gọn dựng riêng cho việc kiểm thử, không phải schema thật của repo — vẫn cần chạy lại checklist mục 8 trên schema thật trước khi coi là hoàn tất, đặc biệt vì brief này không đọc trực tiếp source code thật của bạn mà chỉ dựa trên mô tả trong EVALUATION.md — đối chiếu kỹ mục 2 trước khi chạy bất kỳ migration nào.*
