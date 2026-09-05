# Money App — Kế hoạch phát triển Giai đoạn 5 (Production-ready & Nâng cao)

> Soạn dựa trên `EVALUATION.md` cập nhật ngày 05/09/2026 (commit `84dbb07`). **Lưu ý về đánh số**: EVALUATION.md hiện đã tự đánh số "Phase 4" cho các hạng mục Realtime/Search vừa hoàn thành và liệt kê sẵn mục "P5 — Horizon" cho các việc tiếp theo — tài liệu này vì vậy được đặt tên **Giai đoạn 5**, tiếp nối đúng theo số thứ tự bạn đang dùng trong EVALUATION.md, để không gây nhầm lẫn với Phase 4 đã Done. Nếu ý bạn là một phạm vi khác, chỉ cần nói lại phạm vi mong muốn.

## 0. Tóm tắt & Phân tích hiện trạng

Theo EVALUATION.md mới nhất, cả 4 giai đoạn trước đều đã **Done gần như tuyệt đối** — kể cả toàn bộ các mục Track A/Track B từng đề xuất ở Giai đoạn 3 (admin dashboard, referral deep link, shop marketplace với cơ chế `FOR UPDATE SKIP LOCKED` đúng như đã kiểm thử, security hardening) và toàn bộ backlog Real-time/Search từng dời sang "Giai đoạn 3" ở kế hoạch Giai đoạn 2 (nay gọi là Phase 4). Điểm đáng chú ý nhất khi đối chiếu：

- **Một đề xuất trong bản brief Giai đoạn 3 đã KHÔNG được áp dụng đúng như khuyến nghị**: mục "Nợ kỹ thuật còn lại" vẫn liệt kê *"Referral code không unique ở DB — SHA-256 OK cho MVP; cần unique DB column + ON CONFLICT nếu scale"*. Brief Giai đoạn 3 đã đề xuất migration thêm cột `referral_code unique` + trigger sinh mã (đã kiểm thử cục bộ, kể cả phát hiện và sửa lỗi `infinite recursion` trong RLS admin) — có vẻ team đã chọn giữ cách tính SHA-256 runtime cho deep link thay vì áp dụng migration đó. Đây là hạng mục ưu tiên đóng dứt điểm ở Giai đoạn 5 vì không còn lý do kỹ thuật để trì hoãn thêm.
- Đội đã tự phát hiện và vá thêm 3 vấn đề bảo mật mới không có trong brief của tôi (privilege escalation qua broad GRANT trên `profiles`, PostgREST filter injection trong search, LIKE metacharacter injection) — cho thấy quy trình rà bảo mật đang được duy trì tốt, độc lập với các brief được cung cấp.
- Không còn mục Todo/Partial nào ở tầng tính năng cốt lõi. Nợ kỹ thuật còn lại đều ở mức nhẹ (🟡), và toàn bộ điểm P5 Horizon trong EVALUATION.md đều là các hạng mục **mở rộng/vận hành** chứ không phải sửa lỗi — đây là tín hiệu tốt để chuyển trọng tâm Giai đoạn 5 sang production-readiness và chiều sâu tính năng, thay vì tiếp tục mở rộng bề ngang.

## 1. Mục tiêu Giai đoạn 5

Tổng hợp đúng 5 hạng mục P5 Horizon đã có sẵn trong EVALUATION.md, cộng thêm việc đóng nốt khoản nợ kỹ thuật referral, sắp xếp lại theo mức độ rủi ro nếu trì hoãn (không theo thứ tự liệt kê gốc):

1. **Test suite** — nâng ưu tiên lên cao nhất: sau 4 giai đoạn không có test tự động nào, mọi thay đổi từ giờ đều có rủi ro hồi quy (regression) ngày càng lớn, đặc biệt với logic tiền/điểm.
2. **Deploy production** — điều kiện tiên quyết để tính năng mới nào cũng thực sự tạo giá trị, và giờ đã có nhiều luồng tiền thật (topup, subscription, shop) chờ deploy.
3. **Đóng nợ referral_code unique** — nhỏ, nhanh, đã có sẵn thiết kế đã kiểm thử từ brief Giai đoạn 3.
4. **Search nâng cao** — cải thiện trải nghiệm đã có, rủi ro kỹ thuật thấp.
5. **Premium analytics** — tính năng mới tạo thêm giá trị cho gói Premium hiện có.
6. **Referral analytics** — tính năng mới, ít rủi ro, có thể làm sau cùng.

