# Phase 6 / Feature 5 — Premium Export + E2E + PR

> Ref: `docs/superpowers/specs/2026-09-06-phase6-features-design.md` §Feature 5  
> Depends on: Migration 23 applied (Feature 4 complete)  
> Branch: `feat/phase6-features`

**Goal:** User Premium xuất báo cáo thu chi dạng CSV hoặc PDF từ `/finance/trends`. Free user thấy nút nhưng được redirect upgrade.

---

## Preconditions

- Migration 23 đã apply
- `listTransactions(month)` action tồn tại trong `transaction.actions.ts`
- `getSubscriptionStatus()` action tồn tại trong `billing/subscription.actions`
- `/finance/trends` page đã có TrendChart

---

## Task 9: Premium Export (CSV + PDF)

**Files:**
- Create: `src/features/finance/export.actions.ts`
- Create: `src/features/finance/components/FinanceReportPdf.tsx`
- Create: `src/features/finance/__tests__/export.test.ts`
- Create: `src/app/finance/export/route.ts`
- Modify: `src/app/finance/trends/page.tsx`

- [ ] **Step 1: Cài PDF library**

```bash
npm install @react-pdf/renderer
```

- [ ] **Step 2: Viết failing test**

Tạo `src/features/finance/__tests__/export.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildCsvString } from '@/features/finance/export.actions'

describe('buildCsvString', () => {
  it('produces correct CSV headers', () => {
    const csv = buildCsvString([])
    expect(csv).toBe('Ngày,Loại,Danh mục,Số tiền (VND),Ghi chú\n')
  })

  it('produces correct rows', () => {
    const tx = [{
      occurred_at: '2026-09-01',
      type: 'expense' as const,
      categories: { name: 'Ăn uống', icon: '🍜', type: 'expense' },
      amount_vnd: 50000,
      note: 'Phở',
    }]
    const csv = buildCsvString(tx as Parameters<typeof buildCsvString>[0])
    expect(csv).toContain('2026-09-01,expense,Ăn uống,50000,Phở')
  })

  it('escapes commas in note', () => {
    const tx = [{
      occurred_at: '2026-09-01',
      type: 'income' as const,
      categories: null,
      amount_vnd: 1000000,
      note: 'Lương, thưởng',
    }]
    const csv = buildCsvString(tx as Parameters<typeof buildCsvString>[0])
    expect(csv).toContain('"Lương, thưởng"')
  })
})
```

- [ ] **Step 3: Chạy test — verify FAIL**

```bash
npx vitest run src/features/finance/__tests__/export.test.ts
```

- [ ] **Step 4: Tạo export actions**

Tạo `src/features/finance/export.actions.ts`:

```typescript
// Không có 'use server' — buildCsvString là pure helper export cho testing
import { listTransactions } from '@/features/finance/transaction.actions'

type Tx = Awaited<ReturnType<typeof listTransactions>>['transactions'][number]

function escapeCell(val: string | null | undefined): string {
  const s = val ?? ''
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsvString(transactions: Tx[]): string {
  const header = 'Ngày,Loại,Danh mục,Số tiền (VND),Ghi chú\n'
  const rows = transactions.map(tx => [
    tx.occurred_at,
    tx.type,
    tx.categories?.name ?? '',
    tx.amount_vnd,
    escapeCell(tx.note),
  ].join(','))
  return header + rows.join('\n') + (rows.length > 0 ? '\n' : '')
}
```

- [ ] **Step 5: Chạy test — verify PASS**

```bash
npx vitest run src/features/finance/__tests__/export.test.ts
```

- [ ] **Step 6: Tạo PDF component**

Tạo `src/features/finance/components/FinanceReportPdf.tsx`:

```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { listTransactions } from '@/features/finance/transaction.actions'

type Props = {
  transactions: Awaited<ReturnType<typeof listTransactions>>['transactions']
  totalIncome: number
  totalExpense: number
  month: string
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#e5e7eb', paddingVertical: 4 },
  cell: { flex: 1 },
  header: { fontWeight: 'bold', backgroundColor: '#f3f4f6', paddingVertical: 6 },
  summary: { marginTop: 16, padding: 12, backgroundColor: '#f9fafb' },
})

export function FinanceReportPdf({ transactions, totalIncome, totalExpense, month }: Props) {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫'

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>Báo cáo thu chi — {month}</Text>

        <View style={[s.row, s.header]}>
          <Text style={s.cell}>Ngày</Text>
          <Text style={s.cell}>Loại</Text>
          <Text style={s.cell}>Danh mục</Text>
          <Text style={{ ...s.cell, textAlign: 'right' }}>Số tiền</Text>
        </View>

        {transactions.map(tx => (
          <View key={tx.id} style={s.row}>
            <Text style={s.cell}>{tx.occurred_at}</Text>
            <Text style={s.cell}>{tx.type === 'income' ? 'Thu' : 'Chi'}</Text>
            <Text style={s.cell}>{tx.categories?.name ?? '—'}</Text>
            <Text style={{ ...s.cell, textAlign: 'right' }}>{fmt(tx.amount_vnd)}</Text>
          </View>
        ))}

        <View style={s.summary}>
          <Text>Tổng thu: {fmt(totalIncome)}</Text>
          <Text>Tổng chi: {fmt(totalExpense)}</Text>
          <Text>Tiết kiệm: {fmt(totalIncome - totalExpense)}</Text>
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 7: Tạo export route handler**

Tạo `src/app/finance/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { listTransactions } from '@/features/finance/transaction.actions'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'
import { buildCsvString } from '@/features/finance/export.actions'
import { renderToBuffer } from '@react-pdf/renderer'
import { FinanceReportPdf } from '@/features/finance/components/FinanceReportPdf'

