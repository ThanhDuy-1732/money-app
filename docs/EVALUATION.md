# Money App — Đánh giá Phase 1 (cập nhật)

> Ngày: 03-09-2026 · Framework: Next.js 15 + Supabase · Trạng thái: Local running  
> Commits: `c9348cc` (latest) — landing page + infinite scroll

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
| Thông báo | ⚠️ Partial | Badge realtime (INSERT + refetch on UPDATE) ✅; chưa phân loại type |
| Real-time feed | ❌ Todo | Feed không tự cập nhật khi có bài mới |
| Real-time wallet balance | ❌ Todo | Balance không cập nhật realtime |
| Search toàn cục | ❌ Todo | Chưa có full-text search |
| Admin dashboard | ❌ Todo | Quản lý rewards, user moderation, analytics |

---

## Bảo mật đã xử lý

| Mức độ | Vấn đề | Giải pháp |
|---|---|---|
| 🔴 Critical | Non-atomic payment → points | `complete_payment()` RPC SECURITY DEFINER; GRANT chỉ service_role |
| 🟠 High | Thiếu server-side validation | Zod safeParse trong mọi server action |
| 🟠 High | Avatar URL nhận URL ngoài | Validate prefix `storage/{userId}/` |
| 🟠 High | File upload không có allowlist | Allowlist ext: jpg/jpeg/png/webp |
| 🟠 High | IP VNPay truyền từ client | Đọc `x-forwarded-for` server-side |
| 🟠 High | HMAC compare không timing-safe | `crypto.timingSafeEqual` |
| 🟡 Medium | Mock gateway trên production | `notFound()` khi `VNPAY_MOCK` không set |
| 🟡 Medium | Middleware `/u/` quá permissive | Regex chính xác 1 segment |

**Bất biến bảo mật quan trọng:**
- `SUPABASE_SERVICE_ROLE_KEY` — chỉ trong Edge Functions via `Deno.env`, không bao giờ vào frontend
- `add_points`, `complete_referral` — REVOKE từ public/anon/authenticated; chỉ trigger + service_role
- `points_ledger` — append-only, trigger block UPDATE/DELETE ở DB level
- Storage policy — upload chỉ vào `{user_id}/` của chính mình

---

## Nợ kỹ thuật còn lại

| Mức | Vấn đề | File | Giải pháp |
|---|---|---|---|
| 🟡 | `database.ts` là stub thủ công | `src/lib/types/database.ts` | `npx supabase gen types typescript --local > src/lib/types/database.ts` |
| 🟡 | Referral code không unique | `referral.actions.ts` | SHA-256 OK cho MVP; cần unique DB column + ON CONFLICT nếu scale |
| 🟡 | Notification chưa phân loại | `NotificationList` | Thêm `type` filter hoặc grouping UI |

---

## Lộ trình phát triển

### P1 — Ưu tiên cao

1. **Real-time feed** — Supabase Realtime subscription cho feed khi followed user đăng bài; wallet balance realtime
2. **Search toàn cục** — Postgres `tsvector` + `GIN index` trên `posts.content` và `profiles.display_name`; UI trong `/explore`

### P2 — Quan trọng

3. **Referral flow hoàn chỉnh** — Deep link `/join?ref=CODE`, tự động link referral khi đăng ký, referral dashboard/leaderboard
4. **Generate DB types** — `npx supabase gen types typescript --local > src/lib/types/database.ts` (xóa stub, bỏ `as any[]`)
5. **Admin dashboard** — Quản lý rewards, phân tích điểm, moderation bài đăng

### P3 — Sau khi ổn định

6. **VNPay production & deploy** — `supabase secrets set VNPAY_HASH_SECRET=...`, Vercel + Supabase Cloud
7. **Notification phân loại** — Tab "like / comment / follow / system", mark-all-read

---

## Setup local dev

```bash
# 1. Khởi động Supabase (cần Docker Desktop)
npx supabase start

# 2. Chạy migrations theo thứ tự
DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"
psql $DB_URL -f docs/requirement/schema.sql
psql $DB_URL -f sql/triggers/01-signup-bonus.sql
psql $DB_URL -f sql/triggers/02-profile-complete.sql
psql $DB_URL -f sql/triggers/03-post-bonus.sql
psql $DB_URL -f sql/triggers/04-login-streak.sql
psql $DB_URL -f sql/storage/05-storage-policies.sql
psql $DB_URL -f sql/migrations/06-payments-table.sql
psql $DB_URL -f sql/migrations/07-complete-payment-rpc.sql

# Hoặc chạy tất cả một lệnh:
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
# Demo user: demo@moneyapp.dev / Demo1234!
```

> **Cookie auth**: Supabase SSR tạo cookie `sb-{hostname}-auth-token`. Với `http://127.0.0.1:54321`, cookie name = `sb-127-auth-token` (hostname `127.0.0.1` → bỏ dấu chấm → `127`).

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
  features/
    auth/                         — Auth actions, forms, OTP, Google OAuth
    feed/                         — Posts, likes, comments, FeedList, LoadMoreFeed, WelcomeBanner
    profile/                      — Avatar upload, edit form, follow button, streak
    wallet/                       — Topup form, VNPay actions, BalanceCard, LedgerTable
    referral/                     — InviteLink, ReferralStatus, SHA-256 code
    notifications/                — NotificationBadge (realtime), NotificationList
  lib/
    supabase/                     — Server/browser client factories
    types/database.ts             — TypeScript types (stub — cần gen từ Supabase)
    validators/                   — Zod schemas
  components/ui/                  — Button, Input, Avatar, Badge, Dialog, Toast
supabase/
  functions/payment-webhook/      — Edge Function (Deno) — gọi complete_payment() RPC
sql/
  triggers/01-04.sql              — Gamification triggers
  storage/05-storage-policies.sql
  migrations/06-payments-table.sql
  migrations/07-complete-payment-rpc.sql  — Atomic payment + points RPC
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
| Referral thành công | TBD | Trigger `complete_referral()`; chưa có UI flow đầy đủ |