## 2. Phạm vi Giai đoạn 5

### 2.1 Sẽ làm

- Test suite: Vitest cho unit test (validators, business logic thuần), Playwright cho E2E (các luồng có tiền/điểm thật).
- Deploy production đầy đủ: Supabase Cloud, Vercel, VNPay production credentials, checklist bảo mật trước khi mở public.
- Migration đóng nợ referral_code (áp dụng thiết kế đã kiểm thử từ Giai đoạn 3, có điều chỉnh nhỏ để tương thích ngược với dữ liệu referral hiện có).
- Search nâng cao: ranking theo độ liên quan (`ts_rank`), autocomplete/gợi ý gõ chưa dấu (`pg_trgm` + `unaccent`).
- Premium analytics: biểu đồ thu/chi nhiều tháng + xu hướng tiết kiệm, giới hạn cho tài khoản Premium.
- Referral analytics: leaderboard + dashboard thống kê cho người dùng.

### 2.2 Sẽ KHÔNG làm trong Giai đoạn 5

- Tích hợp bộ gõ/stemmer tiếng Việt thật sự (không có sẵn trong PostgreSQL lõi — xem lưu ý ở mục 4.4). Nếu cần chính xác hơn nữa, đây là việc tích hợp dịch vụ NLP ngoài, vượt phạm vi một giai đoạn.
- Xuất báo cáo PDF/Excel cho Premium analytics — dời tiếp sang giai đoạn sau nếu nhu cầu người dùng xác nhận qua dữ liệu sử dụng thực tế của bản trend/chart cơ bản trước.
- Sửa vi tối ưu `followingIds` re-subscribe (nợ kỹ thuật 🟡 mức thấp nhất, chấp nhận được ở quy mô hiện tại theo đúng ghi chú trong EVALUATION.md) — có thể gộp vào bất kỳ sprint nào còn dư thời gian, không cần kế hoạch riêng.

## 3. Thiết kế kỹ thuật chi tiết

### 3.1 Test suite

**Vitest (unit test)** — ưu tiên phần logic thuần, không cần DB thật:

```
tests/unit/
  validators/finance.test.ts       — Zod schema: amount_vnd > 0, note ≤ 200 ký tự, biên giá trị (0, âm, số thập phân)
  validators/search.test.ts        — hàm escape LIKE metachar: input chứa %, _, \ phải được escape đúng
  lib/limits.test.ts               — checkFreeLimit() biên giới: đúng ngưỡng (3 budget, 1 goal, 50 note, 20 todo) và ngưỡng+1
  lib/hmac.test.ts                 — crypto.timingSafeEqual wrapper: chữ ký đúng/sai/độ dài khác nhau
```

**Playwright (E2E)** — ưu tiên các luồng có tiền/điểm thật hoặc rủi ro bảo mật cao, chạy trên Supabase local (`supabase start` trong CI):

```
tests/e2e/
  auth.spec.ts       — đăng ký OTP (đọc mã từ Mailpit API cục bộ), đăng nhập, middleware chặn locked user
  wallet.spec.ts     — nạp điểm qua VNPAY_MOCK=1, xác nhận points_ledger + balance cập nhật đúng sau webhook
  shop.spec.ts       — mua sản phẩm bằng điểm; chạy 2 request song song tranh 1 mã cuối, xác nhận chỉ 1 thành công
  referral.spec.ts   — truy cập /join?ref=CODE, đăng ký, xác nhận referred_by được gắn đúng
  search.spec.ts     — tìm không dấu ra kết quả có dấu, kiểm tra input chứa % _ không gây lỗi/leak dữ liệu
  admin.spec.ts      — non-admin bị chặn truy cập /admin; admin lock user thành công
```

> `shop.spec.ts` (2 request song song tranh 1 mã) là test quan trọng nhất trong toàn bộ suite — đây là cách duy nhất phát hiện sớm nếu một thay đổi tương lai vô tình phá vỡ cơ chế `FOR UPDATE SKIP LOCKED` đã được xác nhận đúng ở Giai đoạn 3.

**CI**: GitHub Actions — job `test` chạy `supabase start` (hoặc dùng Supabase CLI trong container), `./scripts/migrate.sh`, `npm run test:unit`, `npm run test:e2e`; chặn merge vào `main` nếu bất kỳ bước nào fail.

