# Phase 4: Realtime, Search, Month Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time new-post banner + live wallet balance, full-text search in /explore, and month navigation in /finance.

**Architecture:** Realtime uses Supabase `postgres_changes` client channels (same pattern as `NotificationBadge`). Search uses PostgreSQL GIN functional indexes + `websearch_to_tsquery` in a server action. Month picker uses URL `searchParams` (GET, no JS state) with a client component for prev/next navigation.

**Tech Stack:** Next.js 16 App Router, Supabase Realtime, PostgreSQL full-text search, TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-09-04-phase4-realtime-search.md`

## Global Constraints

- **Next.js 16**: `searchParams` in Server Components is `Promise<{[k]:string|string[]|undefined}>` — must `await searchParams` before reading any key.
- **Supabase Realtime channel cleanup**: every `useEffect` that subscribes MUST return `() => { supabase.removeChannel(channel) }`.
- **`websearch_to_tsquery('simple', query)`**: PostgreSQL 11+; dictionary `'simple'` for Vietnamese (no English stemmer). Empty/whitespace query must return `{ posts: [], users: [] }` before hitting DB.
- **TypeScript strict**: `searchParams.q` can be `string | string[] | undefined`; coerce with `typeof q === 'string' ? q : ''` before use.
- **No new dependencies**: do not add npm packages.
- **YAGNI**: no debounce, no result highlighting, no search pagination; limit 20 posts + 10 users.
- **Hidden/deleted filter in search**: always apply `.eq('hidden', false).is('deleted_at', null)` on post search results.

---

### Task 1: Migration 15 — GIN search indexes

**Files:**
- Create: `sql/migrations/15-search-indexes.sql`
- Modify: `scripts/migrate.sh`

**Interfaces:**
- Produces: GIN index `posts_search_idx` on `posts` table; GIN index `profiles_search_idx` on `profiles` table — consumed by Task 2's search action.

- [ ] **Step 1: Create migration file**

```sql
-- sql/migrations/15-search-indexes.sql
-- GIN index for full-text search on posts
CREATE INDEX IF NOT EXISTS posts_search_idx
  ON public.posts
  USING GIN (to_tsvector('simple', coalesce(content, '')));

-- GIN index for full-text search on profiles (display_name + username)
CREATE INDEX IF NOT EXISTS profiles_search_idx
  ON public.profiles
  USING GIN (
    to_tsvector('simple',
      coalesce(display_name, '') || ' ' || coalesce(username, ''))
  );
```

- [ ] **Step 2: Add to migrate.sh**

Open `scripts/migrate.sh`. After the line `run_sql "sql/migrations/14-parked-fixes.sql"`, add:

```bash
run_sql "sql/migrations/15-search-indexes.sql"
```

- [ ] **Step 3: Verify indexes exist**

If Supabase local is running (`npx supabase start`):
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -c "\di public.*search*"
```
Expected: two rows — `posts_search_idx` and `profiles_search_idx`.

If Supabase is not running, skip this step — indexes are verified at integration time.

- [ ] **Step 4: Commit**

```bash
git add sql/migrations/15-search-indexes.sql scripts/migrate.sh
git commit -m "feat(search): add GIN full-text indexes on posts and profiles (T-P4-01)"
```

---

### Task 2: Search action + /explore UI

**Files:**
- Create: `src/features/search/actions/search.actions.ts`
- Modify: `src/app/explore/page.tsx`

**Interfaces:**
- Consumes: GIN indexes from Task 1 (can run without them — just slower).
- Produces: `searchContent(query: string): Promise<{ posts: SearchPost[]; users: SearchUser[] }>` — consumed by the modified `/explore` page in this same task.

**Types to use:**

```typescript
type SearchPost = {
  id: string
  content: string | null
  created_at: string
  profiles: { display_name: string; avatar_url: string | null }
}

type SearchUser = {
  id: string
  display_name: string
  username: string | null
  avatar_url: string | null
}
```

- [ ] **Step 1: Create search action**

Create `src/features/search/actions/search.actions.ts`:

```typescript
'use server'
import { createClient } from '@/lib/supabase/server'

export type SearchPost = {
  id: string
  content: string | null
  created_at: string
  profiles: { display_name: string; avatar_url: string | null }
}

export type SearchUser = {
  id: string
  display_name: string
  username: string | null
  avatar_url: string | null
}

export async function searchContent(
  query: string
): Promise<{ posts: SearchPost[]; users: SearchUser[] }> {
  const q = query.trim()
  if (!q) return { posts: [], users: [] }

  const supabase = await createClient()

  const [{ data: rawPosts }, { data: rawUsers }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, content, created_at, profiles(display_name, avatar_url)')
      .eq('hidden', false)
      .is('deleted_at', null)
      .textSearch('content', q, { type: 'websearch', config: 'simple' })
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url')
      .or(
        `display_name.ilike.%${q}%,username.ilike.%${q}%`
      )
      .limit(10),
  ])

  return {
    posts: (rawPosts ?? []) as SearchPost[],
    users: (rawUsers ?? []) as SearchUser[],
  }
}
```

Note: Supabase JS `.textSearch()` maps to `@@` with the given config — this uses the GIN index from Task 1. The `profiles` query uses `ilike` (simpler, still fast at small scale via profiles_search_idx indirectly).

- [ ] **Step 2: Manual test of action (optional but fast)**

```bash
npx tsx -e "
import { searchContent } from './src/features/search/actions/search.actions'
searchContent('test').then(r => console.log(JSON.stringify(r, null, 2)))
"
```
Expected: object with `posts` and `users` arrays (may be empty if DB has no data).

- [ ] **Step 3: Rewrite explore/page.tsx**

Replace `src/app/explore/page.tsx` entirely:

```typescript
import { FeedList } from '@/features/feed/components/FeedList'
import { createClient } from '@/lib/supabase/server'
import { searchContent } from '@/features/search/actions/search.actions'
import Link from 'next/link'

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { q: rawQ } = await searchParams
  const q = typeof rawQ === 'string' ? rawQ.trim() : ''

  const { posts: searchPosts, users: searchUsers } = q
    ? await searchContent(q)
    : { posts: [], users: [] }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">Khám phá</h1>

      {/* Search form — GET, no JS required */}
      <form action="/explore" method="GET">
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm bài viết, người dùng..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg"
          >
            Tìm
          </button>
        </div>
      </form>

      {q ? (
        <div className="space-y-6">
          {/* Users section */}
          {searchUsers.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">Người dùng</h2>
              <div className="space-y-2">
                {searchUsers.map(u => (
                  <Link
                    key={u.id}
                    href={`/u/${u.username ?? u.id}`}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                        {u.display_name?.[0] ?? '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{u.display_name}</p>
                      {u.username && <p className="text-xs text-gray-400">@{u.username}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Posts section */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Bài viết {searchPosts.length > 0 ? `(${searchPosts.length})` : ''}
            </h2>
            {searchPosts.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Không tìm thấy kết quả.</p>
            ) : (
              <div className="space-y-3">
                {searchPosts.map(p => (
                  <div key={p.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{p.profiles.display_name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-3">{p.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Default: show public feed */
        <FeedList userId={user?.id} />
      )}
    </main>
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Manual smoke test**

```
npm run dev
```
Visit `http://localhost:3000/explore` — search box visible, FeedList shown.
Visit `http://localhost:3000/explore?q=test` — shows "Không tìm thấy kết quả" (unless data exists).

- [ ] **Step 6: Commit**

```bash
git add src/features/search/actions/search.actions.ts src/app/explore/page.tsx
git commit -m "feat(search): full-text search in /explore — posts + users (T-P4-02)"
```

---

### Task 3: Real-time new-posts banner in feed

**Files:**
- Create: `src/features/feed/components/NewPostsBanner.tsx`
- Modify: `src/app/feed/page.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/client` (browser client).
- Produces: `<NewPostsBanner userId={string} followingIds={string[]} />` — shown above `FeedList` in feed page.

**Pattern to follow exactly:** `src/features/notifications/components/NotificationBadge.tsx` — same `useEffect` + channel subscribe + cleanup structure.

