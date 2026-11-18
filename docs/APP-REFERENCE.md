# Money App — App Reference

> Cập nhật: 2026-09-18 · Stack: Next.js 16 + Supabase · Phase 1–5 production-ready · Phase 6 in design

Ứng dụng quản lý tài chính cá nhân kết hợp mạng xã hội và gamification. Người dùng theo dõi thu/chi, đặt ngân sách, đặt mục tiêu tiết kiệm, đồng thời tương tác trên feed xã hội và kiếm điểm từ các hành động hàng ngày.

---

## Roles

| Role | Mô tả |
|---|---|
| **User (free)** | Tài khoản mặc định; bị giới hạn budgets/savings/notes/todos |
| **User (premium)** | Mở giới hạn; mua bằng 500 điểm hoặc 19.000đ VNPay |
| **Admin** | Truy cập `/admin`; lock/unlock user, ẩn bài, quản lý rewards/shop |

---

## Feature Map

### Phase 1 — Mạng xã hội ✅

| Tính năng | Route | Ghi chú |
|---|---|---|
| Đăng ký / Đăng nhập | `/login`, `/register` | OTP magic link; Google OAuth ready |
| Landing page | `/` | Redirect `/feed` nếu đã login |
| Onboarding bonus | `/feed?welcome=1` | `WelcomeBanner` hiện +50 điểm |
| Feed bài đăng | `/feed` | Server Component + cursor infinite scroll; chỉ hiện bài của người đang follow |
| Đăng bài + ảnh | `/feed` | Supabase Storage; URL validation server-side |
| Like / Comment | inline feed | Optimistic update với rollback |
| Follow / Unfollow | `/u/[username]` | Optimistic; public profile |
| Hồ sơ người dùng | `/profile` | Avatar upload, bio, display name |
| Ví điểm | `/wallet` | Lịch sử ledger + RealtimeBalance |
| Nạp điểm VNPay | `/wallet/topup` | Mock local (`VNPAY_MOCK=1`); production-ready |
| Referral / Giới thiệu | `/invite`, `/join?ref=CODE` | Route Handler ghi cookie trước redirect signup |
| Thông báo | `/notifications` | Badge realtime; push khi nhận code shop |
| Real-time feed | `/feed` | `NewPostsBanner` — Supabase Realtime INSERT filter |
| Real-time wallet | `/wallet` | Subscribe `points_ledger` INSERT |
| Search toàn cục | `/explore` | Full-text `tsvector` + GIN index + `pg_trgm` autocomplete |
| Admin dashboard | `/admin` | Lock user, ẩn bài, quản lý rewards |

### Phase 2 — Tài chính & Năng suất ✅

| Tính năng | Route | Ghi chú |
|---|---|---|
| Giao dịch thu/chi | `/finance`, `/finance/new` | CRUD; lọc theo tháng qua `?month=YYYY-MM` |
| Ngân sách tháng | `/finance/budgets` | Upsert qua RPC + advisory lock; progress bar |
| Mục tiêu tiết kiệm | `/finance/goals` | Trigger trao điểm khi đạt |
| Ghi chú | `/notes` | Pin/unpin; Free: max 50 |
| To-do | `/todos` | Done/undone + due date; Free: max 20 active |
| Premium subscription | `/billing/upgrade` | 500 điểm hoặc 19.000đ VNPay |

### Phase 3 — Shop & Security ✅

| Tính năng | Route | Ghi chú |
|---|---|---|
| Shop marketplace | `/shop` | Mua code bằng điểm; `complete_payment_shop()` RPC |
| Shop code double-assign guard | — | `FOR UPDATE SKIP LOCKED` + UNIQUE index |
| Buyer notification | — | Trigger push khi code được gán |
| Referral deep link | `/join?ref=CODE` | Ghi `referral_code` vào cookie → xử lý khi signup |
| Locked user enforcement | — | Middleware check `profiles.locked` → redirect login |