### 3.2 Deploy production

Checklist theo thứ tự, không bỏ bước:

| Bước | Nội dung |
|---|---|
| 1 | Tạo Supabase Cloud project (region Singapore), chạy `./scripts/migrate.sh` nhắm vào project thật, xác nhận đủ 15 migration theo đúng thứ tự trong `sql/migrations/`. |
| 2 | Set secrets thật: `supabase secrets set VNPAY_HASH_SECRET=... VNPAY_TMN_CODE=...` (giá trị production từ VNPay, không phải `devsecret`/`TEST`). |
| 3 | Deploy Edge Function `payment-webhook`: `npx supabase functions deploy payment-webhook`; cập nhật URL callback này trong dashboard VNPay production. |
| 4 | Deploy frontend lên Vercel, set `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` trỏ vào project Cloud, `NEXT_PUBLIC_SITE_URL` trỏ vào domain thật. |
| 5 | Cập nhật Authentication → URL Configuration trên Supabase Cloud: `Site URL` + `Redirect URLs` khớp domain production (khác hẳn `localhost` lúc dev). |
| 6 | **Xoá/disable route `/mock/vnpay`** khỏi build production — đã có sẵn `notFound()` khi thiếu `VNPAY_MOCK` theo EVALUATION.md, chỉ cần xác nhận biến này thực sự không được set trên Vercel production. |
| 7 | Bật Point-in-Time Recovery (PITR) trên Supabase Cloud cho project có tiền thật — mức tối thiểu để có thể khôi phục nếu xảy ra sự cố dữ liệu. |
| 8 | Thiết lập theo dõi lỗi runtime (Sentry hoặc tương đương) cho cả Next.js app và Edge Function — hiện tại admin dashboard chỉ có dữ liệu nghiệp vụ (doanh thu, giao dịch), chưa có kênh nào báo lỗi kỹ thuật khi webhook thất bại âm thầm. |
| 9 | Chạy lại toàn bộ Playwright suite (mục 3.1) nhắm vào staging trước khi trỏ domain thật vào production. |

### 3.3 Đóng nợ kỹ thuật: `referral_code` unique ở DB

Áp dụng lại thiết kế đã kiểm thử ở brief Giai đoạn 3 (trigger sinh mã ngẫu nhiên unique + hàm `get_referrer_by_code()`), với một điều chỉnh vì lần này đã có dữ liệu referral thật đang chạy bằng SHA-256(user.id):

```sql
alter table public.profiles add column if not exists referral_code text unique;

-- Backfill: giữ đúng mã SHA-256 hiện tại của user cũ (để link đã chia sẻ trước đó
-- không bị hỏng), CHỈ user mới từ nay trở đi mới dùng mã ngẫu nhiên sinh bởi trigger
update public.profiles
set referral_code = lower(substr(encode(sha256(id::text::bytea), 'hex'), 1, 8))
where referral_code is null;

-- Trigger cho user MỚI — đã kiểm thử ở Giai đoạn 3 (tạo 3 profile liên tiếp,
-- referral_code khác nhau, không trùng)
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
```

Sau migration, cập nhật `referral.actions.ts` để đọc `profiles.referral_code` trực tiếp thay vì tính `SHA-256(user.id)` mỗi lần — giảm 1 chỗ tính toán runtime không cần thiết, và làm cho `/join?ref=CODE` tra cứu bằng index `UNIQUE` thay vì phải tính lại hash để so khớp.

> Vì user cũ giữ nguyên mã SHA-256 làm `referral_code` (chỉ backfill, không đổi), toàn bộ link `/join?ref=...` đã từng được chia sẻ trước Giai đoạn 5 vẫn hoạt động bình thường — không có breaking change nào cho người dùng hiện tại.

### 3.4 Search nâng cao

**Kiểm thử cục bộ trước khi viết vào kế hoạch** (PostgreSQL 16, extension `pg_trgm` + `unaccent`) phát hiện 1 vấn đề cần lưu ý ngay: `unaccent()` gọi trực tiếp trong cột `GENERATED ALWAYS AS ... STORED` bị Postgres từ chối với lỗi `generation expression is not immutable` (vì `unaccent()` phụ thuộc tra cứu text search configuration, được đánh dấu `STABLE` chứ không phải `IMMUTABLE`). Cách khắc phục chuẩn — bọc lại bằng 1 hàm wrapper ép `IMMUTABLE` — đã test lại và xác nhận hoạt động đúng, cả tìm kiếm không dấu lẫn autocomplete fuzzy:

```sql
-- Wrapper bắt buộc để dùng unaccent() trong generated column / index —
-- an toàn vì bản thân dictionary 'unaccent' không đổi giữa các lần gọi.
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', $1);
$$;

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- Ranking theo độ liên quan thay vì chỉ lọc có/không khớp
select id, content,
       ts_rank(search_vector, websearch_to_tsquery('simple', public.immutable_unaccent(:query))) as rank
from public.posts
where search_vector @@ websearch_to_tsquery('simple', public.immutable_unaccent(:query))
order by rank desc
limit 20;

-- Autocomplete: gợi ý dựa trên độ giống chuỗi (trigram), chấp nhận gõ thiếu dấu/gõ tắt
create index if not exists posts_content_trgm_idx on public.posts using gin (content gin_trgm_ops);

select content, similarity(public.immutable_unaccent(content), public.immutable_unaccent(:partial_query)) as sim
from public.posts
where public.immutable_unaccent(content) % public.immutable_unaccent(:partial_query)
order by sim desc
limit 5;
```

**✅ Đã kiểm thử**: với dữ liệu mẫu tiếng Việt có dấu, truy vấn `websearch_to_tsquery` với input **không dấu** ("quan ly tai chinh") xếp hạng đúng bài viết liên quan nhất lên đầu; truy vấn autocomplete với input rút gọn không dấu ("quan ly", "quan") trả về đúng các tiêu đề chứa cụm từ gần giống, sắp xếp theo độ tương đồng giảm dần.

**Lưu ý về "Vietnamese stemming" trong mục P5 Horizon**: PostgreSQL không có sẵn bộ stemmer/từ điển tiếng Việt trong lõi (danh sách ngôn ngữ Snowball tích hợp không có tiếng Việt). Cấu hình `to_tsvector('simple', ...)` mà Phase 4 đang dùng, kết hợp `unaccent` + `pg_trgm` như trên, là hướng tiếp cận thực tế nhất trong khả năng của Postgres thuần — cải thiện được độ liên quan (ranking) và khả năng chịu lỗi chính tả/thiếu dấu, nhưng không tạo ra stemming thật (vd. tự nhận "quản lý"/"quản lí" là cùng gốc). Nếu cần mức đó, sẽ cần tích hợp dịch vụ xử lý ngôn ngữ tiếng Việt bên ngoài — nên coi là mục riêng ngoài phạm vi Giai đoạn 5, quyết định sau khi có dữ liệu thực tế về mức độ người dùng gõ sai/thiếu dấu.

### 3.5 Premium analytics

```sql
-- RPC tổng hợp xu hướng thu/chi N tháng gần nhất, chỉ trả dữ liệu của chính auth.uid()
create or replace function public.get_finance_trend(p_months integer default 6)
returns table (month date, total_income integer, total_expense integer)
language sql
security definer
set search_path = public
stable
as $$
  select date_trunc('month', occurred_at)::date as month,
         coalesce(sum(amount_vnd) filter (where type = 'income'), 0)::integer as total_income,
         coalesce(sum(amount_vnd) filter (where type = 'expense'), 0)::integer as total_expense
  from public.transactions
  where user_id = auth.uid()
    and occurred_at >= (current_date - (p_months || ' months')::interval)
  group by 1
  order by 1;
$$;

grant execute on function public.get_finance_trend(integer) to authenticated;
```

Hàm tự đọc `auth.uid()` bên trong nên an toàn để `GRANT EXECUTE` trực tiếp cho `authenticated`, đúng nguyên tắc đã áp dụng xuyên suốt dự án — không cần thêm RLS riêng vì không đọc bảng nào ngoài phạm vi hàm kiểm soát. Ở tầng Server Action, `getFinanceTrend()` gọi RPC này và kiểm tra `getSubscriptionStatus()` — chỉ Premium mới truy cập trang `/finance/trends`, Free tier thấy trang mời nâng cấp thay vì lỗi 403.

UI: biểu đồ đường (thu, chi theo tháng) + biểu đồ cột xu hướng tiết kiệm (`total_income - total_expense` tích luỹ), route `/finance/trends`.

