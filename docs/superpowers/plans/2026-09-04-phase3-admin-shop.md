# Phase 3 — Admin, Referral, Notifications, Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 3: admin dashboard, complete referral flow with persistent DB codes, notification type filtering, and shop marketplace with concurrent-safe code assignment.

**Architecture:** 11 DB-first tasks — each migration runs first, then Server Actions, then UI. Admin actions always check `role='admin'` before any query (RLS is the second layer). Shop codes are protected via SECURITY DEFINER RPCs; clients never read `shop_product_codes` directly.

**Tech Stack:** Next.js 15 App Router + Server Actions (`'use server'`), Supabase (PostgreSQL + RLS + RPCs), TypeScript, Tailwind CSS, `@supabase/ssr` for auth middleware.

**Spec:** `docs/superpowers/specs/2026-09-04-phase3-design.md`

## Global Constraints

- Every Server Action must call `supabase.auth.getUser()` before any query — never trust cookies alone
- Admin actions MUST check `role='admin'` in the action body before any DB operation; RLS is only the second defense layer
- `points_ledger` is append-only — all point changes go through `add_points` RPC, never direct INSERT/UPDATE
- `shop_product_codes` table: NEVER `GRANT SELECT` to `authenticated` or `anon` — only accessible via `get_my_order_code()` RPC
- Functions that take `user_id` as a parameter and don't internally verify `auth.uid()` must stay REVOKED from `authenticated`
- All new trigger functions that modify data not owned by the caller: `SECURITY DEFINER SET search_path = public`
- Tailwind only — no new CSS files, no inline `style=`
- `revalidatePath` after every mutation

---

## File Map

**New files:**
```
sql/migrations/10-phase3-admin-referral.sql
sql/migrations/11-phase3-shop-marketplace.sql
sql/migrations/12-complete-payment-shop.sql
src/features/admin/actions/dashboard.actions.ts
src/features/admin/actions/moderation.actions.ts
src/features/admin/actions/shop.actions.ts
src/features/referral/actions/join.actions.ts
src/features/shop/actions/shop.actions.ts
src/app/admin/layout.tsx
src/app/admin/page.tsx
src/app/admin/users/page.tsx
src/app/admin/posts/page.tsx
src/app/admin/shop/page.tsx
src/app/join/page.tsx
src/app/shop/page.tsx
src/app/shop/[id]/page.tsx
src/app/shop/orders/page.tsx
```

**Modified files:**
```
scripts/migrate.sh                                     — add 3 new run_sql lines
src/middleware.ts                                      — add /admin guard + /join as public route
src/features/referral/actions/referral.actions.ts      — read referral_code from DB instead of SHA-256
src/features/auth/actions/auth.actions.ts              — process referral in verifyOtp isNew block
src/features/notifications/components/NotificationList.tsx — add type filter tabs
src/lib/types/database.ts                              — regen after Task 11
```

---

## Task 1: Migration 10 — Admin, Referral, Notification type

**Files:**
- Create: `sql/migrations/10-phase3-admin-referral.sql`
- Modify: `scripts/migrate.sh`

**Interfaces:**
- Produces: `profiles.role`, `profiles.locked`, `profiles.referral_code`, `posts.hidden`, `payments.metadata`, `is_admin()`, `get_referrer_by_code(text)` — used by Tasks 2–5

- [ ] **Step 1: Write migration file**

```sql
-- sql/migrations/10-phase3-admin-referral.sql
-- ============================================================================
-- PHASE 3 — TRACK A: ADMIN ROLE, REFERRAL CODE, NOTIFICATION TYPE
-- ============================================================================

-- 1. Admin role + lock columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts    ADD COLUMN IF NOT EXISTS hidden  boolean NOT NULL DEFAULT false;

-- 2. metadata on payments (needed for shop VNPay purchase — store product_id)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 3. Extend payment_type to include shop_purchase
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN ('topup', 'subscription', 'shop_purchase'));

-- 4. Referral code — unique, generated once at profile creation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_tries integer := 0;
BEGIN
  IF new.referral_code IS NOT NULL THEN RETURN new; END IF;
  LOOP
    v_tries := v_tries + 1;
    v_code := lower(substr(md5(new.id::text || clock_timestamp()::text || v_tries::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code);
    IF v_tries > 5 THEN
      RAISE EXCEPTION 'Khong sinh duoc ma referral duy nhat sau 5 lan thu';
    END IF;
  END LOOP;
  new.referral_code := v_code;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Backfill for existing users (idempotent — skips rows that already have a code)
UPDATE public.profiles
SET referral_code = lower(substr(md5(id::text || clock_timestamp()::text), 1, 8))
WHERE referral_code IS NULL;

-- 5. Extend notifications.type — add 'shop' (was: follow,like,comment,points,referral,finance,todo)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow','like','comment','points','referral','finance','todo','shop'));

-- 6. is_admin() — SECURITY DEFINER to avoid RLS infinite recursion on profiles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 7. Admin RLS policies (additive — existing user policies stay)
CREATE POLICY "admin_select_all_profiles"       ON public.profiles     FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_update_lock_profiles"      ON public.profiles     FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_select_all_posts"          ON public.posts        FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_update_hide_posts"         ON public.posts        FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_select_all_payments"       ON public.payments     FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_all_subscriptions"  ON public.subscriptions FOR SELECT USING (public.is_admin());

-- 8. get_referrer_by_code — public lookup (needed for unauthenticated /join visitors)
CREATE OR REPLACE FUNCTION public.get_referrer_by_code(p_code text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.profiles WHERE referral_code = p_code LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_referrer_by_code(text) TO authenticated, anon;
```

- [ ] **Step 2: Add to migrate.sh**

Open `scripts/migrate.sh`. After the last `run_sql` line (`run_sql "sql/migrations/09b-budget-upsert-rpc.sql"`), add:

```bash
run_sql "sql/migrations/10-phase3-admin-referral.sql"
```

- [ ] **Step 3: Run migration**

```bash
DB_PORT=5432 bash scripts/migrate.sh
```

Expected: no errors. If `payments_payment_type_check` already doesn't exist (because 08b added it with only topup/subscription), the DROP CONSTRAINT IF EXISTS handles it.

- [ ] **Step 4: Verify with SQL**

