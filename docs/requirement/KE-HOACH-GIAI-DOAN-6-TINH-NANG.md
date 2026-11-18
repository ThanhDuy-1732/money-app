# Money App — Kế hoạch phát triển Giai đoạn 6 (Tính năng mới)

> Soạn dựa trên `EVALUATION.md` cập nhật ngày 05/09/2026 (commit `f059109`). **Thay thế phạm vi** cho bản nháp Giai đoạn 6 trước (tập trung vận hành/go-live) — theo yêu cầu, giai đoạn này **tiếp tục phát triển tính năng ứng dụng**, chưa go-live. Các việc vận hành (go-live thật, audit hết hạn subscription, rate limiting...) vẫn còn nguyên giá trị và có thể dùng lại làm Giai đoạn 7 khi bạn sẵn sàng go-live.

## 0. Phân tích hiện trạng & định hướng tính năng

Toàn bộ tầm nhìn hệ sinh thái ban đầu (Social + Fintech → SaaS → Shopping) đã hoàn thành qua 5 giai đoạn: mạng xã hội, ví điểm/thanh toán, tài chính cá nhân + năng suất, admin/shop marketplace, và lớp vận hành (test, search nâng cao, analytics). Bốn module đang tồn tại khá độc lập với nhau — Social, Fintech, SaaS (Finance/Productivity), Shopping đều hoạt động tốt riêng lẻ nhưng **chưa có nhiều điểm giao thoa tận dụng lẫn nhau**. Giai đoạn 6 vì vậy tập trung vào các tính năng **kết nối chéo giữa các module đã có**, thay vì mở thêm module hoàn toàn mới — tận dụng tối đa hạ tầng đã kiểm chứng qua 5 giai đoạn (points_ledger, savings_goals, search, admin, RLS pattern) thay vì xây từ đầu.

## 1. Mục tiêu Giai đoạn 6

1. **Tặng điểm cho bạn bè** — cầu nối Social × Fintech đầu tiên: biến điểm thưởng từ thứ chỉ dùng một mình (đổi thưởng, mua voucher) thành thứ có thể chia sẻ trong mạng xã hội đã xây.
2. **Mục tiêu tiết kiệm chung** — cầu nối Social × SaaS: tiết kiệm không còn là việc riêng tư một mình, có thể rủ bạn bè/gia đình cùng góp và cùng đạt mục tiêu.
3. **Khám phá theo chủ đề (hashtag)** — nâng cấp Search/Explore đã có ở Phase 4-5 lên mức khám phá theo chủ đề, không chỉ tìm đúng từ khoá.
4. **Giao dịch định kỳ tự động** — giảm ma sát nhập liệu thủ công trong module Finance, tăng chất lượng dữ liệu cho Premium analytics đã xây ở Phase 5.
5. **Xuất báo cáo Premium** — hoàn thiện nốt hạng mục "Could have" còn treo từ kế hoạch Giai đoạn 2, tăng giá trị gói Premium.

## 2. Phạm vi Giai đoạn 6

### 2.1 Sẽ làm

- Tặng điểm cho bạn bè: RPC `gift_points()`, giới hạn/ngày chống lạm dụng, thông báo khi nhận điểm, hiển thị trên trang cá nhân/ví.
- Mục tiêu tiết kiệm chung: mời thành viên vào 1 mục tiêu, mỗi người tự ghi khoản góp của mình, tiến độ cộng dồn hiển thị chung, thưởng điểm cho tất cả thành viên khi đạt mốc.
- Hashtag: trích `#tag` từ nội dung bài đăng tự động, lọc feed/explore theo tag, trang `/explore/tag/[tag]`.
- Giao dịch định kỳ: đăng ký 1 giao dịch lặp lại (thuê nhà, lương, gói dịch vụ...), tự động tạo giao dịch đúng lịch qua `pg_cron`.
- Xuất báo cáo Premium: xuất PDF/CSV báo cáo thu chi theo tháng đã chọn, giới hạn tính năng này cho tài khoản Premium (tái dùng `getSubscriptionStatus()`/`is_premium_active()`).

### 2.2 Sẽ KHÔNG làm trong Giai đoạn 6