export async function GET(req: NextRequest) {
  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    return NextResponse.json({ error: 'premium_required' }, { status: 403 })
  }

  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const format = req.nextUrl.searchParams.get('format') ?? 'csv'
  const { transactions, totalIncome, totalExpense } = await listTransactions(month)

  if (format === 'pdf') {
    const buffer = await renderToBuffer(
      FinanceReportPdf({ transactions, totalIncome, totalExpense, month })
    )
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bao-cao-${month}.pdf"`,
      },
    })
  }

  const csv = buildCsvString(transactions)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bao-cao-${month}.csv"`,
    },
  })
}
```

- [ ] **Step 8: Thêm export buttons vào trends page**

Trong `src/app/finance/trends/page.tsx`, trong nhánh Premium-success, thêm sau TrendChart:

```tsx
<div className="flex gap-2">
  <a
    href={`/finance/export?format=csv&month=${new Date().toISOString().slice(0, 7)}`}
    className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
  >
    ↓ Xuất CSV
  </a>
  <a
    href={`/finance/export?format=pdf&month=${new Date().toISOString().slice(0, 7)}`}
    className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
  >
    ↓ Xuất PDF
  </a>
</div>
```

Free user không thấy buttons (nằm trong premium-gated block đã có).

- [ ] **Step 9: Migration 24 placeholder**

```bash
echo "-- Phase 6 export: no DB changes. Placeholder for migration numbering." \
  > sql/migrations/24-phase6-export.sql
```

Thêm vào `scripts/migrate.sh` sau migration 23:

```bash
run_sql "sql/migrations/24-phase6-export.sql"
```

```bash
./scripts/migrate.sh --docker
```

- [ ] **Step 10: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 11: Commit**

```bash
git add src/features/finance/export.actions.ts \
        src/features/finance/__tests__/export.test.ts \
        src/features/finance/components/FinanceReportPdf.tsx \
        src/app/finance/export/route.ts \
        src/app/finance/trends/page.tsx \
        sql/migrations/24-phase6-export.sql \
        scripts/migrate.sh \
        package.json package-lock.json
git commit -m "feat(finance): Premium export — CSV route + PDF (@react-pdf/renderer)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: E2E Tests

**Files:**
- Create: `tests/e2e/gift.spec.ts`
- Create: `tests/e2e/hashtag.spec.ts`

- [ ] **Step 1: Tạo gift E2E test**

Tạo `tests/e2e/gift.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const senderEmail = `e2e+gift+sender+${Date.now()}@example.com`
const receiverEmail = `e2e+gift+receiver+${Date.now()}@example.com`

test.describe('gift points flow', () => {
  test('sender gifts points → recipient balance increases', async ({ browser }) => {
    const senderCtx = await browser.newContext()
    const receiverCtx = await browser.newContext()
    const senderPage = await senderCtx.newPage()
    const receiverPage = await receiverCtx.newPage()

    await loginAs(senderPage, senderEmail)
    await loginAs(receiverPage, receiverEmail)

    await receiverPage.goto('/profile')
    const username = await receiverPage.locator('[data-testid="username"]').textContent()
    expect(username).toBeTruthy()

    await receiverPage.goto('/wallet')
    const balanceBefore = await receiverPage.locator('[data-testid="balance"]').textContent()

    await senderPage.goto(`/u/${username}`)
    await senderPage.getByText('Tặng điểm').click()
    await senderPage.locator('input[type="number"]').fill('10')
    await senderPage.getByText('Tặng').click()

    await expect(senderPage.getByText('Tặng điểm')).toBeVisible({ timeout: 5000 })

    await receiverPage.reload()
    const balanceAfter = await receiverPage.locator('[data-testid="balance"]').textContent()
    expect(balanceAfter).not.toBe(balanceBefore)

    await senderCtx.close()
    await receiverCtx.close()
  })
})
```

- [ ] **Step 2: Tạo hashtag E2E test**