In Supabase Studio SQL Editor (http://localhost:3001) or `psql -h 127.0.0.1 -p 5432 -U postgres -d postgres`:

```sql
-- Columns added
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('role','locked','referral_code');
-- Expected: 3 rows

-- Backfill worked
SELECT COUNT(*) FROM public.profiles WHERE referral_code IS NULL;
-- Expected: 0

-- Function privileges
SELECT has_function_privilege('authenticated', 'public.is_admin()', 'execute');
-- Expected: true
SELECT has_function_privilege('authenticated', 'public.get_referrer_by_code(text)', 'execute');
-- Expected: true
```

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/10-phase3-admin-referral.sql scripts/migrate.sh
git commit -m "feat(db): Phase 3 migration 10 — admin role, referral code, notification type"
```

---

## Task 2: Middleware admin guard + /admin layout

**Files:**
- Modify: `src/middleware.ts`
- Create: `src/app/admin/layout.tsx`

**Interfaces:**
- Consumes: `profiles.role` (from Task 1)
- Produces: `/admin/**` routes redirect to `/feed` for non-admins; `/join` is public

- [ ] **Step 1: Update middleware**

Read `src/middleware.ts` first. The `isPublic` check currently covers `/register`, `/login`, `/explore`, `/u/<username>`. Add `/join`:

```ts
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const isPublic = pathname === '/'
    || ['/register', '/login', '/explore', '/join', '/shop'].some(r => pathname.startsWith(r))
    || /^\/u\/[^/]+$/.test(pathname)

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin route guard — second check after auth
  if (user && pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/feed', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: Create /admin layout**

```tsx
// src/app/admin/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/feed')

  return (
    <div className="min-h-screen flex">
      <aside className="w-48 border-r bg-gray-50 dark:bg-gray-900 p-4 space-y-2 shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Admin</p>
        <Link href="/admin" className="block text-sm py-1 hover:text-blue-600">Dashboard</Link>
        <Link href="/admin/users" className="block text-sm py-1 hover:text-blue-600">Người dùng</Link>
        <Link href="/admin/posts" className="block text-sm py-1 hover:text-blue-600">Bài đăng</Link>
        <Link href="/admin/shop" className="block text-sm py-1 hover:text-blue-600">Shop</Link>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Manual verify**

Start the app (`./scripts/dev.sh --no-migrate`). Navigate to http://localhost:3000/admin as a non-admin user → should redirect to `/feed`. Check middleware and layout both reject non-admins.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts src/app/admin/layout.tsx
git commit -m "feat(admin): middleware admin guard + admin layout shell"
```

---

## Task 3: Admin dashboard — revenue summary

**Files:**
- Create: `src/features/admin/actions/dashboard.actions.ts`
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `payments`, `subscriptions` tables (admin SELECT policy from Task 1)
- Produces: `getRevenueSummary()`, `listRecentPayments()` — used in `/admin` page

- [ ] **Step 1: Create dashboard actions**

```ts
// src/features/admin/actions/dashboard.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'admin') throw new Error('Không có quyền admin')
  return supabase
}

export async function getRevenueSummary() {
  const supabase = await requireAdmin()

  const { data: payments } = await supabase
    .from('payments')
    .select('payment_type, amount_vnd, status, created_at')
    .eq('status', 'succeeded')

  const topup = payments?.filter(p => p.payment_type === 'topup')
    .reduce((s, p) => s + (p.amount_vnd ?? 0), 0) ?? 0
  const subscription = payments?.filter(p => p.payment_type === 'subscription')
    .reduce((s, p) => s + (p.amount_vnd ?? 0), 0) ?? 0
  const shop = payments?.filter(p => p.payment_type === 'shop_purchase')
    .reduce((s, p) => s + (p.amount_vnd ?? 0), 0) ?? 0

  const { count: activeSubscriptions } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  return { topup, subscription, shop, activeSubscriptions: activeSubscriptions ?? 0 }
}

export async function listRecentPayments(limit = 50) {
  const supabase = await requireAdmin()
  const { data } = await supabase
    .from('payments')
    .select('id, user_id, amount_vnd, payment_type, status, created_at, profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
```

- [ ] **Step 2: Create admin dashboard page**

```tsx
// src/app/admin/page.tsx
import { getRevenueSummary, listRecentPayments } from '@/features/admin/actions/dashboard.actions'

function VndAmount({ value }: { value: number }) {
  return <span>{value.toLocaleString('vi-VN')}đ</span>
}

export default async function AdminDashboard() {
  const [summary, payments] = await Promise.all([getRevenueSummary(), listRecentPayments()])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Nạp điểm (VNPay)', value: summary.topup },
          { label: 'Subscription', value: summary.subscription },
          { label: 'Shop VNPay', value: summary.shop },
          { label: 'Tổng', value: summary.topup + summary.subscription + summary.shop },
        ].map(({ label, value }) => (
          <div key={label} className="border rounded-xl p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-semibold mt-1"><VndAmount value={value} /></p>
          </div>
        ))}
        <div className="border rounded-xl p-4">
          <p className="text-xs text-gray-500">Sub đang hoạt động</p>
          <p className="text-lg font-semibold mt-1">{summary.activeSubscriptions}</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Giao dịch gần đây</h2>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left p-3">Người dùng</th>
                <th className="text-left p-3">Loại</th>
                <th className="text-right p-3">Số tiền</th>
                <th className="text-left p-3">Trạng thái</th>
                <th className="text-left p-3">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="p-3">{(p.profiles as any)?.display_name ?? p.user_id.slice(0,8)}</td>
                  <td className="p-3">{p.payment_type}</td>
                  <td className="p-3 text-right"><VndAmount value={p.amount_vnd} /></td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3 text-gray-400">{new Date(p.created_at).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Manual verify**

Set yourself as admin in DB: `UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-id>';`  
Navigate to http://localhost:3000/admin → should show revenue tiles and payment table.

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/actions/dashboard.actions.ts src/app/admin/page.tsx
git commit -m "feat(admin): revenue dashboard — summary tiles + recent payments table"
```

---

## Task 4: Admin moderation — users + posts

**Files:**
- Create: `src/features/admin/actions/moderation.actions.ts`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/posts/page.tsx`

**Interfaces:**
- Consumes: `requireAdmin()` pattern from Task 3 (copy the helper — do NOT import from dashboard.actions.ts to avoid coupling; redefine it in moderation.actions.ts)
- Produces: `lockUser`, `unlockUser`, `hidePost`, `unhidePost`, `listUsers`, `listPosts`

- [ ] **Step 1: Create moderation actions**

```ts
// src/features/admin/actions/moderation.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'admin') throw new Error('Không có quyền admin')
  return supabase
}

export async function listUsers(limit = 100) {
  const supabase = await requireAdmin()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, username, role, locked, points_balance, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function lockUser(userId: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('profiles').update({ locked: true }).eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { error: null }
}

export async function unlockUser(userId: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('profiles').update({ locked: false }).eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return { error: null }
}

export async function listPosts(limit = 100) {
  const supabase = await requireAdmin()
  const { data } = await supabase
    .from('posts')
    .select('id, content, hidden, created_at, profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function hidePost(postId: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('posts').update({ hidden: true }).eq('id', postId)
  if (error) return { error: error.message }
  revalidatePath('/admin/posts')
  return { error: null }
}

export async function unhidePost(postId: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('posts').update({ hidden: false }).eq('id', postId)
  if (error) return { error: error.message }
  revalidatePath('/admin/posts')
  return { error: null }
}
```

- [ ] **Step 2: Create admin users page**

```tsx
// src/app/admin/users/page.tsx
import { listUsers, lockUser, unlockUser } from '@/features/admin/actions/moderation.actions'

export default async function AdminUsersPage() {
  const users = await listUsers()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Người dùng ({users.length})</h1>
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left p-3">Tên</th>
              <th className="text-left p-3">Username</th>
              <th className="text-right p-3">Điểm</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Trạng thái</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(u => (
              <tr key={u.id} className={u.locked ? 'opacity-50' : ''}>
                <td className="p-3">{u.display_name}</td>
                <td className="p-3 text-gray-500">@{u.username}</td>
                <td className="p-3 text-right">{u.points_balance}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.locked ? '🔒 Khoá' : '✅ Hoạt động'}</td>
                <td className="p-3">
                  {u.role !== 'admin' && (
                    <form action={u.locked ? unlockUser.bind(null, u.id) : lockUser.bind(null, u.id)}>
                      <button className="text-xs text-red-600 hover:underline">
                        {u.locked ? 'Mở khoá' : 'Khoá'}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create admin posts page**

```tsx
// src/app/admin/posts/page.tsx
import { listPosts, hidePost, unhidePost } from '@/features/admin/actions/moderation.actions'

export default async function AdminPostsPage() {
  const posts = await listPosts()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Bài đăng ({posts.length})</h1>
      <div className="space-y-2">
        {posts.map(p => (
          <div key={p.id} className={`border rounded-xl p-4 flex justify-between items-start gap-4 ${p.hidden ? 'opacity-50' : ''}`}>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-1">{(p.profiles as any)?.display_name} · {new Date(p.created_at).toLocaleString('vi-VN')}</p>
              <p className="text-sm line-clamp-2">{p.content}</p>
            </div>
            <form action={p.hidden ? unhidePost.bind(null, p.id) : hidePost.bind(null, p.id)}>
              <button className="text-xs text-red-600 hover:underline shrink-0">
                {p.hidden ? 'Hiện lại' : 'Ẩn bài'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Manual verify**

Navigate to http://localhost:3000/admin/users → list of users with lock/unlock buttons.  
Click "Khoá" on a non-admin user → row turns 50% opacity, button changes to "Mở khoá".  
Navigate to http://localhost:3000/admin/posts → list of posts with hide/unhide.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/actions/moderation.actions.ts src/app/admin/users/page.tsx src/app/admin/posts/page.tsx
git commit -m "feat(admin): user lock/unlock + post hide/unhide moderation pages"
```

---

## Task 5: /join page + referral flow update

**Files:**
- Create: `src/app/join/page.tsx`
- Create: `src/features/referral/actions/join.actions.ts`
- Modify: `src/features/referral/actions/referral.actions.ts`
- Modify: `src/features/auth/actions/auth.actions.ts`

**Interfaces:**
- Consumes: `get_referrer_by_code(text)` RPC (Task 1), `profiles.referral_code` column (Task 1)
- Produces: `/join?ref=CODE` sets cookie `ref_code`; `verifyOtp` processes referral on new signup; `getOrCreateReferralCode()` reads from DB

- [ ] **Step 1: Create join.actions.ts**

```ts
// src/features/referral/actions/join.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function resolveReferralCode(code: string): Promise<{ referrerId: string | null }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.rpc as any)('get_referrer_by_code', { p_code: code })
  return { referrerId: data ?? null }
}
```

- [ ] **Step 2: Create /join page**

```tsx
// src/app/join/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveReferralCode } from '@/features/referral/actions/join.actions'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const params = await searchParams
  const code = params.ref?.trim().toLowerCase()

  if (!code) redirect('/register')

  const { referrerId } = await resolveReferralCode(code)
  if (!referrerId) redirect('/register')

  // Store referral code in cookie (7 days) then redirect to register
  const cookieStore = await cookies()
  cookieStore.set('ref_code', code, {
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  })

  redirect('/register')
}
```

- [ ] **Step 3: Update referral.actions.ts — read from DB instead of SHA-256**

Replace the content of `src/features/referral/actions/referral.actions.ts`:

```ts
'use server'
import { createClient } from '@/lib/supabase/server'

export async function getOrCreateReferralCode(): Promise<{ code: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { code: null, error: 'Chưa đăng nhập' }

  const { data: profile } = await supabase
    .from('profiles').select('referral_code').eq('id', user.id).single()
  // referral_code is set by DB trigger on insert — should always exist after migration 10 backfill
  return { code: profile?.referral_code ?? null, error: null }
}

export async function getReferralStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { total: 0, rewarded: 0 }

  const { data } = await supabase
    .from('referrals')
    .select('status')
    .eq('referrer_id', user.id)

  return {
    total: data?.length ?? 0,
    rewarded: data?.filter(r => r.status === 'rewarded').length ?? 0,
  }
}
```

- [ ] **Step 4: Update verifyOtp to process referral on new signup**

In `src/features/auth/actions/auth.actions.ts`, find the `verifyOtp` function. Replace the `isNew` block:

```ts
export async function verifyOtp(email: string, token: string) {
  const parsed = otpSchema.safeParse({ otp: token })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({ email, token: parsed.data.otp, type: 'email' })
  if (error) return { error: error.message }

  const isNew = data.user?.created_at &&
    Date.now() - new Date(data.user.created_at).getTime() < 10_000

  if (isNew && data.user) {
    // Process referral if user arrived via /join?ref=CODE
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const refCode = cookieStore.get('ref_code')?.value
    if (refCode) {
      // Look up referrer and create pending referral record
      const { data: referrerId } = await (supabase.rpc as any)('get_referrer_by_code', { p_code: refCode })
      if (referrerId && referrerId !== data.user.id) {
        await supabase.from('referrals').insert({
          referrer_id: referrerId,
          referred_id: data.user.id,
          status: 'pending',
        })
      }
      cookieStore.delete('ref_code')
    }
  }

  redirect(isNew ? '/feed?welcome=1' : '/feed')
}
```

- [ ] **Step 5: Manual verify**

1. Copy your referral code from `/invite` page (or run `SELECT referral_code FROM profiles LIMIT 1`)
2. Open a private/incognito window → navigate to `http://localhost:3000/join?ref=<code>`
3. Should redirect to `/register`
4. Register with a new email → check OTP in Inbucket (http://localhost:9000)
5. After verifying OTP → check `SELECT * FROM referrals` in Studio — should have 1 pending row

- [ ] **Step 6: Commit**

```bash
git add src/app/join/page.tsx src/features/referral/actions/join.actions.ts \
  src/features/referral/actions/referral.actions.ts src/features/auth/actions/auth.actions.ts
git commit -m "feat(referral): /join deep link + DB referral_code + process referral on signup"
```

---

## Task 6: Notification type filter tabs

**Files:**
- Modify: `src/features/notifications/components/NotificationList.tsx`

**Interfaces:**
- Consumes: `notifications.type` values: `follow, like, comment, points, referral, finance, todo, shop`
- Produces: client-side filter tabs; markAllRead already exists in `notifications.actions.ts`

- [ ] **Step 1: Update NotificationList with filter tabs**

Read the current `NotificationList.tsx` first (it's a `'use client'` component with Realtime subscription). Replace the return statement to add tabs:

```tsx
// Add to existing TYPE_LABELS record at top:
const TYPE_LABELS: Record<string, string> = {
  follow: 'đã theo dõi bạn',
  like: 'đã thích bài viết của bạn',
  comment: 'đã bình luận bài viết của bạn',
  points: 'bạn vừa nhận điểm thưởng',
  referral: 'bạn bè đã tham gia qua lời mời của bạn',
  finance: 'cập nhật tài chính',
  todo: 'nhắc nhở công việc',
  shop: 'đơn hàng shop',
}

// Add above the return:
const TAB_GROUPS: Record<string, string[]> = {
  'Tất cả': [],
  'Xã hội': ['follow', 'like', 'comment', 'referral'],
  'Tài chính': ['finance', 'points'],
  'Công việc': ['todo'],
  'Shop': ['shop'],
}
```

Then wrap the existing return with tab state:

```tsx
// Add to useState section:
const [activeTab, setActiveTab] = useState('Tất cả')

// Filter items before render:
const filtered = activeTab === 'Tất cả'
  ? items
  : items.filter(n => TAB_GROUPS[activeTab]?.includes(n.type))

// Replace return:
return (
  <div className="space-y-3">
    {/* Tabs */}
    <div className="flex gap-2 overflow-x-auto pb-1">
      {Object.keys(TAB_GROUPS).map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
            activeTab === tab
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 text-gray-600 hover:border-blue-400'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>

    <div className="flex justify-end">
      <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>Đánh dấu đã đọc</Button>
    </div>

    {filtered.length === 0 ? (
      <p className="text-center text-gray-400 py-8">Chưa có thông báo.</p>
    ) : (
      <div className="space-y-1">
        {filtered.map(n => (
          <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${n.read_at ? '' : 'bg-blue-50 dark:bg-blue-950'}`}>
            <div className="flex-1">
              <p className="text-sm">{TYPE_LABELS[n.type] ?? n.type}</p>
              <p className="text-xs text-gray-400 mt-0.5">{dayjs(n.created_at).fromNow()}</p>
            </div>
            {!n.read_at && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
          </div>
        ))}
      </div>
    )}
  </div>
)
```

- [ ] **Step 2: Manual verify**

Navigate to `/notifications` → tabs appear at top (Tất cả, Xã hội, Tài chính, Công việc, Shop). Click each tab → list filters correctly. Realtime still works (test by triggering a like on another device/tab).

- [ ] **Step 3: Commit**

```bash
git add src/features/notifications/components/NotificationList.tsx
git commit -m "feat(notifications): type filter tabs (social, finance, todo, shop)"
```

---

## Task 7: Migration 11 — Shop Marketplace schema

**Files:**
- Create: `sql/migrations/11-phase3-shop-marketplace.sql`
- Modify: `scripts/migrate.sh`

**Interfaces:**
- Produces: `shop_partners`, `shop_products`, `shop_product_codes`, `shop_orders` tables; `purchase_product_with_points(uuid)`, `get_my_order_code(uuid)` RPCs

- [ ] **Step 1: Write migration**

```sql
-- sql/migrations/11-phase3-shop-marketplace.sql
-- ============================================================================
-- PHASE 3 — TRACK B: SHOP MARKETPLACE
-- ============================================================================

-- 1. Extend points_ledger reason_code
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_code_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_code_check
  CHECK (reason_code IN (
    'signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved',
    'subscription_points','shop_purchase_points'
  ));

-- 2. Partners
CREATE TABLE IF NOT EXISTS public.shop_partners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  logo_url   text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Products
CREATE TABLE IF NOT EXISTS public.shop_products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   uuid NOT NULL REFERENCES public.shop_partners(id) ON DELETE RESTRICT,
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description  text,
  image_url    text,
  price_points integer CHECK (price_points IS NULL OR price_points > 0),
  price_vnd    integer CHECK (price_vnd IS NULL OR price_vnd > 0),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_products_price_check CHECK (price_points IS NOT NULL OR price_vnd IS NOT NULL)
);

-- 4. Code inventory — NEVER grant to client
CREATE TABLE IF NOT EXISTS public.shop_product_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE RESTRICT,
  code              text NOT NULL,
  assigned_order_id uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, code)
);
CREATE INDEX IF NOT EXISTS idx_shop_codes_available
  ON public.shop_product_codes (product_id) WHERE assigned_order_id IS NULL;

-- 5. Orders
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES public.shop_products(id),
  code_id        uuid REFERENCES public.shop_product_codes(id),
  payment_method text NOT NULL CHECK (payment_method IN ('points', 'vnpay')),
  amount_points  integer,
  amount_vnd     integer,
  status         text NOT NULL DEFAULT 'fulfilled' CHECK (status IN ('fulfilled', 'failed')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON public.shop_orders (user_id, created_at DESC);

-- 6. Purchase with points — SKIP LOCKED for concurrent safety
CREATE OR REPLACE FUNCTION public.purchase_product_with_points(p_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_price    integer;
  v_code_id  uuid;
  v_order_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Yeu cau dang nhap'; END IF;

  SELECT price_points INTO v_price
    FROM public.shop_products
   WHERE id = p_product_id AND active;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'San pham khong kha dung hoac khong ho tro mua bang diem';
  END IF;

  -- Lock exactly 1 available code; skip any row another transaction has locked
  SELECT id INTO v_code_id
    FROM public.shop_product_codes
   WHERE product_id = p_product_id AND assigned_order_id IS NULL
   FOR UPDATE SKIP LOCKED
   LIMIT 1;
  IF v_code_id IS NULL THEN RAISE EXCEPTION 'Het ma, vui long thu lai sau'; END IF;

  -- Deduct points (add_points validates balance internally)
  PERFORM public.add_points(v_user_id, -v_price, 'shop_purchase_points', p_product_id);

  INSERT INTO public.shop_orders (user_id, product_id, code_id, payment_method, amount_points, status)
  VALUES (v_user_id, p_product_id, v_code_id, 'points', v_price, 'fulfilled')
  RETURNING id INTO v_order_id;

  UPDATE public.shop_product_codes SET assigned_order_id = v_order_id WHERE id = v_code_id;

  RETURN v_order_id;
END;
$$;

-- 7. Reveal code — only for order owner
CREATE OR REPLACE FUNCTION public.get_my_order_code(p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT spc.code INTO v_code
    FROM public.shop_orders so
    JOIN public.shop_product_codes spc ON spc.id = so.code_id
   WHERE so.id = p_order_id AND so.user_id = auth.uid();
  IF v_code IS NULL THEN RAISE EXCEPTION 'Khong co quyen xem ma nay'; END IF;
  RETURN v_code;
END;
$$;

-- 8. RLS
ALTER TABLE public.shop_partners      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_partners_select_active" ON public.shop_partners FOR SELECT USING (active);
CREATE POLICY "shop_products_select_active" ON public.shop_products FOR SELECT USING (active);
CREATE POLICY "shop_orders_select_own"      ON public.shop_orders   FOR SELECT USING (auth.uid() = user_id);

-- Admin sees and manages everything
CREATE POLICY "admin_all_shop_partners" ON public.shop_partners FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "admin_all_shop_products" ON public.shop_products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "admin_all_shop_codes" ON public.shop_product_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "admin_all_shop_orders" ON public.shop_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- 9. GRANT (explicit — RLS alone does not grant table access)
GRANT SELECT ON public.shop_partners, public.shop_products TO authenticated, anon;
GRANT SELECT ON public.shop_orders TO authenticated;
-- shop_product_codes: NO GRANT to any client role — codes only via get_my_order_code()
REVOKE ALL ON public.shop_product_codes FROM authenticated, anon, public;

GRANT EXECUTE ON FUNCTION public.purchase_product_with_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_order_code(uuid) TO authenticated;
```

- [ ] **Step 2: Add to migrate.sh**

After `run_sql "sql/migrations/10-phase3-admin-referral.sql"`, add:

```bash
run_sql "sql/migrations/11-phase3-shop-marketplace.sql"
```

- [ ] **Step 3: Run migration**

```bash
DB_PORT=5432 bash scripts/migrate.sh
```

- [ ] **Step 4: Verify**

```sql
-- Function privileges
SELECT has_function_privilege('authenticated','public.purchase_product_with_points(uuid)','execute'); -- true
SELECT has_function_privilege('authenticated','public.get_my_order_code(uuid)','execute');            -- true
-- Codes table is blocked
SELECT has_table_privilege('authenticated','public.shop_product_codes','select');                    -- false
```

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/11-phase3-shop-marketplace.sql scripts/migrate.sh
git commit -m "feat(db): Phase 3 migration 11 — shop marketplace schema + RPCs"
```

---

## Task 8: Migration 12 — complete_payment shop branch

**Files:**
- Create: `sql/migrations/12-complete-payment-shop.sql`
- Modify: `scripts/migrate.sh`

**Interfaces:**
- Consumes: `payments.metadata` column (Task 1), `shop_product_codes`, `shop_orders` (Task 7)
- Produces: `complete_payment()` handles `payment_type='shop_purchase'`

- [ ] **Step 1: Write migration**

```sql
-- sql/migrations/12-complete-payment-shop.sql
-- Extend complete_payment() to handle payment_type = 'shop_purchase'
-- Adds shop_purchase branch; topup + subscription branches unchanged.

CREATE OR REPLACE FUNCTION public.complete_payment(
  p_gateway_txn_id text,
  p_gateway        text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment  payments%ROWTYPE;
  v_delta    integer;
  v_code_id  uuid;
  v_order_id uuid;
  v_product_id uuid;
  v_err      text;
BEGIN
  UPDATE payments
  SET    status = 'succeeded',
         gateway_txn_id = p_gateway_txn_id
  WHERE  gateway_txn_id = p_gateway_txn_id
    AND  gateway         = p_gateway
    AND  status          = 'pending'
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', true, 'skipped', true);
  END IF;

  IF v_payment.payment_type = 'subscription' THEN
    INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
    VALUES (v_payment.user_id, 'premium', 'active', 'vnpay', now() + interval '30 days')
    ON CONFLICT (user_id) DO UPDATE
      SET expires_at     = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
          status         = 'active',
          payment_method = 'vnpay';
    RETURN json_build_object('ok', true, 'subscription', true, 'payment_id', v_payment.id);

  ELSIF v_payment.payment_type = 'shop_purchase' THEN
    -- product_id stored in payments.metadata when creating the VNPay link
    v_product_id := (v_payment.metadata->>'product_id')::uuid;
    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'shop_purchase missing product_id in metadata';
    END IF;

    SELECT id INTO v_code_id
      FROM public.shop_product_codes
     WHERE product_id = v_product_id AND assigned_order_id IS NULL
     FOR UPDATE SKIP LOCKED
     LIMIT 1;
    IF v_code_id IS NULL THEN
      -- No code available — mark order failed, refund is a manual ops task
      INSERT INTO public.shop_orders (user_id, product_id, payment_method, amount_vnd, status)
      VALUES (v_payment.user_id, v_product_id, 'vnpay', v_payment.amount_vnd, 'failed')
      RETURNING id INTO v_order_id;
      RETURN json_build_object('ok', false, 'error', 'Het ma', 'order_id', v_order_id);
    END IF;

    INSERT INTO public.shop_orders (user_id, product_id, code_id, payment_method, amount_vnd, status)
    VALUES (v_payment.user_id, v_product_id, v_code_id, 'vnpay', v_payment.amount_vnd, 'fulfilled')
    RETURNING id INTO v_order_id;

    UPDATE public.shop_product_codes SET assigned_order_id = v_order_id WHERE id = v_code_id;

    RETURN json_build_object('ok', true, 'shop_purchase', true, 'order_id', v_order_id);

  ELSE
    -- Default: topup — convert VND to points (1.000đ = 1 point)
    v_delta := FLOOR(v_payment.amount_vnd::numeric / 1000)::integer;
    IF v_delta > 0 THEN
      PERFORM public.add_points(v_payment.user_id, v_delta, 'topup', v_payment.id);
    END IF;
    RETURN json_build_object('ok', true, 'payment_id', v_payment.id, 'points', v_delta);
  END IF;

EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
  RETURN json_build_object('ok', false, 'error', v_err);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.complete_payment(text, text) TO service_role;
```

- [ ] **Step 2: Add to migrate.sh**

```bash
run_sql "sql/migrations/12-complete-payment-shop.sql"
```

- [ ] **Step 3: Run migration**

```bash
DB_PORT=5432 bash scripts/migrate.sh
```

- [ ] **Step 4: Verify**

```sql
-- complete_payment still only callable by service_role
SELECT has_function_privilege('authenticated','public.complete_payment(text,text)','execute'); -- false
SELECT has_function_privilege('service_role','public.complete_payment(text,text)','execute');  -- true
```

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/12-complete-payment-shop.sql scripts/migrate.sh
git commit -m "feat(db): Phase 3 migration 12 — complete_payment shop_purchase branch"
```

---

## Task 9: Shop pages — list, detail, orders

**Files:**
- Create: `src/features/shop/actions/shop.actions.ts`
- Create: `src/app/shop/page.tsx`
- Create: `src/app/shop/[id]/page.tsx`
- Create: `src/app/shop/orders/page.tsx`

**Interfaces:**
- Consumes: `purchase_product_with_points(uuid)` RPC, `get_my_order_code(uuid)` RPC, `shop_partners`, `shop_products`, `shop_orders` tables
- Produces: public product listing, authenticated purchase flow, order history with code reveal

- [ ] **Step 1: Create shop.actions.ts**

```ts
// src/features/shop/actions/shop.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function listProducts() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('shop_products')
    .select('*, shop_partners(name, logo_url)')
    .eq('active', true)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getProduct(id: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('shop_products')
    .select('*, shop_partners(name, logo_url)')
    .eq('id', id)
    .eq('active', true)
    .single()
  return data
}

export async function purchaseWithPoints(productId: string): Promise<{ orderId: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { orderId: null, error: 'Chưa đăng nhập' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('purchase_product_with_points', { p_product_id: productId })
  if (error) return { orderId: null, error: error.message }
  revalidatePath('/shop/orders')
  return { orderId: data, error: null }
}

export async function listMyOrders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('shop_orders')
    .select('*, shop_products(title, image_url, shop_partners(name))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getOrderCode(orderId: string): Promise<{ code: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { code: null, error: 'Chưa đăng nhập' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('get_my_order_code', { p_order_id: orderId })
  if (error) return { code: null, error: error.message }
  return { code: data, error: null }
}
```

- [ ] **Step 2: Create /shop page**

```tsx
// src/app/shop/page.tsx
import Link from 'next/link'
import { listProducts } from '@/features/shop/actions/shop.actions'

export default async function ShopPage() {
  const products = await listProducts()

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Shop</h1>
        <Link href="/shop/orders" className="text-sm text-blue-600 hover:underline">Đơn của tôi →</Link>
      </div>

      {products.length === 0 ? (
        <p className="text-center text-gray-400 py-12">Chưa có sản phẩm.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map(p => (
            <Link key={p.id} href={`/shop/${p.id}`} className="border rounded-xl p-4 hover:border-blue-400 transition-colors">
              {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-32 object-cover rounded-lg mb-3" />}
              <p className="text-xs text-gray-400">{(p.shop_partners as any)?.name}</p>
              <p className="font-semibold mt-0.5">{p.title}</p>
              <div className="flex gap-2 mt-2 text-sm">
                {p.price_points && <span className="text-amber-600">{p.price_points.toLocaleString()} điểm</span>}
                {p.price_vnd && <span className="text-green-700">{p.price_vnd.toLocaleString('vi-VN')}đ</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Create /shop/[id] page**

```tsx
// src/app/shop/[id]/page.tsx
import { redirect } from 'next/navigation'
import { getProduct, purchaseWithPoints } from '@/features/shop/actions/shop.actions'

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { id } = await params
  const { error } = await searchParams
  const product = await getProduct(id)
  if (!product) redirect('/shop')

  async function handleBuyWithPoints() {
    'use server'
    const { orderId, error: err } = await purchaseWithPoints(id)
    if (err) redirect(`/shop/${id}?error=${encodeURIComponent(err)}`)
    redirect(`/shop/orders?new=${orderId}`)
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {product.image_url && (
        <img src={product.image_url} alt={product.title} className="w-full h-48 object-cover rounded-xl" />
      )}
      <p className="text-sm text-gray-400">{(product.shop_partners as any)?.name}</p>
      <h1 className="text-2xl font-bold">{product.title}</h1>
      {product.description && <p className="text-sm text-gray-600">{product.description}</p>}

      {error && (
        <div className="border border-red-200 bg-red-50 dark:bg-red-950 rounded-xl p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="border rounded-xl p-4 space-y-3">
        {product.price_points && (
          <form action={handleBuyWithPoints}>
            <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              Mua bằng {product.price_points.toLocaleString()} điểm
            </button>
          </form>
        )}
        {product.price_vnd && (
          <p className="text-center text-sm text-gray-500">
            Mua bằng VNPay ({product.price_vnd.toLocaleString('vi-VN')}đ) — sắp có
          </p>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Create /shop/orders page**

```tsx
// src/app/shop/orders/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { listMyOrders, getOrderCode } from '@/features/shop/actions/shop.actions'

export default async function ShopOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { new: newOrderId } = await searchParams
  const orders = await listMyOrders()

  // Pre-fetch code for the just-purchased order to show immediately
  let newCode: string | null = null
  if (newOrderId) {
    const { code } = await getOrderCode(newOrderId)
    newCode = code
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Đơn hàng của tôi</h1>

      {newCode && (
        <div className="border border-green-300 bg-green-50 dark:bg-green-950 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">🎉 Mua thành công! Mã voucher:</p>
          <p className="font-mono text-lg font-bold mt-1 tracking-widest">{newCode}</p>
        </div>
      )}

      {orders.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Chưa có đơn hàng.</p>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.id} className="border rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{(o.shop_products as any)?.title}</p>
                  <p className="text-xs text-gray-400">{(o.shop_products as any)?.shop_partners?.name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'fulfilled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {o.status === 'fulfilled' ? 'Thành công' : 'Thất bại'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{o.payment_method === 'points' ? `${o.amount_points?.toLocaleString()} điểm` : `${o.amount_vnd?.toLocaleString('vi-VN')}đ`}</span>
                <span>{new Date(o.created_at).toLocaleString('vi-VN')}</span>
              </div>
              {o.status === 'fulfilled' && o.id !== newOrderId && (
                <RevealCodeButton orderId={o.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

// Client component for lazy code reveal
// src/app/shop/orders/page.tsx (add below, same file)
'use client'
import { useState } from 'react'
import { getOrderCode } from '@/features/shop/actions/shop.actions'

function RevealCodeButton({ orderId }: { orderId: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function reveal() {
    setLoading(true)
    const { code: c } = await getOrderCode(orderId)
    setCode(c)
    setLoading(false)
  }

  if (code) return <p className="font-mono font-bold tracking-widest">{code}</p>
  return (
    <button onClick={reveal} disabled={loading} className="text-xs text-blue-600 hover:underline">
      {loading ? 'Đang tải...' : 'Xem mã voucher'}
    </button>
  )
}
```

**Note:** The `RevealCodeButton` is a `'use client'` component. Since the file mixes server and client, extract `RevealCodeButton` to a separate file `src/app/shop/orders/RevealCodeButton.tsx` with `'use client'` at top, and import it in the page.

- [ ] **Step 5: Extract RevealCodeButton to its own file**

```tsx
// src/app/shop/orders/RevealCodeButton.tsx
'use client'
import { useState } from 'react'
import { getOrderCode } from '@/features/shop/actions/shop.actions'

export function RevealCodeButton({ orderId }: { orderId: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function reveal() {
    setLoading(true)
    const { code: c } = await getOrderCode(orderId)
    setCode(c)
    setLoading(false)
  }

  if (code) return <p className="font-mono font-bold tracking-widest">{code}</p>
  return (
    <button onClick={reveal} disabled={loading} className="text-xs text-blue-600 hover:underline">
      {loading ? 'Đang tải...' : 'Xem mã voucher'}
    </button>
  )
}
```

Then remove the inline version from `page.tsx` and add `import { RevealCodeButton } from './RevealCodeButton'` at top.

- [ ] **Step 6: Manual verify**

In Supabase Studio, seed test data:
```sql
INSERT INTO public.shop_partners (name) VALUES ('Test Partner') RETURNING id;
-- Copy the partner id
INSERT INTO public.shop_products (partner_id, title, price_points)
VALUES ('<partner_id>', 'Test Voucher 100đ Off', 100);
-- Copy product id
INSERT INTO public.shop_product_codes (product_id, code)
VALUES ('<product_id>', 'TEST-ABCD-1234');
```
Navigate to `/shop` → product appears. Click → detail page with "Mua bằng 100 điểm" button.  
Click buy → redirected to `/shop/orders?new=<order_id>` → code `TEST-ABCD-1234` shown immediately.

- [ ] **Step 7: Commit**

```bash
git add src/features/shop/ src/app/shop/
git commit -m "feat(shop): product listing, purchase with points, order history + code reveal"
```

---

## Task 10: Admin shop management

**Files:**
- Create: `src/features/admin/actions/shop.actions.ts`
- Create: `src/app/admin/shop/page.tsx`

**Interfaces:**
- Consumes: `shop_partners`, `shop_products`, `shop_product_codes` (admin ALL policies from Task 7)
- Produces: admin CRUD for partners/products, bulk code import

- [ ] **Step 1: Create admin shop actions**

```ts
// src/features/admin/actions/shop.actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'admin') throw new Error('Không có quyền admin')
  return supabase
}

export async function listAdminShopData() {
  const supabase = await requireAdmin()
  const [{ data: partners }, { data: products }] = await Promise.all([
    supabase.from('shop_partners').select('*').order('created_at', { ascending: false }),
    supabase.from('shop_products').select('*, shop_partners(name)').order('created_at', { ascending: false }),
  ])
  return { partners: partners ?? [], products: products ?? [] }
}

export async function upsertPartner(
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin()
  const id = formData.get('id') as string | null
  const name = (formData.get('name') as string)?.trim()
  const logo_url = (formData.get('logo_url') as string)?.trim() || null
  if (!name) return { error: 'Tên không được để trống' }

  const { error } = id
    ? await supabase.from('shop_partners').update({ name, logo_url }).eq('id', id)
    : await supabase.from('shop_partners').insert({ name, logo_url })
  if (error) return { error: error.message }
  revalidatePath('/admin/shop')
  return { error: null }
}

export async function upsertProduct(
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin()
  const id = formData.get('id') as string | null
  const partner_id = formData.get('partner_id') as string
  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const price_points = formData.get('price_points') ? parseInt(formData.get('price_points') as string) : null
  const price_vnd = formData.get('price_vnd') ? parseInt(formData.get('price_vnd') as string) : null

  if (!title || !partner_id) return { error: 'Thiếu thông tin' }
  if (!price_points && !price_vnd) return { error: 'Phải có ít nhất 1 mức giá' }

  const payload = { partner_id, title, description, price_points, price_vnd }
  const { error } = id
    ? await supabase.from('shop_products').update(payload).eq('id', id)
    : await supabase.from('shop_products').insert(payload)
  if (error) return { error: error.message }
  revalidatePath('/admin/shop')
  return { error: null }
}

export async function bulkImportCodes(
  productId: string,
  codesRaw: string
): Promise<{ imported: number; error: string | null }> {
  const supabase = await requireAdmin()
  const codes = codesRaw
    .split(/[\n,]/)
    .map(c => c.trim())
    .filter(Boolean)
    .map(code => ({ product_id: productId, code }))

  if (codes.length === 0) return { imported: 0, error: 'Không có mã nào' }

  const { data, error } = await supabase
    .from('shop_product_codes')
    .insert(codes)
    .select('id')
  if (error) return { imported: 0, error: error.message }
  revalidatePath('/admin/shop')
  return { imported: data?.length ?? 0, error: null }
}

export async function getCodeStats(productId: string) {
  const supabase = await requireAdmin()
  const { count: total } = await supabase
    .from('shop_product_codes')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)
  const { count: available } = await supabase
    .from('shop_product_codes')
    .select('*', { count: 'exact', head: true })
    .eq('product_id', productId)
    .is('assigned_order_id', null)
  return { total: total ?? 0, available: available ?? 0 }
}
```

- [ ] **Step 2: Create admin shop page**

```tsx
// src/app/admin/shop/page.tsx
import { listAdminShopData, upsertPartner, upsertProduct, bulkImportCodes } from '@/features/admin/actions/shop.actions'

export default async function AdminShopPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; err?: string }>
}) {
  const { partners, products } = await listAdminShopData()
  const params = await searchParams

  async function handleUpsertPartner(formData: FormData) {
    'use server'
    const { redirect } = await import('next/navigation')
    const { error } = await upsertPartner(formData)
    redirect(`/admin/shop?${error ? `err=${encodeURIComponent(error)}` : 'msg=Đã lưu đối tác'}`)
  }

  async function handleUpsertProduct(formData: FormData) {
    'use server'
    const { redirect } = await import('next/navigation')
    const { error } = await upsertProduct(formData)
    redirect(`/admin/shop?${error ? `err=${encodeURIComponent(error)}` : 'msg=Đã lưu sản phẩm'}`)
  }

  async function handleBulkImport(formData: FormData) {
    'use server'
    const { redirect } = await import('next/navigation')
    const productId = formData.get('product_id') as string
    const codesRaw = formData.get('codes') as string
    const { imported, error } = await bulkImportCodes(productId, codesRaw)
    redirect(`/admin/shop?${error ? `err=${encodeURIComponent(error)}` : `msg=Đã nhập ${imported} mã`}`)
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">Quản lý Shop</h1>

      {params.msg && <div className="border border-green-300 bg-green-50 rounded-xl p-3 text-sm text-green-700">{params.msg}</div>}
      {params.err && <div className="border border-red-300 bg-red-50 rounded-xl p-3 text-sm text-red-700">{params.err}</div>}

      {/* Add Partner */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Thêm đối tác</h2>
        <form action={handleUpsertPartner} className="flex gap-2">
          <input name="name" placeholder="Tên đối tác" required className="flex-1 border rounded px-3 py-1.5 text-sm" />
          <input name="logo_url" placeholder="URL logo (tuỳ chọn)" className="flex-1 border rounded px-3 py-1.5 text-sm" />
          <button className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded">Thêm</button>
        </form>
        <ul className="text-sm space-y-1">
          {partners.map(p => <li key={p.id} className="text-gray-600">{p.name} <span className="text-gray-400 text-xs">({p.id.slice(0,8)})</span></li>)}
        </ul>
      </section>

      {/* Add Product */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Thêm sản phẩm</h2>
        <form action={handleUpsertProduct} className="space-y-2">
          <select name="partner_id" required className="w-full border rounded px-3 py-1.5 text-sm">
            <option value="">— Chọn đối tác —</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input name="title" placeholder="Tên sản phẩm" required className="w-full border rounded px-3 py-1.5 text-sm" />
          <textarea name="description" placeholder="Mô tả (tuỳ chọn)" rows={2} className="w-full border rounded px-3 py-1.5 text-sm" />
          <div className="flex gap-2">
            <input name="price_points" type="number" placeholder="Giá (điểm)" className="flex-1 border rounded px-3 py-1.5 text-sm" />
            <input name="price_vnd" type="number" placeholder="Giá (VNĐ)" className="flex-1 border rounded px-3 py-1.5 text-sm" />
          </div>
          <button className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded">Thêm sản phẩm</button>
        </form>
      </section>

      {/* Bulk Import Codes */}
      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Nhập mã kho hàng</h2>
        <form action={handleBulkImport} className="space-y-2">
          <select name="product_id" required className="w-full border rounded px-3 py-1.5 text-sm">
            <option value="">— Chọn sản phẩm —</option>
            {products.map(p => <option key={p.id} value={p.id}>{(p.shop_partners as any)?.name} — {p.title}</option>)}
          </select>
          <textarea name="codes" rows={6} placeholder="Mỗi mã 1 dòng (hoặc cách nhau bằng dấu phẩy)" required className="w-full border rounded px-3 py-1.5 text-sm font-mono" />
          <button className="bg-green-600 text-white text-sm px-4 py-1.5 rounded">Nhập mã</button>
        </form>
      </section>

      {/* Product list */}
      <section className="border rounded-xl p-4 space-y-2">
        <h2 className="font-semibold">Sản phẩm ({products.length})</h2>
        {products.map(p => (
          <div key={p.id} className="flex justify-between text-sm py-1 border-b last:border-0">
            <span>{p.title} <span className="text-gray-400">({(p.shop_partners as any)?.name})</span></span>
            <span className="text-gray-400 text-xs">{p.price_points ? `${p.price_points}đ` : ''} {p.price_vnd ? `${p.price_vnd.toLocaleString()}đ VNPay` : ''}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Manual verify**

Navigate to `/admin/shop`. Add a test partner → appears in list. Add a test product linked to that partner → appears. Import 3 codes via bulk import → success message shows count. Check in Studio: `SELECT * FROM shop_product_codes` shows the codes.

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/actions/shop.actions.ts src/app/admin/shop/
git commit -m "feat(admin): shop management — partner/product CRUD + bulk code import"
```

---

## Task 11: Regen database.ts + SQL checklist

**Files:**
- Modify: `src/lib/types/database.ts`

**Interfaces:**
- Consumes: live DB schema after all migrations
- Produces: updated TypeScript types for all new tables and functions

- [ ] **Step 1: Regen types**

```bash
npx supabase gen types typescript \
  --db-url "postgresql://postgres:postgres@127.0.0.1:5432/postgres" \
  > src/lib/types/database.ts
```

- [ ] **Step 2: Fix TypeScript errors**

```bash
npx tsc --noEmit
```

Fix any type errors — most will be from new tables not matching `as any` casts. Update RPCs in `shop.actions.ts` and `join.actions.ts` to use typed calls where the regen adds them.

- [ ] **Step 3: Run full SQL checklist (from spec section 7)**

In Studio SQL Editor:

```sql
-- === MIGRATION 10 ===
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name IN ('role','locked','referral_code');
-- Expected: 3 rows

SELECT COUNT(*) FROM public.profiles WHERE referral_code IS NULL;
-- Expected: 0

SELECT has_function_privilege('authenticated', 'public.is_admin()', 'execute');
-- Expected: true

SELECT has_function_privilege('authenticated', 'public.get_referrer_by_code(text)', 'execute');
-- Expected: true

-- === MIGRATION 11 ===
SELECT has_function_privilege('authenticated','public.purchase_product_with_points(uuid)','execute');
-- Expected: true

SELECT has_function_privilege('authenticated','public.get_my_order_code(uuid)','execute');
-- Expected: true

SELECT has_table_privilege('authenticated','public.shop_product_codes','select');
-- Expected: false

-- === PHASE 1-2 audit still holds ===
SELECT has_function_privilege('authenticated','public.add_points(uuid,integer,text,uuid)','execute');
-- Expected: false

SELECT has_function_privilege('authenticated','public.complete_referral(uuid)','execute');
-- Expected: false

SELECT has_function_privilege('authenticated','public.complete_payment(text,text)','execute');
-- Expected: false

SELECT has_function_privilege('service_role','public.complete_payment(text,text)','execute');
-- Expected: true
```

- [ ] **Step 4: Add nav links for new routes**

Find the root layout or nav component (check `src/app/layout.tsx` for nav). Add links to `/shop`, `/admin` (show only when role=admin — server render).

- [ ] **Step 5: Commit**

```bash
git add src/lib/types/database.ts src/app/layout.tsx
git commit -m "chore: regen database.ts + nav links for shop/admin (Phase 3 complete)"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| `profiles.role` + admin RLS | Task 1 |
| `profiles.locked`, `posts.hidden` | Task 1 |
| `profiles.referral_code` + trigger | Task 1 |
| `is_admin()` SECURITY DEFINER | Task 1 |
| `get_referrer_by_code()` | Task 1 |
| Middleware admin guard | Task 2 |
| Admin double-check in layout | Task 2 |
| Revenue dashboard (2 VNPay flows) | Task 3 |
| Lock/unlock users | Task 4 |
| Hide/unhide posts | Task 4 |
| `/join?ref=CODE` deep link | Task 5 |
| referral.actions reads from DB column | Task 5 |
| Referral processed on signup | Task 5 |
| Notification filter by type | Task 6 |
| Shop schema (4 tables) | Task 7 |
| `purchase_product_with_points` SKIP LOCKED | Task 7 |
| `get_my_order_code` SECURITY DEFINER | Task 7 |
| `shop_product_codes` REVOKE ALL | Task 7 |
| `complete_payment` shop branch | Task 8 |
| `payments.metadata` for product_id | Task 1 + 8 |
| `/shop`, `/shop/[id]`, `/shop/orders` | Task 9 |
| Admin shop CRUD + bulk import | Task 10 |
| database.ts regen | Task 11 |
| SQL privilege checklist | Task 11 |

**Gaps identified and resolved:**
- `payments.metadata jsonb` column was missing from original spec → added to Task 1
- Admin shop page was in spec section 7 (`features/admin/shop.actions.ts`) → covered in Task 10
- `markAllRead` already existed in `notifications.actions.ts` → Task 6 reuses it, no duplication
- `RevealCodeButton` client component needs to be in a separate file (Next.js restriction on mixing server/client) → noted explicitly in Task 9 Step 5