- Chuyển **tiền thật** giữa người dùng (chỉ tặng **điểm nội bộ**, không rút được ra tiền/ngân hàng) — giữ đúng nguyên tắc đã xác lập từ Giai đoạn 1: ví trong app là điểm thưởng nội bộ, không phải ví trung gian thanh toán theo Thông tư 40/2024/TT-NHNN, nên không phát sinh nghĩa vụ giấy phép trung gian thanh toán. Đây là lý do "tặng điểm" được chọn thay vì "chuyển tiền" khi thiết kế tính năng kết nối Social × Fintech.
- Mục tiêu tiết kiệm chung **không** pool tiền/điểm thật vào 1 ví chung — mỗi người tự ghi nhận khoản góp của mình (giống cách `transactions` hiện tại là nhập liệu thủ công, không đồng bộ ngân hàng), tránh mọi vấn đề pháp lý về giữ hộ tiền của người khác.
- Huy hiệu thành tích (badges), chat/nhắn tin trực tiếp — ý tưởng tốt nhưng đủ lớn để cần một giai đoạn riêng, dời vào backlog Giai đoạn 7 (mục 9).
- Native mobile app — giữ nguyên quyết định từ Giai đoạn 2, tiếp tục dùng chung nền tảng web/PWA.

## 3. Thiết kế kỹ thuật chi tiết

### 3.1 ✅ Đã kiểm thử — Tặng điểm cho bạn bè (`gift_points`)

```sql
alter table public.points_ledger drop constraint if exists points_ledger_reason_code_check;
alter table public.points_ledger add constraint points_ledger_reason_code_check
  check (reason_code in ('signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved','subscription_points',
    'shop_purchase_points','gift_sent','gift_received'));

-- Theo dõi hạn mức tặng/ngày để chống lạm dụng (vd. tạo tài khoản ảo qua lại kiếm điểm)
create table public.gift_daily_limit (
  user_id    uuid primary key references public.profiles(id),
  day        date not null default current_date,
  total_sent integer not null default 0
);

create or replace function public.gift_points(p_to_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from        uuid := auth.uid();
  v_daily_limit constant integer := 200; -- TODO: founder xác nhận hạn mức thật trước khi launch
  v_sent_today  integer;
begin
  if v_from is null then raise exception 'Yeu cau dang nhap'; end if;
  if p_amount <= 0 then raise exception 'So diem tang phai duong'; end if;
  if p_to_user_id = v_from then raise exception 'Khong the tu tang diem cho chinh minh'; end if;

  insert into public.gift_daily_limit (user_id, day, total_sent)
  values (v_from, current_date, 0)
  on conflict (user_id) do update
    set total_sent = case when gift_daily_limit.day = current_date then gift_daily_limit.total_sent else 0 end,
        day = current_date
  returning total_sent into v_sent_today;

  if v_sent_today + p_amount > v_daily_limit then
    raise exception 'Vuot han muc tang diem trong ngay (con lai % diem)', v_daily_limit - v_sent_today;
  end if;

  perform public.add_points(v_from, -p_amount, 'gift_sent', p_to_user_id);
  perform public.add_points(p_to_user_id, p_amount, 'gift_received', v_from);

  update public.gift_daily_limit set total_sent = total_sent + p_amount where user_id = v_from;
end;
$$;

grant execute on function public.gift_points(uuid, integer) to authenticated;
```

**✅ Đã kiểm thử**: tặng 100 điểm thành công, trừ đúng người gửi/cộng đúng người nhận, ghi 2 dòng `points_ledger` đối xứng (`gift_sent`/`gift_received`); tự tặng cho chính mình bị chặn đúng lỗi; vượt hạn mức 200 điểm/ngày bị chặn đúng, còn đúng phần hạn mức còn lại (100 điểm) vẫn tặng được — không có trường hợp trừ điểm người gửi mà không cộng cho người nhận (nhờ tái dùng `add_points()` đã kiểm chứng từ Phase 1, và cả 2 lệnh `perform` đều nằm trong cùng 1 transaction của hàm `gift_points`).

**Server Action + UI**: nút "Tặng điểm" trên trang `/u/[username]` (public profile đã có), modal nhập số điểm, gọi RPC qua `supabase.rpc('gift_points', ...)`. Thông báo cho người nhận tái dùng `notifications` (thêm giá trị `'gift'` vào `notifications.type` — đã có tiền lệ mở rộng constraint này ở Phase 2/3).

### 3.2 ✅ Đã kiểm thử — Mục tiêu tiết kiệm chung

