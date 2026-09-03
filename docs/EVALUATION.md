# Money App — Đánh giá hệ thống (Phase 1 + Phase 2)

> Ngày: 03-09-2026 · Framework: Next.js 15 + Supabase · Trạng thái: Local running  
> Commits: `34ccd93` (latest) — Phase 2 hoàn chỉnh

## Stack kỹ thuật

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 15 (App Router, Server Actions, Server Components) |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
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
| Referral / Giới thiệu | ⚠️ Partial | DB & trigger OK; mã = SHA-256(user.id).slice(0,8); chưa có deep link `/join?ref=CODE` |
| Thông báo | ⚠️ Partial | Badge realtime ✅; chưa phân loại type (finance/todo/system) |
| Real-time feed | ❌ Todo | Feed không tự cập nhật khi có bài mới |
| Real-time wallet balance | ❌ Todo | Balance không cập nhật realtime |
| Search toàn cục | ❌ Todo | Chưa có full-text search |
| Admin dashboard | ❌ Todo | Quản lý rewards, user moderation, analytics |

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
| Free tier limits | ✅ Done | Giới hạn enforced tại Server Action qua `checkFreeLimit()`; không qua RLS |
| Nâng cấp qua VNPay | ✅ Done | `complete_payment()` mở rộng — phân nhánh `topup` / `subscription` |

---

## Bảo mật đã xử lý

| Mức độ | Vấn đề | Giải pháp |
|---|---|---|
| 🔴 Critical | Non-atomic payment → points | `complete_payment()` RPC SECURITY DEFINER; GRANT chỉ service_role |
| 🔴 Critical | Client INSERT trực tiếp vào `subscriptions` | REVOKE INSERT/UPDATE/DELETE từ tất cả role client |
| 🟠 High | Thiếu server-side validation | Zod safeParse trong mọi server action |
| 🟠 High | Avatar URL nhận URL ngoài | Validate prefix `storage/{userId}/` |
| 🟠 High | File upload không có allowlist | Allowlist ext: jpg/jpeg/png/webp |
| 🟠 High | IP VNPay truyền từ client | Đọc `x-forwarded-for` server-side |
| 🟠 High | HMAC compare không timing-safe | `crypto.timingSafeEqual` |
| 🟠 High | `togglePin`/`toggleDone` thiếu ownership filter | Thêm `.eq('user_id', user.id)` trên UPDATE |
| 🟠 High | TOCTOU race trong `upsertBudget` | Thay bằng RPC `upsert_budget_with_limit()` + `pg_advisory_xact_lock` |
| 🟡 Medium | Mock gateway trên production | `notFound()` khi `VNPAY_MOCK` không set |
| 🟡 Medium | Middleware `/u/` quá permissive | Regex chính xác 1 segment |
| 🟡 Medium | Trigger count sync thiếu SECURITY DEFINER | Sửa `sync_post_like_count`, `sync_post_comment_count` |

**Bất biến bảo mật quan trọng:**
- `SUPABASE_SERVICE_ROLE_KEY` — chỉ trong Edge Functions via `Deno.env`, không bao giờ vào frontend
- `add_points`, `complete_referral` — REVOKE từ public/anon/authenticated; chỉ trigger + service_role
- `points_ledger` — append-only, trigger block UPDATE/DELETE ở DB level
- `subscriptions` — client không bao giờ INSERT/UPDATE trực tiếp
- Storage policy — upload chỉ vào `{user_id}/` của chính mình
- Mọi trigger function — `SECURITY DEFINER SET search_path = public`

---

## Nợ kỹ thuật còn lại

| Mức | Vấn đề | File | Giải pháp |
|---|---|---|---|
| 🟡 | `upsert_budget_with_limit` chưa có type trong `database.ts` | `src/lib/types/database.ts` | Chạy lại `npx supabase gen types typescript --local 2>/dev/null > src/lib/types/database.ts` |
| 🟡 | Referral code không unique | `referral.actions.ts` | SHA-256 OK cho MVP; cần unique DB column + ON CONFLICT nếu scale |
| 🟡 | Notification chưa phân loại | `NotificationList` | Thêm `type` filter hoặc grouping UI (finance/todo/system) |
| 🟡 | Trang `/finance` chỉ hiện tháng hiện tại | `src/app/finance/page.tsx` | Thêm month picker để xem lịch sử |

---

## Lộ trình phát triển

### P1 — Ưu tiên cao

1. **Real-time feed** — Supabase Realtime subscription cho feed khi followed user đăng bài; wallet balance realtime
2. **Search toàn cục** — Postgres `tsvector` + `GIN index` trên `posts.content` và `profiles.display_name`; UI trong `/explore`

### P2 — Quan trọng

3. **Referral flow hoàn chỉnh** — Deep link `/join?ref=CODE`, tự động link referral khi đăng ký, referral dashboard/leaderboard
4. **Admin dashboard** — Quản lý rewards, phân tích điểm, moderation bài đăng
5. **Notification phân loại** — Tab "like / comment / follow / finance / todo", mark-all-read
6. **Month picker `/finance`** — Xem lịch sử giao dịch theo tháng bất kỳ

### P3 — Sau khi ổn định

7. **VNPay production & deploy** — `supabase secrets set VNPAY_HASH_SECRET=...`, Vercel + Supabase Cloud
8. **Premium analytics** — Dashboard thu/chi nhiều tháng, biểu đồ xu hướng tiết kiệm

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
    /feed                         — Feed có infinite scroll + WelcomeBanner
    /explore                      — Feed công khai (không cần login)
    /wallet, /wallet/topup        — Ví & nạp điểm VNPay
    /profile                      — Hồ sơ người dùng
    /notifications                — Thông báo
    /u/[username]                 — Public profile
    /invite                       — Trang mời bạn bè (referral)
    /redeem                       — Đổi phần thưởng
    /mock/vnpay                   — Dev mock gateway (chỉ khi VNPAY_MOCK=1)
    /finance                      — Danh sách giao dịch tháng hiện tại
    /finance/new                  — Thêm giao dịch mới
    /finance/budgets              — Ngân sách theo danh mục (progress bars)
    /finance/goals                — Mục tiêu tiết kiệm
    /notes                        — Ghi chú (có pin)
    /todos                        — To-do list
    /billing/upgrade              — Nâng cấp Premium (điểm + VNPay)
  features/
    auth/                         — Auth actions, forms, OTP, Google OAuth
    feed/                         — Posts, likes, comments, FeedList, LoadMoreFeed, WelcomeBanner
    profile/                      — Avatar upload, edit form, follow button, streak
    wallet/                       — Topup form, VNPay actions, BalanceCard, LedgerTable
    referral/                     — InviteLink, ReferralStatus, SHA-256 code
    notifications/                — NotificationBadge (realtime), NotificationList
    billing/                      — subscription.actions.ts (getSubscriptionStatus, subscribeWithPoints, checkFreeLimit)
    finance/                      — transaction.actions.ts, budget.actions.ts, savings.actions.ts
    productivity/                 — notes.actions.ts, todos.actions.ts
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
| Referral thành công | TBD | Trigger `complete_referral()`; chưa có UI flow đầy đủ |

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

> Giới hạn được enforce tại **Server Action layer** qua `checkFreeLimit()`, không phải RLS.