### Phase 4 — Realtime & Search ✅

| Tính năng | Route | Ghi chú |
|---|---|---|
| GIN full-text indexes | — | `posts_search_idx` + `profiles_search_idx` |
| Search autocomplete | `/explore` | `pg_trgm` + `ts_rank` relevance scoring |
| Realtime feed banner | `/feed` | Filter `followingIds` → chỉ bài của người follow |
| Realtime wallet balance | `/wallet` | Subscribe per-user channel |
| Month picker | `/finance` | ← → navigation; next disabled tại tháng hiện tại |

### Phase 5 — Production-Ready ✅

| Tính năng | Ghi chú |
|---|---|
| Unit tests (Vitest) | 40 tests: validators, VNPay crypto, limits, search |
| E2E tests (Playwright) | 10 tests: auth, referral, search, wallet, shop concurrency, admin |
| Advanced search ranking | `immutable_unaccent()` + `ts_rank` scoring |
| Premium analytics: trend chart | `get_finance_trend()` RPC + `/finance/trends` SVG chart |
| Referral analytics & leaderboard | `get_referral_stats()` RPC + `/invite` top 10 |
| Deploy checklist | `docs/deploy/production-checklist.md` |

### Phase 6 — Tính năng mới 🔄 (in design)

| Tính năng | Route | Sprint | Ghi chú |
|---|---|---|---|
| Gift Points | `/u/[username]` (modal) | 0–1 | Tặng điểm; daily limit 200pts/ngày; RPC atomic |
| Shared Savings Goals | `/finance/goals/[id]` tab | 2–3 | Nhiều thành viên đóng góp; trigger chia điểm khi đạt |
| Hashtags & Explore | `/explore/tag/[tag]` | 4–5 | `posts.tags[]` tự động extract; GIN index |
| Recurring Transactions | `/finance/recurring` | 6–7 | `pg_cron` daily 1am; công thức tháng chống drift |
| Premium Export | `/finance/trends` → export | 8–9 | CSV (no dep) + PDF (`@react-pdf/renderer`); Premium-gated |

---

## Core User Flows

### Auth flow

```
1. User vào /login → nhập email → nhận OTP/magic link (Inbucket local)
2. Click link → /join Route Handler (nếu có ref=CODE: ghi cookie)
3. Middleware refreshes session → set Supabase SSR cookie
4. Redirect → /feed (hoặc /feed?welcome=1 nếu signup mới)
5. Trigger signup-bonus: +50 điểm tự động
```

### Onboarding flow

```
1. /feed?welcome=1 → WelcomeBanner hiện (+50 điểm)
2. User vào /profile → upload avatar + điền bio
3. Trigger profile-complete: +20 điểm
4. User đăng bài đầu tiên → Trigger post-bonus: +10 điểm
```

### Finance flow

```
1. /finance (mặc định: tháng hiện tại)
2. MonthPicker ← → để đổi tháng (?month=YYYY-MM)
3. "Thêm giao dịch" → /finance/new → Server Action → redirect /finance
4. /finance/budgets → xem progress bar theo danh mục
5. /finance/goals → tạo mục tiêu → đóng góp dần → khi đạt: trigger +điểm
6. /finance/trends (Premium) → SVG chart income/expense theo tháng
```

### Social flow

```
1. /feed → danh sách bài của người đang follow (cursor-based infinite scroll)
2. NewPostsBanner xuất hiện khi có bài mới từ following → click refresh
3. Like/Comment: optimistic update, rollback nếu server lỗi
4. /u/[username] → public profile + Follow/Unfollow
5. /explore → full-text search posts + users
```

### Shop flow

```
1. /shop → danh sách sản phẩm
2. User chọn → confirm mua bằng điểm
3. complete_payment_shop() RPC: atomic deduct points + assign code
4. assign_shop_code() dùng FOR UPDATE SKIP LOCKED → chống race condition
5. Trigger: push notification cho buyer với code đã gán
6. User xem code trong /notifications
```

