# Phase 4 Design — Realtime, Search, Month Picker

**Date:** 2026-09-04  
**Branch:** main  
**Depends on:** Phase 3 complete (commit `a193fc6`+)

---

## 0. Trạng thái codebase hiện tại

| Điểm cần biết | Kết quả |
|---|---|
| Supabase Realtime pattern | ✅ `NotificationBadge` dùng `postgres_changes` — đây là pattern chuẩn để copy |
| Feed pagination | Cursor-based qua `created_at`, `LoadMoreFeed` client component |
| `/explore` page | Server Component, hiện chỉ render `FeedList` — chưa có search |
| `listTransactions(month)` | Đã nhận tham số `month: string` — chỉ cần wire URL param |
| `BalanceCard` | Static server component, nhận `balance` + `streak` props |
| GIN indexes | Chưa có — cần migration |

---

## 1. Nguyên tắc bất biến (kế thừa Phase 1-3)

1. **Realtime subscribe chỉ ở client component** — Server Components không giữ WebSocket.
2. **Không inject post vào list client-side** — phá cursor pagination; chỉ hiện banner → `router.refresh()`.
3. **Search không expose hidden/deleted posts** — filter `hidden = false AND deleted_at IS NULL` trong action.
4. **`searchParams` là public state** — không đặt thông tin nhạy cảm vào URL.
5. **GIN index dùng `simple` dictionary** — phù hợp tiếng Việt không dấu (không dùng `english` stemmer).

---

## 2. Database migration

### Migration 15 — `sql/migrations/15-search-indexes.sql`

```sql
-- GIN index cho full-text search posts
CREATE INDEX IF NOT EXISTS posts_search_idx
  ON public.posts
  USING GIN (to_tsvector('simple', coalesce(content, '')));

-- GIN index cho full-text search profiles
CREATE INDEX IF NOT EXISTS profiles_search_idx
  ON public.profiles
  USING GIN (
    to_tsvector('simple',
      coalesce(display_name, '') || ' ' || coalesce(username, ''))
  );
```

Không dùng stored `tsvector` column — YAGNI ở quy mô hiện tại. Query vẫn fast nhờ functional index.

---

## 3. Server Actions

### `src/features/search/actions/search.actions.ts`

```typescript
'use server'
// searchContent(query) → { posts, users }
// posts: id, content, created_at, profiles(display_name, avatar_url)
//        filter: hidden=false, deleted_at IS NULL
//        sort: created_at desc, limit 20
// users: id, display_name, username, avatar_url
//        limit 10
// Empty/whitespace query → return { posts: [], users: [] } immediately
// Uses websearch_to_tsquery('simple', query) — handles quotes, minus, OR naturally
```

### `src/features/wallet/actions/wallet.actions.ts` (sửa)

Thêm export:
```typescript
export async function getBalance(): Promise<number>
// Lấy points_balance từ profiles của user hiện tại
// Dùng bởi RealtimeBalance sau khi nhận event
```

---

## 4. Components mới

### `src/features/feed/components/NewPostsBanner.tsx`

```
'use client'
Props: { userId: string; followingIds: string[] }
State: { newCount: number }

useEffect:
  supabase.channel('feed-new-posts')
    .on('postgres_changes', { event: 'INSERT', table: 'posts' }, payload => {
      // Chỉ count nếu user_id ∈ followingIds (hoặc bất kỳ nếu !followingOnly)
      if (followingIds.includes(payload.new.user_id)) setNewCount(c => c + 1)
    })
    .subscribe()
  return () => supabase.removeChannel(channel)

Render:
  newCount > 0 → button "🔄 {newCount} bài mới" → onClick: router.refresh() + setNewCount(0)
  newCount === 0 → null (không render gì)
```

### `src/features/wallet/components/RealtimeBalance.tsx`

```
'use client'
Props: { userId: string; initialBalance: number; streak: number }
State: { balance: number }

useEffect:
  supabase.channel('wallet-balance')
    .on('postgres_changes',
        { event: 'INSERT', table: 'points_ledger', filter: `user_id=eq.${userId}` },
        async () => {
          const fresh = await getBalance()
          setBalance(fresh)
        })
    .subscribe()

Render: <BalanceCard balance={balance} streak={streak} />
```

### `src/features/finance/components/MonthPicker.tsx`

```
'use client'
Props: { month: string }   // format 'YYYY-MM'

Render:
  ← button: router.push('/finance?month=' + prevMonth(month))
  <span>Tháng {MM}/{YYYY}</span>
  → button: router.push('/finance?month=' + nextMonth(month))
           disabled khi month === currentMonth

Helper: prevMonth/nextMonth tính bằng Date arithmetic
```

---

## 5. Routes sửa đổi

### `src/app/feed/page.tsx`

```typescript
// Thêm: lấy followingIds từ DB (đã query profiles anyway)
// Wrap FeedList với NewPostsBanner phía trên
// NewPostsBanner nhận userId + followingIds
```

### `src/app/explore/page.tsx`

```typescript
// Nhận searchParams: { q?: string }
// q có giá trị → gọi searchContent(q) → render SearchResults (posts + users sections)
// q không có → render FeedList (hành vi hiện tại)
// Search form: <form> với input name="q", action="/explore" (GET form, không cần JS)
```

### `src/app/wallet/page.tsx`

```typescript
// Thay <BalanceCard balance={...} streak={...} />
// bằng <RealtimeBalance userId={user.id} initialBalance={...} streak={...} />
```

### `src/app/finance/page.tsx`

```typescript
// Nhận searchParams: { month?: string }
// month = searchParams.month ?? currentMonth()
// Validate format YYYY-MM, fallback to currentMonth() nếu invalid
// Render <MonthPicker month={month} /> phía trên danh sách giao dịch
```

---

## 6. Thứ tự triển khai

| Task | Mô tả | Files |
|------|-------|-------|
| T-P4-01 | Migration 15 + migrate.sh | `sql/migrations/15-search-indexes.sql`, `scripts/migrate.sh` |
| T-P4-02 | Search action + /explore UI | `search.actions.ts`, `explore/page.tsx` |
| T-P4-03 | Real-time feed banner | `NewPostsBanner.tsx`, `feed/page.tsx` |
| T-P4-04 | Real-time wallet balance | `RealtimeBalance.tsx`, `wallet/page.tsx`, `wallet.actions.ts` |
| T-P4-05 | Month picker /finance | `MonthPicker.tsx`, `finance/page.tsx` |

T-P4-01 không phụ thuộc gì; T-P4-02 phụ thuộc T-P4-01 (cần index); T-P4-03/04/05 độc lập với nhau.

---

## 7. Global Constraints

- **Next.js 16** (App Router) — `searchParams` trong Server Component là `Promise<{}>` — phải `await searchParams` trước khi đọc.
- **Supabase Realtime** — `postgres_changes` yêu cầu bảng có `REPLICA IDENTITY FULL` hoặc default (PRIMARY KEY). `posts` và `points_ledger` đều có PK — ok.
- **`websearch_to_tsquery`** — có sẵn từ PostgreSQL 11+; xử lý gracefully query rỗng/invalid (không throw, trả empty).
- **TypeScript strict** — `searchParams.q` có thể là `string | string[] | undefined`; phải coerce sang `string` trước khi dùng.
- **YAGNI** — không thêm debounce search client-side (GET form đã đủ); không thêm highlight; không thêm pagination cho search results (limit 20 posts + 10 users).
- **Ponytail** — shortest working diff; không tạo abstraction mới trừ khi cần.
