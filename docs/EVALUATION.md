# Money App — Đánh giá hệ thống (Phase 1 → 5)

> Ngày: 05-09-2026 · Framework: Next.js 16 + Supabase · Trạng thái: Production-ready  
> Commit mới nhất: f059109 — Phase 5 hoàn chỉnh + tất cả deferred fixes đã xử lý

## Stack kỹ thuật

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 16 (App Router, Server Actions, Server Components) |
| Backend | Supabase (Auth, PostgreSQL, Realtime, Storage, Edge Functions) |
| Styling | Tailwind CSS |
| Validation | Zod (client + server-side) |
| Payment | VNPay (mock gateway cho local dev — `VNPAY_MOCK=1`) |
| Language | TypeScript toàn bộ |

---

## Trạng thái tính năng

### Phase 1 — Mạng xã hội

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Đăng ký / Đăng nhập OTP Email | ✅ Done | Magic link + OTP form; Google OAuth sẵn sàng |
| Landing page marketing | ✅ Done | Hero + feature grid + CTA; redirect `/feed` nếu đã login |
| Onboarding bonus banner | ✅ Done | `WelcomeBanner` hiện sau đăng ký (`?welcome=1`), hiện 50 điểm |
| Hồ sơ người dùng | ✅ Done | Avatar upload, bio, display name |
| Feed bài đăng (following) | ✅ Done | Server Component + cursor-based infinite scroll |
| Đăng bài + ảnh | ✅ Done | Supabase Storage, URL validation server-side |
| Like / Comment | ✅ Done | Optimistic like với rollback khi server error |
| Follow / Unfollow | ✅ Done | Optimistic update; public profile `/u/[username]` |
| Hệ thống điểm (gamification) | ✅ Done | Signup +50, Post +10, Profile complete +20, Login streak |
| Ví điểm | ✅ Done | Lịch sử giao dịch, redeem phần thưởng |
| Nạp điểm VNPay | ✅ Done | Mock gateway local; production-ready với credentials |
| Webhook thanh toán (atomic) | ✅ Done | Edge Function gọi `complete_payment()` RPC — atomic trong 1 transaction |
| Referral / Giới thiệu | ✅ Done | DB + trigger + deep link `/join?ref=CODE`; Route Handler xử lý referral khi đăng ký |
| Thông báo | ✅ Done | Badge realtime; push notification khi buyer nhận code shop |
| Real-time feed | ✅ Done | `NewPostsBanner` — Supabase Realtime `postgres_changes` INSERT; filter theo followingIds |
| Real-time wallet balance | ✅ Done | `RealtimeBalance` — subscribe `points_ledger` INSERT; gọi `getBalance()` server action |
| Search toàn cục | ✅ Done | `tsvector` + GIN index; `/explore` full-text search posts + profiles |
| Admin dashboard | ✅ Done | Quản lý rewards, user moderation (`lockUser`/`unlockUser`), analytics |

### Phase 2 — Tài chính & Năng suất

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Danh mục giao dịch | ✅ Done | 6 danh mục hệ thống + danh mục người dùng; bảng `categories` |
| Giao dịch thu/chi | ✅ Done | CRUD đầy đủ; `/finance`, `/finance/new`; lọc theo tháng |
| Ngân sách tháng | ✅ Done | Upsert nguyên tử qua RPC; progress bar theo danh mục; `/finance/budgets` |
| Mục tiêu tiết kiệm | ✅ Done | Trigger trao điểm khi đạt goal; `/finance/goals` |
| Ghi chú | ✅ Done | Pin/unpin; CRUD; `/notes`; Free tier: tối đa 50 |
| To-do | ✅ Done | Done/undone; due date; `/todos`; Free tier: tối đa 20 đang hoạt động |
| Premium subscription | ✅ Done | 2 cách: dùng 500 điểm (RPC) + VNPay 19.000đ (webhook); `/billing/upgrade` |
| Free tier limits | ✅ Done | Budgets: enforce trong DB RPC (`upsert_budget_with_limit()`); Savings/Notes/Todos: enforce tại Server Action |
| Month picker `/finance` | ✅ Done | `MonthPicker` component; URL `?month=YYYY-MM`; next button disabled tại tháng hiện tại |

