# Money App — Đánh giá Phase 1

> Ngày: 02-09-2026 · Framework: Next.js 15 + Supabase · Trạng thái: Local running

## Stack kỹ thuật

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 15 (App Router, Server Actions, Server Components) |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| Styling | Tailwind CSS |
| Validation | Zod (client + server-side) |
| Payment | VNPay (mock gateway cho local dev) |
| Language | TypeScript toàn bộ |

---

## Trạng thái tính năng

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Đăng ký / Đăng nhập OTP Email | ✅ Done | Magic link + OTP form; Google OAuth sẵn sàng |
| Hồ sơ người dùng | ✅ Done | Avatar upload, bio, display name |
| Feed bài đăng (following) | ✅ Done | Server Component; infinite scroll chưa có |
| Đăng bài + ảnh | ✅ Done | Supabase Storage, URL validation server-side |
| Like / Comment | ✅ Done | Optimistic like; không rollback khi lỗi |
| Follow / Unfollow | ✅ Done | Optimistic update; public profile /u/[username] |
| Hệ thống điểm (gamification) | ✅ Done | Signup +50, Post +10, Profile complete +20, Login streak |
| Ví điểm | ✅ Done | Lịch sử giao dịch, redeem phần thưởng |
| Nạp điểm VNPay | ✅ Done | Mock gateway local; production-ready với credentials |
| Webhook thanh toán | ✅ Done | Edge Function; hỗ trợ PayOS + VNPay |
| Referral / Giới thiệu | ⚠️ Partial | DB & trigger OK; UI chỉ hiện user_id.slice(0,8) |
| Thông báo | ⚠️ Partial | Badge reset sai logic; chưa phân loại |
| Landing page | ❌ Todo | Scaffold boilerplate |
| Real-time updates | ❌ Todo | Supabase Realtime chưa tích hợp |
| Infinite scroll / Pagination | ❌ Todo | Feed load toàn bộ posts |
| Search | ❌ Todo | Chưa có |
| Admin dashboard | ❌ Todo | Quản lý rewards, user moderation, analytics |

---

## Bảo mật đã xử lý (commit 08f8c91)

| Mức độ | Vấn đề | Giải pháp |
|---|---|---|
| 🔴 Critical | Non-atomic payment → points | Rollback về 'pending'; IPN VNPay retry được |
| 🟠 High | Thiếu server-side validation | Zod safeParse trong mọi server action |
| 🟠 High | Avatar URL nhận URL ngoài | Validate prefix storage/{userId}/ |
| 🟠 High | File upload không có allowlist | Allowlist ext: jpg/jpeg/png/webp |
| 🟠 High | IP VNPay truyền từ client | Đọc x-forwarded-for server-side |
| 🟠 High | HMAC compare không timing-safe | crypto.timingSafeEqual |
| 🟡 Medium | Mock gateway trên production | notFound() khi NODE_ENV=production |
| 🟡 Medium | Middleware /u/ quá permissive | Regex chính xác 1 segment |

---

## Nợ kỹ thuật (Ponytail debt)

### 🔴 Ưu tiên cao

**Payment → Points chưa atomic**
- Hiện tại: rollback best-effort về 'pending' khi add_points fail
- Cần: Postgres RPC kết hợp cả hai trong 1 transaction
- File: `supabase/functions/payment-webhook/index.ts`

### 🟠 Cần sửa sớm

**LikeButton không rollback khi server error**
- UI và DB lệch nhau cho đến khi refresh
- File: `src/features/feed/components/LikeButton.tsx`

**FeedList dùng `posts as any[]`**
- Cần `npx supabase gen types typescript --local > src/lib/types/database.ts`

### 🟡 Kỹ thuật

**Referral code = user_id.slice(0,8)**
- Cần nanoid(8) unique được tạo lúc profile INSERT

**NotificationBadge reset sai logic**
- Reset khi bất kỳ UPDATE nào, không chỉ khi đọc

---

## Lộ trình phát triển

### P1 — Ưu tiên cao (nên làm ngay)

1. **Landing page & onboarding flow** — Trang / là boilerplate. Cần hero marketing + flow sau đăng ký hiển thị 50đ signup bonus
2. **Pagination / Infinite scroll** — Feed load all posts hiện tại sẽ crash khi scale. Implement cursor-based pagination

### P2 — Quan trọng

3. **Real-time với Supabase Realtime** — Bắt đầu từ notification badge (đơn giản nhất), sau đó feed + wallet
4. **Search toàn cục** — Full-text search với Postgres tsvector cho posts + profiles
5. **Referral flow hoàn chỉnh** — Unique nanoid code, deep link /join?ref=CODE, referral dashboard

### P3 — Sau khi ổn định

6. **Admin dashboard** — Quản lý rewards, user moderation, analytics
7. **VNPay production & deploy** — Set credentials, test sandbox, deploy Vercel + Supabase Cloud

---

## Setup local dev

```bash
# 1. Khởi động Supabase (cần Docker Desktop)
npx supabase start

# 2. Chạy migrations
DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
psql $DB_URL -f docs/requirement/schema.sql
psql $DB_URL -f sql/triggers/01-signup-bonus.sql
psql $DB_URL -f sql/triggers/02-profile-complete.sql
psql $DB_URL -f sql/triggers/03-post-bonus.sql
psql $DB_URL -f sql/triggers/04-login-streak.sql
psql $DB_URL -f sql/storage/05-storage-policies.sql
psql $DB_URL -f sql/migrations/06-payments-table.sql

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

> **Lưu ý cookie auth**: Supabase SSR tạo cookie name `sb-{hostname}-auth-token`. Với URL `http://127.0.0.1:54321`, cookie name là `sb-127-auth-token` (hostname `127.0.0.1` → bỏ dấu chấm → `127`).

---

## Cấu trúc thư mục chính

```
src/
  app/
    (auth)/login, /register    — Auth pages
    /feed                       — Authenticated feed
    /explore                    — Public feed
    /wallet, /wallet/topup      — Wallet & payment
    /profile                    — User profile
    /notifications              — Notifications
    /u/[username]               — Public profile
    /mock/vnpay                 — Dev mock gateway (dev only)
  features/
    auth/                       — Auth actions, forms, OTP component
    feed/                       — Posts, likes, comments, feed list
    profile/                    — Avatar upload, edit form, follow button
    wallet/                     — Topup form, VNPay actions
    referral/                   — Invite link component
    notifications/              — Notification badge, list
  lib/
    supabase/                   — Server/browser client factories
    types/database.ts           — TypeScript types (stub — cần gen)
    validators/                 — Zod schemas
  components/ui/                — Shared UI: Button, Input, etc.
supabase/
  functions/payment-webhook/    — Edge Function (Deno) for IPN
sql/
  triggers/01-04.sql            — Gamification triggers
  storage/05-storage-policies.sql
  migrations/06-payments-table.sql
```