### Premium upgrade flow

```
Path A — Dùng điểm:
  /billing/upgrade → "Dùng 500 điểm" → subscribe_premium_with_points() RPC → instant

Path B — VNPay:
  /billing/upgrade → "Thanh toán 19.000đ" → /wallet/topup → VNPay gateway
  → return /wallet/topup/return → Edge Function webhook → complete_payment() subscription branch
```

### Referral flow

```
1. User A vào /invite → copy link /join?ref=CODE
2. User B click link → Route Handler ghi referral_code vào cookie → redirect /register
3. User B đăng ký → Server Action đọc cookie → gọi create_referral() RPC
4. RPC: insert referral record + trao điểm cho cả A và B
5. /invite → leaderboard top 10 referrers
```

---

## Data Model (tables chính)

| Table | Mô tả |
|---|---|
| `profiles` | User profile; `locked`, `is_premium`, `referral_code` |
| `posts` | Bài đăng; `hidden`, `tags text[]` (Phase 6) |
| `likes`, `comments` | Tương tác social |
| `follows` | Follow graph |
| `points_ledger` | Append-only; mọi giao dịch điểm; trigger block UPDATE/DELETE |
| `notifications` | Push; type: follow/like/comment/points/referral/shop/gift |
| `categories` | 6 hệ thống + user-defined |
| `transactions` | Thu/chi của user |
| `budgets` | Ngân sách theo category/tháng |
| `savings_goals` | Mục tiêu tiết kiệm; `current_amount`, `target_amount` |
| `notes` | Ghi chú có pin |
| `todos` | To-do với due date |
| `subscriptions` | Premium status; INSERT/UPDATE chỉ qua RPC |
| `referral_codes` | UNIQUE code per user |
| `shop_products`, `shop_codes`, `shop_orders` | Marketplace |
| `gift_daily_limit` | Phase 6: daily gift cap per user |
| `savings_goal_members`, `savings_goal_contributions` | Phase 6: shared goals |
| `recurring_transactions` | Phase 6: lịch giao dịch tự động |

**Migrations:** `sql/migrations/06–24.sql` — chạy theo thứ tự số.

---

## Gamification

| Sự kiện | Điểm | Cơ chế |
|---|---|---|
| Đăng ký | +50 | Trigger `01-signup-bonus` |
| Hoàn thiện profile | +20 | Trigger `02-profile-complete` (bio + avatar not null) |
| Đăng bài | +10 | Trigger `03-post-bonus` |
| Login streak | +5/+10/+20 | Trigger `04-login-streak`; multiplier theo ngày liên tiếp |
| Nạp điểm VNPay | 1.000đ = 1đ | `complete_payment()` RPC: `FLOOR(amount_vnd / 1000)` |
| Đạt mục tiêu tiết kiệm | +điểm | Trigger `check_savings_goal_achieved()` |
| Referral thành công | +điểm | `complete_referral()` RPC: trao cho cả A và B |
| Nhận gift (Phase 6) | +amount | `gift_points()` RPC: sender bị trừ, receiver được cộng |

**Redeem:** `/redeem` — đổi điểm lấy phần thưởng (admin quản lý danh sách).

---

## Premium Gates

| Tính năng | Free | Premium |
|---|---|---|
| Ngân sách/tháng | 3 | Không giới hạn |
| Mục tiêu tiết kiệm | 1 | Không giới hạn |
| Ghi chú | 50 | Không giới hạn |
| To-do đang hoạt động | 20 | Không giới hạn |
| Trend chart `/finance/trends` | ✅ | ✅ |
| Export CSV/PDF (Phase 6) | Upsell link | ✅ |
| Giao dịch | Không giới hạn | Không giới hạn |

**Enforce:** Budgets → DB RPC với advisory lock. Savings/Notes/Todos → Server Action `checkFreeLimit()`. Không có gì enforce qua RLS đơn thuần.