### Phase 3 — Admin, Shop & Security

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Admin dashboard | ✅ Done | `/admin` — lock/unlock user, ẩn bài, quản lý rewards |
| Referral deep link | ✅ Done | `/join?ref=CODE` Route Handler — ghi `referral_code` vào cookie trước redirect signup |
| Shop marketplace | ✅ Done | `/shop` — admin tạo sản phẩm + bulk import codes; user mua bằng điểm; `complete_payment_shop()` RPC |
| Shop code double-assign guard | ✅ Done | Migration 14: `assigned_order_id` UNIQUE index; `assign_shop_code()` RPC dùng `FOR UPDATE SKIP LOCKED` |
| Buyer notification | ✅ Done | Migration 14: trigger push notification khi code được gán cho buyer |
| Security hardening | ✅ Done | Migration 13: REVOKE broadcast grants; SECURITY DEFINER trên các trigger mới; fix privilege escalation |
| Locked user enforcement | ✅ Done | Middleware check `profiles.locked` — redirect ra login khi bị khóa |
| Hidden post filter | ✅ Done | Feed query thêm `.eq('hidden', false)` — bài bị mod ẩn không hiển thị |

### Phase 4 — Realtime & Search

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| GIN full-text indexes | ✅ Done | Migration 15: `posts_search_idx` + `profiles_search_idx` dùng `to_tsvector('simple', ...)` |
| Search action | ✅ Done | `searchContent()` — `textSearch` + hai `ilike` riêng biệt + LIKE metachar escape |
| Explore UI | ✅ Done | GET form, hiện posts + users khi có query; FeedList khi trống |
| Real-time feed banner | ✅ Done | `NewPostsBanner` — filter `followingIds.includes(payload.new.user_id)`; `router.refresh()` khi click |
| Real-time wallet balance | ✅ Done | `RealtimeBalance` wraps `BalanceCard`; subscribe `user_id=eq.${userId}` channel |
| Month picker | ✅ Done | `MonthPicker` — ← → navigation; next disabled; `router.push('/finance?month=...')` |

### Phase 5 — Production-Ready: Test Suite, Deploy, Analytics

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Unit tests (Vitest) | ✅ Done | 5 test files, 40 tests: `escape-like`, `vnpay-crypto`, `limits`, `auth.validators`, `finance.validators` |
| E2E tests (Playwright) | ✅ Done | 6 spec files, 10 tests: auth (OTP/login), referral flow, search (LIKE metachar), wallet (VNPAY_MOCK), shop concurrency, admin (unauthenticated + authenticated non-admin) |
| Referral code unique constraint | ✅ Done | Migration 16: `referral_codes(code)` UNIQUE + backfill + trigger |
| Advanced search with ranking | ✅ Done | Migration 17: `pg_trgm` extension + `immutable_unaccent()` wrapper + `ts_rank()` scoring |
| Search autocomplete | ✅ Done | Migration 17: `/explore?q=...` suggests posts/users by relevance |
| Premium analytics: trend chart | ✅ Done | Migration 18: `get_finance_trend()` RPC + `/finance/trends` chart (monthly income/expense) |
| Referral analytics & leaderboard | ✅ Done | Migration 19: `get_referral_stats()` RPC + `/invite` leaderboard (top 10 referrers) |
| Deploy production checklist | ✅ Done | Supabase Cloud setup; Vercel secrets; VNPay production credentials; Edge Function; mock route guard; PITR; Sentry; go-live |
| Production migrations (16-19) | ✅ Ready | Apply via `./scripts/migrate.sh` to Supabase Cloud when deploying |
| SECURITY DEFINER on all RPCs | ✅ Done | Migrations 16-19: `SECURITY DEFINER SET search_path = public` on `complete_referral_rpc`, `get_finance_trend`, `get_referral_stats` |

---

## Bảo mật đã xử lý