- [ ] **Step 1: Create NewPostsBanner**

Create `src/features/feed/components/NewPostsBanner.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function NewPostsBanner({
  followingIds,
}: {
  followingIds: string[]
}) {
  const [newCount, setNewCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('feed-new-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const postUserId = (payload.new as { user_id?: string }).user_id
          if (postUserId && followingIds.includes(postUserId)) {
            setNewCount(c => c + 1)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [followingIds])

  if (newCount === 0) return null

  return (
    <button
      onClick={() => {
        router.refresh()
        setNewCount(0)
      }}
      className="w-full py-2 px-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium hover:bg-blue-100 transition-colors"
    >
      🔄 {newCount} bài viết mới — Nhấn để tải
    </button>
  )
}
```

- [ ] **Step 2: Modify feed/page.tsx to pass followingIds**

Replace `src/app/feed/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PostComposer } from '@/features/feed/components/PostComposer'
import { FeedList } from '@/features/feed/components/FeedList'
import { WelcomeBanner } from '@/features/feed/components/WelcomeBanner'
import { NewPostsBanner } from '@/features/feed/components/NewPostsBanner'

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { welcome } = await searchParams

  // Fetch followingIds so NewPostsBanner can filter incoming posts
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)
  const followingIds = [user.id, ...(following?.map(f => f.following_id) ?? [])]

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {welcome === '1' && <WelcomeBanner />}
      <PostComposer userId={user.id} />
      <NewPostsBanner followingIds={followingIds} />
      <FeedList userId={user.id} followingOnly />
    </main>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Manual smoke test**

Open two browser tabs to `http://localhost:3000/feed`.
In tab 1, create a new post.
Expected in tab 2: blue banner "🔄 1 bài viết mới — Nhấn để tải" appears without page reload.
Click the banner → feed refreshes, banner disappears.

- [ ] **Step 5: Commit**

```bash
git add src/features/feed/components/NewPostsBanner.tsx src/app/feed/page.tsx
git commit -m "feat(realtime): new-posts banner in feed with router.refresh() (T-P4-03)"
```

---

### Task 4: Real-time wallet balance

**Files:**
- Modify: `src/features/wallet/actions/wallet.actions.ts`
- Create: `src/features/wallet/components/RealtimeBalance.tsx`
- Modify: `src/app/wallet/page.tsx`

**Interfaces:**
- Consumes: `BalanceCard` from `@/features/wallet/components/BalanceCard` (unchanged).
- Produces:
  - `getBalance(): Promise<number>` (server action, new export on wallet.actions.ts)
  - `<RealtimeBalance userId={string} initialBalance={number} streak={number} />` (replaces `<BalanceCard>` in wallet/page.tsx)

- [ ] **Step 1: Add getBalance to wallet.actions.ts**

Append to `src/features/wallet/actions/wallet.actions.ts`:

```typescript
export async function getBalance(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { data } = await supabase
    .from('profiles')
    .select('points_balance')
    .eq('id', user.id)
    .single()
  return data?.points_balance ?? 0
}
```

- [ ] **Step 2: Create RealtimeBalance component**

Create `src/features/wallet/components/RealtimeBalance.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BalanceCard } from './BalanceCard'
import { getBalance } from '../actions/wallet.actions'

export function RealtimeBalance({
  userId,
  initialBalance,
  streak,
}: {
  userId: string
  initialBalance: number
  streak: number
}) {
  const [balance, setBalance] = useState(initialBalance)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('wallet-balance')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'points_ledger',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          const fresh = await getBalance()
          setBalance(fresh)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return <BalanceCard balance={balance} streak={streak} />
}
```

- [ ] **Step 3: Update wallet/page.tsx to use RealtimeBalance**

Replace the `BalanceCard` import line and usage in `src/app/wallet/page.tsx`:

Remove:
```typescript
import { BalanceCard } from '@/features/wallet/components/BalanceCard'
```
Add:
```typescript
import { RealtimeBalance } from '@/features/wallet/components/RealtimeBalance'
```