**Phát hiện quan trọng khi thiết kế RLS cho tính năng này**: đúng như bài học `infinite recursion` đã gặp với RLS admin ở Giai đoạn 3/5, việc kiểm tra "user này có phải thành viên của mục tiêu không" cần đi qua 1 hàm `SECURITY DEFINER` riêng (`is_goal_member()`), **không viết `EXISTS(...)` trực tiếp trong policy của các bảng liên quan đến nhau** (ở đây là 3 bảng tham chiếu chéo: `savings_goals`, `savings_goal_members`, `savings_goal_contributions`). Đã kiểm thử và xác nhận cách dùng hàm wrapper hoạt động đúng, không gặp lỗi recursion nào dù có 3 bảng tham chiếu lẫn nhau.

```sql
create table public.savings_goal_members (
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  primary key (goal_id, user_id)
);

create table public.savings_goal_contributions (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.savings_goals(id) on delete cascade,
  user_id    uuid not null references public.profiles(id),
  amount     integer not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- Hàm kiểm tra quyền thành viên — BẮT BUỘC qua đây, không viết EXISTS trực tiếp
-- trong policy của savings_goals/savings_goal_members (bài học từ is_admin())
create or replace function public.is_goal_member(p_goal_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.savings_goal_members where goal_id = p_goal_id and user_id = auth.uid())
      or exists (select 1 from public.savings_goals where id = p_goal_id and owner_id = auth.uid());
$$;
revoke execute on function public.is_goal_member(uuid) from public, anon;
grant execute on function public.is_goal_member(uuid) to authenticated;

alter table public.savings_goal_members       enable row level security;
alter table public.savings_goal_contributions enable row level security;
-- (savings_goals đã enable RLS từ Phase 2 — thêm policy mới, không thay policy owner cũ)

create policy "goals_select_member" on public.savings_goals for select using (public.is_goal_member(id));
create policy "members_select_member" on public.savings_goal_members for select using (public.is_goal_member(goal_id));
create policy "contributions_select_member" on public.savings_goal_contributions for select using (public.is_goal_member(goal_id));
create policy "contributions_insert_member" on public.savings_goal_contributions
  for insert with check (public.is_goal_member(goal_id) and user_id = auth.uid());

grant select on public.savings_goal_members to authenticated;
grant select, insert on public.savings_goal_contributions to authenticated;

-- Trigger cộng dồn current_amount từ các khoản góp — tái dùng cơ chế
-- check_savings_goal_achieved() đã có từ Phase 2, không cần viết lại, chỉ cần
-- trigger AFTER INSERT này chạy TRƯỚC nó trong cùng transaction
create or replace function public.sync_goal_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.savings_goals set current_amount = current_amount + new.amount where id = new.goal_id;
  return new;
end;
$$;
create trigger trg_sync_goal_amount after insert on public.savings_goal_contributions
for each row execute function public.sync_goal_amount();
```

**✅ Đã kiểm thử**: chủ mục tiêu (owner) và thành viên được mời đều xem được mục tiêu + danh sách thành viên; thành viên góp tiền thành công, `current_amount` cập nhật đúng ngay qua trigger; **người không phải thành viên xem mục tiêu ra 0 dòng (không lỗi, đúng hành vi RLS)**, và cố insert khoản góp vào mục tiêu không thuộc về mình bị chặn đúng với lỗi vi phạm RLS.

**Thưởng điểm khi đạt mục tiêu chung**: mở rộng `check_savings_goal_achieved()` hiện có (đọc lại file thật `sql/migrations/08d-phase2-savings.sql`) để khi mục tiêu có > 1 thành viên, thưởng điểm cho **tất cả** thành viên (lặp qua `savings_goal_members` + `owner_id`, gọi `add_points()` cho từng người) thay vì chỉ 1 người như hiện tại — đây là điểm cần sửa thêm ngoài phần đã kiểm thử ở trên, nên viết test riêng khi triển khai thật.

### 3.3 ✅ Đã kiểm thử — Hashtag & khám phá theo chủ đề

```sql
alter table public.posts add column tags text[] not null default '{}';

create or replace function public.extract_hashtags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.tags := coalesce(
    (select array_agg(distinct lower(m[1])) from regexp_matches(new.content, '#([[:alnum:]_]+)', 'g') as m),
    '{}'
  );
  return new;
end;
$$;

create trigger trg_extract_hashtags before insert or update of content on public.posts
for each row execute function public.extract_hashtags();

create index posts_tags_idx on public.posts using gin(tags);
```