| Mức độ | Vấn đề | Giải pháp |
|---|---|---|
| 🔴 Critical | Non-atomic payment → points | `complete_payment()` RPC SECURITY DEFINER; GRANT chỉ service_role |
| 🔴 Critical | Client INSERT trực tiếp vào `subscriptions` | REVOKE INSERT/UPDATE/DELETE từ tất cả role client |
| 🔴 Critical | Privilege escalation qua broad GRANT | Migration 13: REVOKE per-column GRANT trên `profiles`; chỉ giữ các cột user-writable |
| 🟠 High | Thiếu server-side validation | Zod safeParse trong mọi server action |
| 🟠 High | Avatar URL nhận URL ngoài | Validate prefix `storage/{userId}/` |
| 🟠 High | File upload không có allowlist | Allowlist ext: jpg/jpeg/png/webp |
| 🟠 High | IP VNPay truyền từ client | Đọc `x-forwarded-for` server-side |
| 🟠 High | HMAC compare không timing-safe | `crypto.timingSafeEqual` |
| 🟠 High | `togglePin`/`toggleDone` thiếu ownership filter | Thêm `.eq('user_id', user.id)` trên UPDATE |
| 🟠 High | TOCTOU race trong `upsertBudget` | Thay bằng RPC `upsert_budget_with_limit()` + `pg_advisory_xact_lock` |
| 🟠 High | Shop code double-assign race | `assign_shop_code()` RPC dùng `FOR UPDATE SKIP LOCKED`; UNIQUE index trên `assigned_order_id` |
| 🟠 High | PostgREST filter injection trong search | Tách `.or()` thành hai `.ilike()` riêng; dedup bằng Set |
| 🟠 High | LIKE metacharacter trong search | `q.replace(/[%_\\]/g, '\\$&')` trước khi interpolate vào `.ilike()` |
| 🟡 Medium | Mock gateway trên production | `notFound()` khi `VNPAY_MOCK` không set |
| 🟡 Medium | Middleware `/u/` quá permissive | Regex chính xác 1 segment |
| 🟡 Medium | Trigger count sync thiếu SECURITY DEFINER | Sửa `sync_post_like_count`, `sync_post_comment_count` |
| 🟡 Medium | Locked user có thể tiếp tục dùng app | Middleware check `profiles.locked` + redirect |
| 🟡 Medium | Hidden posts vẫn hiện trong feed | Feed query thêm `.eq('hidden', false)` |

**Bất biến bảo mật quan trọng:**
- `SUPABASE_SERVICE_ROLE_KEY` — chỉ trong Edge Functions via `Deno.env`, không bao giờ vào frontend
- `add_points`, `complete_referral` — REVOKE từ public/anon/authenticated; chỉ trigger + service_role
- `points_ledger` — append-only, trigger block UPDATE/DELETE ở DB level
- `subscriptions` — client không bao giờ INSERT/UPDATE trực tiếp
- Storage policy — upload chỉ vào `{user_id}/` của chính mình
- Mọi trigger function — `SECURITY DEFINER SET search_path = public`
- Search `ilike` — luôn escape LIKE metachar trước khi interpolate
- Realtime channel filter — `user_id=eq.${userId}` để không nhận event của user khác

---

## Nợ kỹ thuật còn lại

| Mức | Vấn đề | File | Giải pháp |
|---|---|---|---|
| 🟡 | `followingIds` tạo array mới mỗi `router.refresh()` khiến `NewPostsBanner` re-subscribe | `feed/page.tsx` | Acceptable ở scale hiện tại; fix = serialize thành string prop hoặc stable ref |
| 🟡 | VNPay production credentials | Supabase Cloud | `supabase secrets set VNPAY_TMNCCODE=...` khi deploy production |

---

## Lộ trình phát triển

### P5 — Hoàn chỉnh ✅

Tất cả hạng mục Phase 5 đã hoàn thành (14 commits, branch `feat/phase5-production-ready`):

- ✅ **Test suite** — Vitest 40 unit tests + Playwright 10 E2E tests
- ✅ **Advanced search** — `pg_trgm` autocomplete, `ts_rank` ranking, `immutable_unaccent()`
- ✅ **Premium analytics** — `get_finance_trend()` RPC + `/finance/trends` SVG chart
- ✅ **Referral analytics** — `get_referral_stats()` RPC + `/invite` leaderboard top 10
- ✅ **Deploy checklist** — Supabase Cloud + Vercel + VNPay production + mock route guard + PITR
- ✅ **referral_code UNIQUE** — Migration 16 backfill + constraint + trigger