### 3.6 Referral analytics

```sql
create or replace function public.get_referral_stats()
returns table (total_invited integer, total_completed integer, points_earned integer)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(*)::integer as total_invited,
    count(*) filter (where status in ('completed', 'rewarded'))::integer as total_completed,
    coalesce(sum(delta) filter (where reason_code = 'referral_out'), 0)::integer as points_earned
  from public.referrals r
  left join public.points_ledger pl on pl.reference_id = r.id and pl.user_id = r.referrer_id
  where r.referrer_id = auth.uid();
$$;

grant execute on function public.get_referral_stats() to authenticated;

-- Leaderboard công khai (opt-in): chỉ hiện display_name + số liệu, không lộ thông tin nhạy cảm
create or replace view public.referral_leaderboard as
select p.display_name, p.avatar_url,
       count(*) filter (where r.status in ('completed', 'rewarded')) as total_referrals
from public.referrals r
join public.profiles p on p.id = r.referrer_id
group by p.id, p.display_name, p.avatar_url
order by total_referrals desc
limit 50;

grant select on public.referral_leaderboard to authenticated, anon;
```

> `referral_leaderboard` là `VIEW` công khai theo thiết kế (giống tinh thần bảng `rewards`/`shop_products` hiện có) — chỉ lộ `display_name`/`avatar_url`/số lượt giới thiệu thành công, không lộ điểm số hay thông tin tài chính. Nên cân nhắc thêm cột `leaderboard_opt_in boolean default true` trên `profiles` nếu muốn cho người dùng tắt hiển thị tên mình công khai.

## 4. Nguyên tắc bảo mật áp dụng cho Giai đoạn 5

Không có ngoại lệ mới — mọi hàm/bảng ở mục 3 đều tuân thủ đúng các nguyên tắc đã xuyên suốt 4 giai đoạn trước:

- `get_finance_trend()`, `get_referral_stats()` tự đọc `auth.uid()` bên trong → an toàn `GRANT EXECUTE` cho `authenticated`.
- `referral_leaderboard` chỉ là `VIEW` tổng hợp, không lộ dữ liệu gốc của bảng `referrals`/`points_ledger`.
- `generate_referral_code()` tiếp tục là `SECURITY DEFINER SET search_path = public` đúng mẫu đã kiểm thử.
- Test E2E ở mục 3.1 (`shop.spec.ts`) chính là cách để nguyên tắc "test trước khi tin là đúng" — vốn đã bắt được 3 lỗi thật (missing GRANT, missing REVOKE EXECUTE, missing SECURITY DEFINER, RLS recursion) qua các giai đoạn trước — được duy trì tự động, không còn phụ thuộc vào việc dựng Postgres cục bộ thủ công mỗi lần.

## 5. Lộ trình theo tuần (10 tuần)

| Giai đoạn | Thời gian | Nội dung chính |
|---|---|---|
| Sprint 0 | Tuần 1 | Viết Vitest cho phần validators/limits/hmac (rủi ro thấp, làm trước để có nền CI ngay) |
| Sprint 1 | Tuần 2 | Setup Playwright + CI (GitHub Actions chạy `supabase start`); viết `auth.spec.ts`, `admin.spec.ts` |
| Sprint 2 | Tuần 3 | `wallet.spec.ts`, `shop.spec.ts` (ưu tiên cao nhất — test concurrency); `referral.spec.ts`, `search.spec.ts` |
| Sprint 3 | Tuần 4 | Migration đóng nợ `referral_code` (mục 3.3); cập nhật `referral.actions.ts` |
| Sprint 4 | Tuần 5 | Checklist deploy production bước 1-5 (mục 3.2): Supabase Cloud, secrets, Edge Function, Vercel, URL config |
| Sprint 5 | Tuần 6 | Checklist deploy production bước 6-9: gỡ mock route, PITR, Sentry, chạy lại E2E trên staging; **go-live** |
| Sprint 6 | Tuần 7 | Search nâng cao (mục 3.4): migration `unaccent`/`pg_trgm`, ranking, autocomplete UI ở `/explore` |
| Sprint 7 | Tuần 8 | Premium analytics (mục 3.5): RPC + UI `/finance/trends` |
| Sprint 8 | Tuần 9 | Referral analytics (mục 3.6): RPC + leaderboard UI, gộp vào `/invite` hiện có |
| Sprint 9 | Tuần 10 | Hoàn thiện, chạy lại toàn bộ test suite trên production, retro cuối giai đoạn |