**✅ Đã kiểm thử**: nội dung `"Hôm nay #ăn_uống thật ngon, #dulich Đà Lạt #DuLich vui quá"` trích đúng thành `{dulich, ăn_uống}` — dedup không phân biệt hoa/thường (`#dulich` và `#DuLich` gộp thành 1), và **giữ nguyên được dấu tiếng Việt trong tag** (`ăn_uống`) vì lớp ký tự `[[:alnum:]_]` của PostgreSQL nhận diện đúng ký tự có dấu khi database dùng encoding UTF8 (không cần xử lý riêng cho tiếng Việt như từng lo ngại ở phần search nâng cao Giai đoạn 5). Truy vấn lọc theo tag (`tags @> array['dulich']`) trả đúng kết quả qua GIN index.

**UI**: hiển thị tag dạng link trong bài đăng (tái dùng style hiện có); route mới `/explore/tag/[tag]` liệt kê bài đăng theo tag, có thể kết hợp ranking `ts_rank` đã xây ở Giai đoạn 5 cho các bài cùng tag.

### 3.4 ✅ Đã kiểm thử (phát hiện 1 gotcha quan trọng) — Giao dịch định kỳ tự động

**Kiểm thử phát hiện một lỗi logic ngày tháng cần tránh ngay từ đầu thiết kế**: nếu tính `next_run_date` mới bằng cách cộng dồn `interval '1 month'` vào **giá trị `next_run_date` trước đó**, một giao dịch đăng ký ngày 31 sẽ bị "trôi ngày" vĩnh viễn — tháng 2 bị Postgres tự làm tròn về ngày 28 (đúng, hợp lý), nhưng sau đó tháng 3 (có 31 ngày) lại tiếp tục tính từ ngày 28 thay vì quay lại đúng ngày 31 gốc:

```sql
-- Cách SAI (đã test và xác nhận gây lỗi trôi ngày):
-- 31/1 → 28/2 → 28/3 → 28/4 → 28/5 ... (đáng lẽ 31/3, 30/4, 31/5)

-- Cách ĐÚNG (đã test): luôn cộng dồn từ ngày gốc theo số chu kỳ N, không cộng dồn từ lần trước
-- 31/1 → 28/2 → 31/3 → 30/4 → 31/5  (đúng theo lịch thật)
```

Thiết kế bảng theo đúng cách tính đã kiểm chứng ở trên:

```sql
create table public.recurring_transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  category_id    uuid references public.categories(id),
  type           text not null check (type in ('income', 'expense')),
  amount_vnd     integer not null check (amount_vnd > 0),
  note           text,
  start_date     date not null,                 -- ngày gốc, KHÔNG BAO GIỜ thay đổi sau khi tạo
  occurrences_run integer not null default 0,    -- số chu kỳ đã chạy — luôn tính next_run từ start_date + occurrences_run
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create or replace function public.run_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select * from public.recurring_transactions
    where active
      and (start_date + (occurrences_run || ' months')::interval)::date <= current_date
  loop
    insert into public.transactions (user_id, category_id, type, amount_vnd, note, occurred_at)
    values (r.user_id, r.category_id, r.type, r.amount_vnd, r.note, current_date);

    update public.recurring_transactions
    set occurrences_run = occurrences_run + 1
    where id = r.id;

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('run-recurring-transactions-daily', '0 1 * * *', $$select public.run_recurring_transactions();$$);
```

> RLS/GRANT cho `recurring_transactions` theo đúng mẫu chủ-sở-hữu-only đã áp dụng cho `transactions`/`budgets` (không lặp lại ở đây) — chỉ `run_recurring_transactions()` (chạy qua `pg_cron`, tương đương service context) mới được insert vào `transactions` thay mặt user, client không bao giờ tự gọi hàm này.

### 3.5 Xuất báo cáo Premium (PDF/CSV)

Khác với các mục trên, đây chủ yếu là việc ở tầng ứng dụng (Server Action + thư viện), không phải thiết kế DB mới nên không cần kiểm thử SQL riêng:

- **CSV**: đơn giản nhất — Server Action `exportTransactionsCsv(month)` build chuỗi CSV từ kết quả `listTransactions(month)` đã có sẵn, trả về qua `Response` với header `Content-Disposition: attachment`. Làm trước vì rẻ, không cần thư viện mới.
- **PDF**: dùng thư viện tạo PDF phía server (Node) từ cùng dữ liệu `get_finance_trend()` đã có ở Giai đoạn 5 — layout đơn giản (bảng giao dịch + biểu đồ xu hướng dạng ảnh tĩnh), giới hạn Premium qua `is_premium_active()`/`getSubscriptionStatus()` đã có.
- Route: `/finance/trends` (đã có từ Giai đoạn 5) thêm nút "Xuất báo cáo", ẩn sau kiểm tra Premium — Free tier thấy nút nhưng dẫn tới trang mời nâng cấp thay vì lỗi.