### P6 — Feature Connections (code complete; database smoke pending)

- **Sprint 0–1: Gift Points** — `gift_points()` RPC + daily limit (migration 20)
- **Sprint 2–3: Shared Savings Goals** — 3 tables + `is_goal_member()` (migration 21)
- **Sprint 4–5: Hashtags** — `posts.tags` + GIN index + `/explore/tag/[tag]` (migration 22)
- **Sprint 6–7: Recurring Transactions** — `recurring_transactions` + pg_cron (migration 23)
- **Sprint 8–9: Premium Export** — CSV + PDF (`@react-pdf/renderer`)
- **Tests** — 57 Vitest unit tests pass; 11 Playwright E2E tests listed (runtime smoke pending)

Migrations 20–23 và các luồng cần Supabase/pg_cron chưa được smoke test trong môi trường hiện tại vì Docker/database không chạy.

### P6 — Horizon

1. **Deploy production** — Thực thi `docs/deploy/production-checklist.md`; thiết lập VNPay production credentials (`supabase secrets set`)
2. **Admin E2E fixture** — Thêm Playwright `storageState` global setup cho authenticated admin session khi infra ổn định
3. **Regenerate database.ts** — Chạy `supabase gen types` sau khi apply migrations 16–23 để loại bỏ các `as any` cast còn lại

---

## Setup local dev

```bash
# 1. Khởi động Supabase (cần Docker Desktop)
npx supabase start

# 2. Chạy tất cả migrations
./scripts/migrate.sh             # psql local
./scripts/migrate.sh --docker    # qua docker exec

# 3. .env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<từ output supabase start>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
VNPAY_MOCK=1
VNPAY_TMN_CODE=TEST
VNPAY_HASH_SECRET=devsecret

# 4. Chạy app
npm run dev

# OTP email → xem tại http://localhost:54324 (Mailpit)
```

> **Cookie auth**: Supabase SSR tạo cookie `sb-{hostname}-auth-token`. Với `http://127.0.0.1:54321`, cookie name = `sb-127-auth-token`.

> **DB**: Supabase CLI port `127.0.0.1:54322` (không phải docker-compose 5432).

---

## Cấu trúc thư mục