## 6. Rủi ro & Phương án giảm thiểu

| Rủi ro | Ảnh hưởng | Phương án giảm thiểu |
|---|---|---|
| Viết test suite sau 4 giai đoạn có thể phát hiện bug cũ đang âm thầm chạy sai | Trễ tiến độ Sprint 0-2 nếu phải dừng lại sửa bug phát hiện qua test | Chấp nhận là kết quả tích cực, không phải rủi ro cần né — ưu tiên sửa ngay khi phát hiện, xem như một phần giá trị của việc thêm test |
| Deploy production lần đầu luôn tiềm ẩn rủi ro cấu hình sai (redirect URL, secrets nhầm giữa test/production) | Người dùng thật không đăng nhập được, hoặc webhook thanh toán thật thất bại | Theo đúng thứ tự checklist mục 3.2, không bỏ bước; chạy lại toàn bộ E2E trên staging trước khi trỏ domain thật (bước 9) |
| Backfill `referral_code` cho user cũ chạy trên dữ liệu production thật, không phải test | Sai sót ảnh hưởng trực tiếp link đã chia sẻ | Migration đã thiết kế để backfill giữ nguyên giá trị SHA-256 hiện có (không đổi mã cũ) — chạy thử trên bản sao production trước khi áp dụng thật |
| Search nâng cao dùng `unaccent` trực tiếp trong generated column sẽ lỗi ngay khi chạy (đã xác nhận qua kiểm thử) | Migration fail giữa chừng nếu copy sai từ tài liệu cũ chưa có wrapper `immutable_unaccent()` | SQL trong mục 3.4 đã là bản có wrapper, đã kiểm thử chạy được — không dùng phiên bản `unaccent()` gọi trực tiếp |
| Premium analytics/Referral analytics là tính năng mới nhưng không ai dùng | Tốn công sức Sprint 7-8 không tạo giá trị đo được | Đặt KPI tối thiểu theo dõi qua admin dashboard đã có (số lượt truy cập `/finance/trends`, `/invite`) trong 2 tuần đầu ra mắt, không cần chờ hết giai đoạn mới đánh giá |

## 7. Việc cần làm ngay trong tuần đầu

- [ ] Cài `vitest` + `@playwright/test`, tạo cấu trúc thư mục `tests/unit/` và `tests/e2e/` như mục 3.1.
- [ ] Viết xong tối thiểu 4 file unit test (validators, limits, hmac) trước khi động vào bất kỳ migration nào.
- [ ] Tạo Supabase Cloud project mới (chưa trỏ domain thật vào) để bắt đầu chuẩn bị song song cho Sprint 4-5.
- [ ] Áp dụng migration đóng nợ `referral_code` (mục 3.3) trên môi trường local/staging trước, xác nhận link cũ vẫn hoạt động, trước khi đưa vào lộ trình chính thức.

## 8. Ghi chú miễn trừ trách nhiệm

Tài liệu này là kế hoạch kỹ thuật dựa trên trạng thái thực tế ghi nhận tại `EVALUATION.md` ngày 05/09/2026 — không dựa trên việc đọc trực tiếp source code repo thật, nên tên bảng/cột/hàm cụ thể cần đối chiếu lại trước khi chạy bất kỳ migration nào ở mục 3. SQL ở mục 3.4 (search nâng cao) đã được kiểm thử chức năng trên PostgreSQL 16 cục bộ với dữ liệu mẫu (bao gồm phát hiện và sửa lỗi `unaccent() not immutable` thật khi test); SQL ở mục 3.3 tái sử dụng nguyên bản thiết kế đã kiểm thử ở brief Giai đoạn 3. SQL ở mục 3.5 và 3.6 là truy vấn tổng hợp đơn giản (GROUP BY/JOIN cơ bản) chưa chạy kiểm thử riêng trong phiên soạn tài liệu này — nên xác nhận lại trên schema thật (đặc biệt tên cột `reference_id` trong `points_ledger` và cấu trúc bảng `referrals`) trước khi coi là hoàn tất. Các con số về thời gian là ước tính hợp lý, không phải cam kết.
