# Frontend Design — money-app Phase 1

**Date:** 2026-08-28  
**Status:** Approved

---

## Stack

| Concern | Choice | Lý do |
|---------|--------|-------|
| Framework | Next.js (latest) — App Router, `src/` dir | Spec yêu cầu |
| Language | TypeScript strict | Spec yêu cầu |
| Styling | Tailwind CSS + `class-variance-authority` | Utility-first, CVA cho component variants |
| UI primitives | Radix UI (headless) | Headless — full styling control, no lock-in |
| Forms | react-hook-form + zod + @hookform/resolvers | Spec yêu cầu; zod validators tái dùng phía DB |
| Time display | dayjs | Hiển thị "5 phút trước" trên feed |
| Supabase | @supabase/supabase-js + @supabase/ssr | App Router — server components + client components |
| Testing | Vitest | Nhẹ hơn Jest, native ESM |

---

## Kiến trúc tổng thể

**Pattern chính:** Server Components là default. Client Components chỉ khi cần interactivity hoặc Realtime subscription.

```
Page (Server Component)
  → fetch data qua lib/supabase/server.ts
  → pass props xuống Feature components
    → Client Component khi cần event handlers / Realtime
      → Server Action cho mutations
      → supabase.rpc('redeem_reward') chỉ cho đổi điểm
```

**Realtime** chỉ bật ở 2 nơi:
- `features/notifications/` — badge count và danh sách thông báo
- `features/feed/` — like count (có thể thay bằng optimistic update)

---

## Cấu trúc thư mục

```
src/
  app/
    (auth)/
      register/page.tsx
      login/page.tsx
    feed/page.tsx
    profile/page.tsx
    u/[username]/page.tsx      # hồ sơ công khai
    wallet/page.tsx
    invite/page.tsx
    redeem/page.tsx
    explore/page.tsx
    notifications/page.tsx
    layout.tsx                 # root layout, session provider
    error.tsx                  # app-level error boundary
    not-found.tsx
    middleware.ts              # bảo vệ route, redirect nếu chưa auth
  features/
    auth/                      # form đăng ký/đăng nhập, OTP flow, Google OAuth
    feed/                      # PostCard, PostComposer, LikeButton, CommentList
    profile/                   # ProfileHeader, EditProfileForm, AvatarUpload
    wallet/                    # BalanceCard, LedgerTable, PointsBadge
    referral/                  # InviteLink, ReferralStatus
    notifications/             # NotificationList, realtime subscription
  components/
    ui/                        # Radix-based primitives: Button, Input, Avatar,
                               # Badge, Dialog, Toast — dùng chung toàn app
  lib/
    supabase/
      client.ts                # createBrowserClient (dùng trong Client Component)
      server.ts                # createServerClient với cookies (Server Component/Action)
    types/
      database.ts              # generated: npx supabase gen types typescript ...
    validators/
      auth.ts                  # zod schema: register, login
      post.ts                  # zod schema: post composer
      profile.ts               # zod schema: edit profile
```

Mỗi feature folder chứa components, hooks, và server actions của chính nó. Không feature nào import trực tiếp từ internals của feature khác.

---

## Route map

| Route | Auth required | Feature |
|-------|--------------|---------|
| `/register` | No | auth |
| `/login` | No | auth |
| `/feed` | Yes | feed |
| `/profile` | Yes | profile (own) |
| `/u/[username]` | No | profile (public) |
| `/wallet` | Yes | wallet |
| `/invite` | Yes | referral |
| `/redeem` | Yes | wallet |
| `/explore` | No | feed |
| `/notifications` | Yes | notifications |

**Middleware** kiểm tra session Supabase, redirect về `/login` cho các route `auth required`. Public routes (`/u/[username]`, `/explore`, `(auth)/`) bypass middleware.

---

## Supabase client pattern

```ts
// lib/supabase/client.ts — Client Component
import { createBrowserClient } from '@supabase/ssr'
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase/server.ts — Server Component / Server Action
// Xem docs @supabase/ssr để lấy pattern xử lý cookie mới nhất
```

---

## Streak — Server Action

Khi user load app (root layout), gọi Server Action để cập nhật `last_login_date`:

```ts
// app/actions/streak.ts
async function recordLogin() {
  const supabase = createClient() // server client
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('profiles')
    .update({ last_login_date: new Date().toISOString().split('T')[0] })
    .eq('id', user.id)
  // DB trigger tự xử lý streak_count và cộng điểm
}
```

---

## Points — quy tắc gọi từ frontend

| Hành động | Cách gọi |
|-----------|---------|
| Xem số dư | `SELECT points_balance FROM profiles` |
| Xem lịch sử | `SELECT * FROM points_ledger WHERE user_id = auth.uid()` |
| Đổi điểm | `supabase.rpc('redeem_reward', { p_reward_id })` |
| Cộng điểm | **KHÔNG gọi từ frontend** — chỉ qua trigger / Edge Function |

---

## Error handling

- Server Actions trả về `{ data, error }` — không throw, component xử lý tại chỗ
- DB errors (ví dụ: "Số dư điểm không đủ") đã có message tiếng Việt — dùng trực tiếp trong Toast
- `error.tsx` + `not-found.tsx` ở `app/` level làm fallback toàn app

---

## Testing

- Vitest cho zod validators và business logic client-side (1 file `__tests__/` per feature nếu có logic)
- Không test UI components (Radix đã test sẵn)
- Không test Server Components trực tiếp

---

## Sprint → Feature mapping

| Sprint | Feature | Màn hình |
|--------|---------|----------|
| 0 | Setup | Cài đặt, gen types, Radix primitives |
| 1 | auth, profile | /register, /login, /profile |
| 2 | feed | /feed, /explore |
| 3 | feed (follow), referral | /u/[username], /invite |
| 4 | wallet | /wallet |
| 5 | wallet (redeem), payment | /redeem |
| 6 | notifications | /notifications |

---

## Env

```bash
# .env.local (local dev — lấy từ .env.example)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## Commands

```bash
npm run dev                    # dev server
npm run build                  # production build
npm run lint                   # ESLint
npx vitest                     # tests
npx supabase gen types typescript --project-id <ID> \
  > src/lib/types/database.ts  # sync types sau khi schema thay đổi
```