**Mua Premium:**
- 500 điểm → `subscribe_premium_with_points()` RPC (instant)
- 19.000đ VNPay → webhook Edge Function → `complete_payment()` subscription branch

---

## Security Boundaries

| Bất biến | Chi tiết |
|---|---|
| `points_ledger` | Append-only; trigger block UPDATE/DELETE ở DB |
| `subscriptions` | Client không bao giờ INSERT/UPDATE trực tiếp — chỉ qua RPC |
| `add_points`, `complete_referral` | REVOKE từ public/anon/authenticated; chỉ trigger + service_role |
| Payment | `complete_payment()` RPC — atomic trong 1 transaction; gọi từ Edge Function với service_role |
| Storage | Upload chỉ vào `{user_id}/` của chính mình |
| Admin actions | Check `is_admin()` function (SECURITY DEFINER) trong mọi admin RPC |
| Realtime channel | Filter `user_id=eq.${userId}` — không nhận event của user khác |
| Search | LIKE metachar escaped trước khi interpolate vào `.ilike()` |
| All triggers | `SECURITY DEFINER SET search_path = public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chỉ trong Edge Functions via `Deno.env` — không bao giờ vào frontend |

---

## Architecture nhanh

```
src/
  app/                    — Next.js App Router pages
  features/<name>/        — Self-contained: actions.ts + components/ + __tests__/
  lib/
    supabase/server.ts    — createClient() async, cookies() từ next/headers
    supabase/client.ts    — browser singleton (Realtime)
    supabase/admin.ts     — service_role, server only, bypasses RLS
    types/database.ts     — generated từ Supabase CLI
    constants/limits.ts   — FREE_LIMITS, PREMIUM_POINTS_COST = 500
sql/
  migrations/06–24.sql    — chạy theo thứ tự
supabase/
  functions/payment-webhook/  — Edge Function (Deno)
```

**Server Actions** gọi `createClient()`, trả về `{ error: string } | data`.  
**Sensitive writes** đi qua Postgres RPC (atomicity + bypass PostgREST permission gaps).  
**Free tier checks** dùng `checkFreeLimit()` trong `src/features/billing/`.

---

## Design system (Polymer Ledger)

- **Ngôn ngữ:** tờ polymer Việt Nam (giấy/mực/lá/sen/xu) + ví điện tử hiện đại.
- **Tokens:** `src/app/globals.css` (`--color-*`, `--text-*`, `--radius-*`, `--container-*`, `--shadow-sheet`).
- **Primitives:** `src/components/ui/` — Button, Input, Field, Card, Badge, Avatar, Tabs, Segmented, Progress, Skeleton, EmptyState, Stat, PageHeader, Section, Table, Amount, Serial, Stamp, Note, CategoryIcon.
- **Shell:** `AppNav` (sidebar 240px / mobile top bar + bottom nav + Thêm sheet); admin tabs inside the main shell.
- **Page template:** PageHeader + Section; containers narrow/default/wide; cards flat; dark mode follows system.
- **Dev playground:** `/design`, `/design/shell` (404 in production).
- **Test ids:** `balance`, `referral-code`, `referral-total`; OTP `placeholder="000000"`.

---

## Tài liệu liên quan

| File | Mục đích |
|---|---|
| `docs/EVALUATION.md` | Status tracker Phase 1–5; bảo mật đã xử lý; nợ kỹ thuật |
| `docs/superpowers/specs/2026-09-06-phase6-features-design.md` | Phase 6 design spec chi tiết (DB schema + app layer) |
| `docs/superpowers/plans/2026-09-06-phase6-features.md` | Implementation plan Phase 6 |
| `docs/deploy/production-checklist.md` | Checklist deploy Supabase Cloud + Vercel |
| `CLAUDE.md` | Dev commands, architecture patterns, key conventions |