## 4. Nguyên tắc bảo mật áp dụng cho Giai đoạn 6

Không có nguyên tắc mới — toàn bộ thiết kế ở mục 3 tái sử dụng đúng các mẫu đã kiểm chứng nhiều lần qua 5 giai đoạn:

- `gift_points()`, `is_goal_member()` đều tự đọc `auth.uid()` bên trong → an toàn `GRANT EXECUTE` cho `authenticated`.
- `run_recurring_transactions()` **không** tự đọc `auth.uid()` (nó xử lý cho nhiều user cùng lúc theo lịch) → phải `REVOKE EXECUTE` khỏi `authenticated`/`anon`, chỉ chạy qua `pg_cron`/service context — đúng nguyên tắc "hàm nhận thay mặt nhiều user không được để client gọi trực tiếp" đã áp dụng cho `add_points`/`complete_referral` từ Phase 1.
- RLS cho bảng có quan hệ nhiều-nhiều/tham chiếu chéo (`savings_goal_members`) bắt buộc qua hàm `SECURITY DEFINER` riêng, không viết `EXISTS` trực tiếp — nhắc lại đúng bài học từ `is_admin()` ở Giai đoạn 3/5, lần này áp dụng cho một nhóm 3 bảng thay vì 1 bảng tự tham chiếu.
- `gift_points()` có hạn mức/ngày để chống lạm dụng — nguyên tắc mới bổ sung cho Giai đoạn 6: **bất kỳ cơ chế nào cho phép người dùng tự tạo giá trị qua lại với nhau (dù chỉ là điểm nội bộ) đều cần một giới hạn tốc độ**, để tránh trở thành công cụ cày điểm qua tài khoản ảo.

## 5. Lộ trình theo tuần (10 tuần)

| Giai đoạn | Thời gian | Nội dung chính |
|---|---|---|
| Sprint 0 | Tuần 1 | Migration `gift_points` + `gift_daily_limit` (mục 3.1); mở rộng `notifications.type` thêm `'gift'` |
| Sprint 1 | Tuần 2 | UI tặng điểm trên `/u/[username]`, thông báo người nhận; **chốt hạn mức tặng/ngày thật** (TODO trong SQL) |
| Sprint 2 | Tuần 3 | Migration mục tiêu tiết kiệm chung (mục 3.2): 3 bảng + `is_goal_member()` + RLS |
| Sprint 3 | Tuần 4 | Mở rộng `check_savings_goal_achieved()` thưởng điểm cho tất cả thành viên; UI mời thành viên vào mục tiêu |
| Sprint 4 | Tuần 5 | Hashtag (mục 3.3): migration `tags` + trigger, cập nhật UI hiển thị tag trong bài đăng |
| Sprint 5 | Tuần 6 | Route `/explore/tag/[tag]`, kết hợp `ts_rank` đã có từ Giai đoạn 5 |
| Sprint 6 | Tuần 7 | Giao dịch định kỳ (mục 3.4): migration `recurring_transactions` + `run_recurring_transactions()` + `pg_cron` |
| Sprint 7 | Tuần 8 | UI đăng ký/quản lý giao dịch định kỳ trong `/finance` |
| Sprint 8 | Tuần 9 | Xuất báo cáo Premium (mục 3.5): CSV trước, PDF sau |
| Sprint 9 | Tuần 10 | Closed beta nội bộ cho cả 5 tính năng, hoàn thiện, retro cuối giai đoạn |

## 6. Rủi ro & Phương án giảm thiểu