Tạo `tests/e2e/hashtag.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const email = `e2e+hashtag+${Date.now()}@example.com`
const tag = `e2etest${Date.now()}`

test.describe('hashtag flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, email)
  })

  test('post with hashtag → tag link → explore page shows post', async ({ page }) => {
    await page.goto('/feed')
    await page.locator('[data-testid="post-composer"]').click()
    await page.locator('textarea').fill(`Testing hashtags #${tag}`)
    await page.getByText('Đăng').click()

    await expect(page.locator(`a[href="/explore/tag/${tag}"]`)).toBeVisible({ timeout: 5000 })

    await page.click(`a[href="/explore/tag/${tag}"]`)
    await page.waitForURL(`/explore/tag/${tag}`)

    await expect(page.locator(`text=#${tag}`).first()).toBeVisible()
    await expect(page.locator(`text=Testing hashtags`)).toBeVisible()
  })
})
```

- [ ] **Step 3: Chạy toàn bộ unit tests**

```bash
npx vitest run
```

Expected: tất cả pass (bao gồm 4 new gift + 3 shared-savings + 5 recurring + 3 export tests).

- [ ] **Step 4: Chạy E2E (cần app đang chạy)**

```bash
./scripts/dev.sh --no-migrate &
npx playwright test tests/e2e/gift.spec.ts tests/e2e/hashtag.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/gift.spec.ts tests/e2e/hashtag.spec.ts
git commit -m "test(e2e): gift points flow + hashtag explore flow (2 new tests)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Final Polish + PR

- [ ] **Step 1: Full test suite**

```bash
npx vitest run && npx tsc --noEmit && npm run lint
```

- [ ] **Step 2: Manual smoke test**

Start app: `./scripts/dev.sh --no-migrate`

- [ ] Gift points: `/u/[user]` → tặng 10pts → `/wallet` balance tăng
- [ ] Gift self-block: xem profile chính mình → không thấy nút tặng
- [ ] Daily limit: tặng 200pts → lần tặng tiếp hiện lỗi còn X pts
- [ ] Shared savings: tạo goal → mời friend → đóng góp → `current_amount` tăng
- [ ] Hashtag: đăng `#smoke_test` → tag link hiện → explore page có bài
- [ ] Tag max 10: đăng bài 11 tags → chỉ 10 tag lưu
- [ ] Recurring: tạo monthly expense start hôm nay → hiện trong list → toggle hoạt động
- [ ] Export CSV (Premium): `/finance/trends` → "Xuất CSV" → file download
- [ ] Export PDF (Premium): → "Xuất PDF" → PDF download
- [ ] Export gate: Free user GET `/finance/export?format=csv&month=2026-09` → 403

- [ ] **Step 3: Cập nhật EVALUATION.md**

Thêm Phase 6 section:

```markdown
### Phase 6 — Feature Connections ✅

| Tính năng | Trạng thái | Ghi chú |
|---|---|---|
| Gift Points | ✅ Done | `gift_points()` RPC + daily limit 200pts (migration 20) |
| Shared Savings Goals | ✅ Done | 3 tables + `is_goal_member()` + extended trigger (migration 21) |
| Hashtags | ✅ Done | `posts.tags` + GIN index + `/explore/tag/[tag]` (migration 22) |
| Recurring Transactions | ✅ Done | `recurring_transactions` + pg_cron daily 01:00 UTC (migration 23) |
| Premium Export | ✅ Done | CSV + PDF (`@react-pdf/renderer`) |
| Unit tests | ✅ Done | ~44 Vitest tests (thêm 15 mới) |
| E2E tests | ✅ Done | ~12 Playwright tests (thêm 2 mới: gift + hashtag) |
```

- [ ] **Step 4: Final commit + PR**

```bash
git add docs/EVALUATION.md
git commit -m "docs: Phase 6 complete — 5 features, migrations 20-24, 12 E2E tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push origin feat/phase6-features

gh pr create \
  --title "feat: Phase 6 — Cross-module feature connections (Gift, SharedSavings, Hashtags, Recurring, Export)" \
  --body "$(cat <<'EOF'
## Features

- **Gift Points**: `gift_points()` RPC, 200pt/day limit, modal trên profile page
- **Shared Savings Goals**: 3 tables, `is_goal_member()` SECURITY DEFINER, trigger chia điểm khi đạt
- **Hashtags**: `posts.tags[]` auto-extract, GIN index, `/explore/tag/[tag]` route
- **Recurring Transactions**: `recurring_transactions` table, pg_cron daily 01:00 UTC, công thức tháng chống drift
- **Premium Export**: CSV (native Response) + PDF (`@react-pdf/renderer`), gated bởi `getSubscriptionStatus()`

## Migrations

20 → 21 → 22 → 23 → 24 (placeholder)

## Tests

~44 Vitest unit + ~12 Playwright E2E

## Smoke test

Tất cả 10 cases trong Task 11 Step 2 đã pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Done when

- [ ] `npx vitest run` — ~44 tests pass
- [ ] `npx tsc --noEmit` — không lỗi
- [ ] `npm run lint` — không lỗi
- [ ] 10 smoke test cases pass thủ công
- [ ] PR tạo xong trên GitHub