Replace:
```typescript
<BalanceCard balance={profile?.points_balance ?? 0} streak={profile?.streak_count ?? 0} />
```
With:
```typescript
<RealtimeBalance
  userId={user.id}
  initialBalance={profile?.points_balance ?? 0}
  streak={profile?.streak_count ?? 0}
/>
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5: Manual smoke test**

Open `http://localhost:3000/wallet`. Note the current balance.
In another tab, do something that awards points (e.g., post a new post).
Expected: balance on `/wallet` updates automatically without page reload.

- [ ] **Step 6: Commit**

```bash
git add src/features/wallet/actions/wallet.actions.ts \
        src/features/wallet/components/RealtimeBalance.tsx \
        src/app/wallet/page.tsx
git commit -m "feat(realtime): live wallet balance via points_ledger subscription (T-P4-04)"
```

---

### Task 5: Month picker for /finance

**Files:**
- Create: `src/features/finance/components/MonthPicker.tsx`
- Modify: `src/app/finance/page.tsx`

**Interfaces:**
- Consumes: `listTransactions(month: string)` already accepts `'YYYY-MM'` format — no changes to the action.
- Produces: `<MonthPicker month={string} />` — renders prev/next buttons that push to URL.

- [ ] **Step 1: Create MonthPicker**

Create `src/features/finance/components/MonthPicker.tsx`:

```typescript
'use client'
import { useRouter } from 'next/navigation'

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (m === 12) return `${y + 1}-01`
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter()
  const [y, m] = month.split('-')
  const isCurrentMonth = month === currentMonth()

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => router.push(`/finance?month=${prevMonth(month)}`)}
        className="px-2 py-1 border rounded hover:bg-gray-50 text-sm"
        aria-label="Tháng trước"
      >
        ←
      </button>
      <span className="font-semibold text-sm min-w-[7rem] text-center">
        Tháng {m}/{y}
      </span>
      <button
        onClick={() => router.push(`/finance?month=${nextMonth(month)}`)}
        disabled={isCurrentMonth}
        className="px-2 py-1 border rounded hover:bg-gray-50 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Tháng sau"
      >
        →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Update finance/page.tsx to read searchParams.month**

Replace `src/app/finance/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listTransactions } from '@/features/finance/transaction.actions'
import { MonthPicker } from '@/features/finance/components/MonthPicker'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function isValidMonth(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { month: rawMonth } = await searchParams
  const month =
    typeof rawMonth === 'string' && isValidMonth(rawMonth)
      ? rawMonth
      : currentMonth()

  const { transactions, totalIncome, totalExpense } = await listTransactions(month)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <MonthPicker month={month} />
        <Link href="/finance/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
          + Thêm giao dịch
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-xl p-4">
          <p className="text-sm text-gray-500">Thu nhập</p>
          <p className="text-lg font-bold text-green-600">+{totalIncome.toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-sm text-gray-500">Chi tiêu</p>
          <p className="text-lg font-bold text-red-600">-{totalExpense.toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      <div className="space-y-2">
        {transactions.length === 0 && (
          <p className="text-center text-gray-400 py-8">Chưa có giao dịch nào tháng này.</p>
        )}
        {transactions.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <span className="mr-2">{t.categories?.icon ?? '📦'}</span>
              <span className="text-sm">{t.categories?.name ?? 'Không phân loại'}</span>
              {t.note && <p className="text-xs text-gray-400 ml-6">{t.note}</p>}
            </div>
            <span className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {t.type === 'income' ? '+' : '-'}{t.amount_vnd.toLocaleString('vi-VN')}đ
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4: Manual smoke test**

```
npm run dev
```
Visit `http://localhost:3000/finance` — shows current month with ← → buttons.
Click ← — URL becomes `/finance?month=2026-08`, transactions for August shown.
Click → — URL returns to `/finance?month=2026-09`.
→ button disabled when on current month.
Invalid URL `/finance?month=bad` → falls back to current month.

- [ ] **Step 5: Commit**

```bash
git add src/features/finance/components/MonthPicker.tsx src/app/finance/page.tsx
git commit -m "feat(finance): month picker via URL searchParams with prev/next navigation (T-P4-05)"
```