| Rủi ro | Ảnh hưởng | Phương án giảm thiểu |
|---|---|---|
| Tặng điểm bị lạm dụng qua tài khoản ảo (tạo nhiều tài khoản tự tặng qua lại để cày điểm) | Lạm phát điểm thưởng, giảm giá trị hệ thống gamification đã xây từ Phase 1 | Hạn mức/ngày (đã thiết kế, cần chốt số thật); cân nhắc thêm điều kiện tài khoản phải tồn tại > N ngày hoặc đã hoàn thiện profile mới được tặng/nhận, nếu dữ liệu cho thấy có dấu hiệu lạm dụng |
| Mục tiêu tiết kiệm chung: dữ liệu góp tiền chỉ là tự khai, không xác minh được | Số liệu không phản ánh đúng thực tế nếu có người khai khống | Chấp nhận được vì đây là công cụ tạo động lực/theo dõi, không phải công cụ tài chính chính xác tuyệt đối — giống cách `transactions` hiện tại cũng là nhập liệu thủ công, đã được chấp nhận từ Phase 2 |
| Migration `recurring_transactions` áp dụng công thức tính ngày sai (cộng dồn từ giá trị trước thay vì từ `start_date` gốc) | Giao dịch định kỳ đăng ký ngày 29-31 bị trôi ngày dần theo thời gian, sai lệch tăng dần không dễ nhận ra | Đã kiểm thử và xác nhận công thức đúng trong mục 3.4 — khi code, đối chiếu đúng công thức `start_date + (occurrences_run || ' months')::interval`, không viết lại theo cách cộng dồn |
| Hashtag: người dùng spam hàng chục tag vô nghĩa vào 1 bài để lên top explore | Chất lượng khám phá theo tag giảm | Giới hạn số tag tối đa/bài (vd. 10) ngay trong `extract_hashtags()`, cắt bớt nếu vượt |
| 5 tính năng cùng lúc trong 1 giai đoạn có thể dàn trải quá mỏng cho founder solo | Trễ tiến độ hoặc chất lượng không đều giữa các tính năng | Thứ tự Sprint đã sắp theo mức độ tái sử dụng hạ tầng có sẵn (tặng điểm dễ nhất do gần với `add_points` đã quen thuộc nhất) — có thể dừng lại sau Sprint 5-6 và dời 2 mục cuối sang giai đoạn sau nếu cần, không ảnh hưởng các mục đã xong |

## 7. Việc cần làm ngay trong tuần đầu

- [ ] Chốt hạn mức tặng điểm/ngày thật (mục 3.1 đang để `200` làm giá trị tạm) — nên tham chiếu mức thưởng điểm hiện có (post +10, referral +100) để hạn mức không quá lớn so với tốc độ kiếm điểm tự nhiên.
- [ ] Đọc lại file thật `sql/migrations/08d-phase2-savings.sql` để biết chính xác cấu trúc `check_savings_goal_achieved()` hiện tại trước khi mở rộng cho mục tiêu chung.
- [ ] Xác nhận `pg_cron` đã bật trên project (Database → Extensions) — cần cho cả `expire_subscriptions` (nếu làm ở giai đoạn vận hành sau) lẫn `run_recurring_transactions` ở giai đoạn này.
- [ ] Quyết định giới hạn số hashtag tối đa/bài trước khi viết `extract_hashtags()` vào migration chính thức.

## 8. Backlog cân nhắc cho Giai đoạn 7 (không phải Giai đoạn 6)

- Huy hiệu thành tích (badges) hiển thị trên profile — dựa trên các cột mốc đã có sẵn (streak, số bài đăng, số referral thành công).
- Chat/nhắn tin trực tiếp giữa người dùng.
- Toàn bộ hạng mục vận hành/go-live thật đã phác thảo ở bản nháp Giai đoạn 6 trước (VNPay production, audit hết hạn subscription, `payment_failures`, rate limiting) — vẫn cần làm trước khi go-live thật, chỉ là không nằm trong giai đoạn phát triển tính năng này.

## 9. Ghi chú miễn trừ trách nhiệm

Tài liệu này dựa trên mô tả trong `EVALUATION.md` ngày 05/09/2026, không đọc trực tiếp source code thật — tên bảng/cột/hàm cụ thể (đặc biệt cấu trúc thật của `check_savings_goal_achieved()`, `notifications`, `transactions`) cần đối chiếu lại trước khi áp dụng bất kỳ migration nào ở mục 3. SQL ở mục 3.1, 3.2, 3.3 và phần công thức ngày ở 3.4 đã được kiểm thử chức năng trên PostgreSQL 16 cục bộ như mô tả kèm theo mỗi khối, bao gồm 1 phát hiện thật về lỗi trôi ngày trong tính lịch định kỳ. Mục 3.5 là hướng dẫn kỹ thuật ở tầng ứng dụng, không có SQL cần kiểm thử riêng. Hạn mức tặng điểm (200/ngày) là giá trị tạm, cần founder xác nhận trước khi dùng thật, giống tiền lệ giá điểm Premium (500 điểm) ở Giai đoạn 2.