```
src/
  app/
    page.tsx                      — Landing page (marketing + redirect nếu logged in)
    (auth)/login, /register       — Auth pages
    /feed                         — Feed có infinite scroll + WelcomeBanner + NewPostsBanner
    /explore                      — Full-text search posts + users; FeedList khi trống
    /wallet, /wallet/topup        — Ví (RealtimeBalance) & nạp điểm VNPay
    /wallet/topup/return          — Trang return VNPay sau thanh toán
    /profile                      — Hồ sơ người dùng
    /notifications                — Thông báo
    /u/[username]                 — Public profile
    /invite                       — Trang mời bạn bè (referral)
    /join                         — Route Handler: ghi referral cookie + redirect signup
    /redeem                       — Đổi phần thưởng
    /mock/vnpay                   — Dev mock gateway (chỉ khi VNPAY_MOCK=1)
    /finance                      — Danh sách giao dịch theo tháng + MonthPicker
    /finance/new                  — Thêm giao dịch mới
    /finance/budgets              — Ngân sách theo danh mục (progress bars)
    /finance/goals                — Mục tiêu tiết kiệm
    /notes                        — Ghi chú (có pin)
    /todos                        — To-do list
    /billing/upgrade              — Nâng cấp Premium (điểm + VNPay)
    /shop                         — Marketplace mua code bằng điểm
    /admin                        — Admin: lock user, ẩn bài, quản lý rewards
  features/
    auth/                         — Auth actions, forms, OTP, Google OAuth
    feed/                         — Posts, likes, comments, FeedList, LoadMoreFeed, WelcomeBanner, NewPostsBanner
    profile/                      — Avatar upload, edit form, follow button, streak
    wallet/                       — Topup form, VNPay actions, BalanceCard, LedgerTable, RealtimeBalance
    referral/                     — InviteLink, ReferralStatus, SHA-256 code
    notifications/                — NotificationBadge (realtime), NotificationList
    billing/                      — subscription.actions.ts (getSubscriptionStatus, subscribeWithPoints, checkFreeLimit)
    finance/                      — transaction.actions.ts, budget.actions.ts, savings.actions.ts, MonthPicker
    productivity/                 — notes.actions.ts, todos.actions.ts
    search/                       — searchContent() server action (full-text + ilike)
    shop/                         — shop.actions.ts (product list, purchase, bulk import)
    admin/                        — admin.actions.ts (lockUser, unlockUser, hidePost)
  lib/
    supabase/                     — Server/browser client factories
    types/database.ts             — TypeScript types (generated từ Supabase CLI)
    validators/finance.ts         — Zod schemas: transaction, budget, savings, note, todo
    constants/limits.ts           — FREE_LIMITS, PREMIUM_POINTS_COST
  components/ui/                  — Button, Input, Avatar, Badge, Dialog, Toast
supabase/
  functions/payment-webhook/      — Edge Function (Deno) — gọi complete_payment() RPC
sql/
  triggers/01-04.sql              — Gamification triggers (SECURITY DEFINER)
  storage/05-storage-policies.sql
  migrations/
    06-payments-table.sql
    07-complete-payment-rpc.sql           — Atomic payment + points RPC
    08a-fix-count-triggers.sql            — SECURITY DEFINER fix cho like/comment triggers
    08b-phase2-core.sql                   — categories + transactions + type extensions
    08c-phase2-budgets.sql                — budgets table + RLS
    08d-phase2-savings.sql                — savings_goals + achievement trigger
    08e-phase2-productivity.sql           — notes + todos tables + RLS
    08f-phase2-billing.sql                — subscriptions + subscribe_premium_with_points() RPC
    09-extend-complete-payment.sql        — Mở rộng complete_payment() cho subscription VNPay
    09b-budget-upsert-rpc.sql             — upsert_budget_with_limit() với advisory lock
    10-phase3-admin-referral.sql          — Admin tables, referral deep link
    11-phase3-shop-marketplace.sql        — Shop products, codes, orders
    12-complete-payment-shop.sql          — complete_payment_shop() RPC
    13-phase3-security-fixes.sql          — REVOKE grants, SECURITY DEFINER fixes
    14-parked-fixes.sql                   — assigned_order_id UNIQUE, buyer notification trigger
    15-search-indexes.sql                 — GIN indexes: posts + profiles
scripts/
  migrate.sh                      — Chạy tất cả migrations theo thứ tự
```

---

## Gamification logic

| Sự kiện | Điểm | Cơ chế |
|---|---|---|
| Đăng ký | +50 | Trigger `01-signup-bonus` sau INSERT profiles |
| Hoàn thiện profile | +20 | Trigger `02-profile-complete` khi bio + avatar không null |
| Đăng bài | +10 | Trigger `03-post-bonus` sau INSERT posts |
| Login streak | +5/+10/+20 | Trigger `04-login-streak`; streak multiplier theo ngày liên tiếp |
| Nạp điểm VNPay | 1.000đ = 1đ | `complete_payment()` RPC: `FLOOR(amount_vnd / 1000)` |
| Đạt mục tiêu tiết kiệm | +điểm | Trigger `check_savings_goal_achieved()` SECURITY DEFINER |
| Referral thành công | TBD | Trigger `complete_referral()`; deep link `/join?ref=CODE` hoàn chỉnh |

## Premium — Free tier limits

| Tính năng | Free | Premium |
|---|---|---|
| Ngân sách/tháng | 3 | Không giới hạn |
| Mục tiêu tiết kiệm | 1 | Không giới hạn |
| Ghi chú | 50 | Không giới hạn |
| To-do đang hoạt động | 20 | Không giới hạn |
| Giao dịch | Không giới hạn | Không giới hạn |

**Mua Premium:**
- 500 điểm (instant via `subscribe_premium_with_points()` RPC)
- 19.000đ VNPay (webhook → `complete_payment()` subscription branch)

> Giới hạn: Budgets enforce trong DB RPC với advisory lock; Savings/Notes/Todos enforce tại Server Action qua `checkFreeLimit()`. Không có gì enforce qua RLS.
