# Money App UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all 30 routes of Money App under the “Polymer Ledger” system: polymer banknote as material, modern e-wallet as interaction model.

**Architecture:** Phase 0 builds semantic tokens, primitives, and pattern components. Phase 1 rebuilds the shell and public/auth/system pages. Phases 2–7 restyle each feature area using the shared kit. Phase 8 runs the visual, accessibility, and E2E gate. No backend, auth, payment, or data-model changes; only read-only query additions where the spec allows them.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 (`@theme inline`), Radix primitives, Be Vietnam Pro, `lucide-react`, Vitest + `react-dom/server`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-ui-redesign-design.md`

## Global Constraints

- **No backend changes:** no schema, RPC, auth, payment, or mutation changes. Read-only query/param additions are allowed (notification count, month filter, admin search, follower counts).
- **No new create/edit UI** for budgets, savings goals, notes, or todos. Restyle them read-only.
- **No manual dark toggle:** dark mode follows `prefers-color-scheme`; all components use semantic tokens.
- **No new display font:** Be Vietnam Pro + system mono only.
- **One new dependency:** `lucide-react` (icons). If rejected, build `src/components/ui/icon.tsx` with the same names.
- **No `zinc` / `amber` / `yellow` / `neutral`** in new code. No `bg-white` cards in dark mode.
- **Radius:** `sm 8`, `md 12`, `lg 16`, `xl 20`, `2xl 28`, `full`. **Containers:** `640 / 960 / 1200`. **Page padding:** 16/24/32.
- **Mobile-first:** 360px minimum; test 360/768/1280.
- **Accessibility:** WCAG AA, visible focus ring, 44px touch targets, no color-only status, `prefers-reduced-motion` respected.
- **Copy:** points = “điểm”, currency = “đ”; sentence case; no UI emoji (category icons are mapped to Lucide).
- **Preserve E2E selectors:** `data-testid="balance"`, `referral-code`, `referral-total`, `input[placeholder="000000"]`, `button:has-text("50.000")`, `"Thanh toán qua VNPay"`, `"Thanh toán (Mock)"`, `"Mua bằng"`, `a[href^="/shop/"]`.
- **Commit after every task.**

## Review Focus

1. **Long Vietnamese text and large amounts at 360px** — a 30-char category name and `1.000.000.000đ` must not overflow or clip; `Amount` must format them, cards must wrap.
2. **Empty/missing data** — no avatar, bio, username, posts, transactions, rewards, products, or notifications must produce an `EmptyState`, never a blank region.
3. **Dark-mode contrast** — lotus/coin/muted text on dark paper must stay AA; no `bg-white` surfaces.
4. **Keyboard and focus** — dialogs/sheets trap focus, Escape closes, bottom nav and forms show a visible ring.
5. **Loading/error/reduced-motion** — skeletons prevent layout shift; `error.tsx` offers a way out; coin flip/shimmer are disabled under `prefers-reduced-motion`.

---

## Phase 0 — Foundation

### Task 1: Semantic tokens and base layer

**Files:**
- Modify: `src/app/globals.css`
- Test: `tests/unit/design/tokens.test.ts`

**Interfaces:**
- Produces CSS variables used by every later task: `--color-background`, `--color-foreground`, `--color-card`, `--color-card-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-border`, `--color-input`, `--color-ring`, `--color-primary`, `--color-primary-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-accent`, `--color-accent-foreground`, `--color-destructive`, `--color-destructive-foreground`, `--color-coin`, `--color-coin-deep`, `--color-lotus`, `--color-leaf`, `--color-paper`, `--color-paper-deep`, `--color-ink`, `--color-security-1/2/3`, `--radius-sm/md/lg/xl/2xl`, `--shadow-sheet`, `--container-narrow/default/wide`, `--font-mono`, `--text-display/h1/h2/h3/body/sm/xs/micro`.

- [ ] **Step 1: Write the failing token test**

```ts
// tests/unit/design/tokens.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/app/globals.css', 'utf8')

describe('design tokens', () => {
  it('defines the semantic color, radius, container and shadow tokens', () => {
    for (const token of [
      '--color-primary', '--color-primary-foreground', '--color-card',
      '--color-muted-foreground', '--color-border', '--color-ring',
      '--color-coin', '--color-lotus', '--color-leaf',
      '--radius-sm', '--radius-lg', '--radius-2xl',
      '--shadow-sheet', '--container-narrow', '--container-wide', '--font-mono',
      '--text-display', '--text-h1', '--text-body', '--text-micro',
    ]) {
      expect(css).toContain(token)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/design/tokens.test.ts`
Expected: FAIL — missing token `--color-primary`.

- [ ] **Step 3: Implement the tokens and base layer in `src/app/globals.css`**

Add the light/dark token values from spec §5.2, the type scale from §5.3 (`--text-display: 3rem`, `--text-h1: 2rem`, `--text-h2: 1.5rem`, `--text-h3: 1.125rem`, `--text-body: 0.9375rem`, `--text-sm: 0.8125rem`, `--text-xs: 0.75rem`, `--text-micro: 0.6875rem`), radius/container/shadow tokens, `--font-mono: ui-monospace, SFMono-Regular, Menlo, monospace`, and a base layer:

```css
@layer base {
  * { border-color: var(--color-border); }
  html { color-scheme: light dark; }
  body { background: var(--color-background); color: var(--color-foreground); }
  ::selection { background: var(--color-secondary); color: var(--color-secondary-foreground); }
  :focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px; }
  h1, h2, h3 { text-wrap: balance; }
  .tabular { font-variant-numeric: tabular-nums; }
}
```

Keep the existing `blue/green/red/gray` remaps during migration. Add `@media (prefers-color-scheme: dark)` overrides for the semantic tokens. Remove the global `font-feature-settings: "tnum" 1` from `body`; apply it via `.tabular` instead.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/design/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css tests/unit/design/tokens.test.ts
git commit -m "feat(design): add semantic tokens and base layer"
```

---

### Task 2: Icon system and CategoryIcon

**Files:**
- Modify: `package.json`, `package-lock.json`, `vitest.config.ts`, `src/components/ui/index.ts`
- Create: `src/components/ui/category-icon.tsx`, `tests/unit/components/category-icon.test.tsx`

**Interfaces:**
- Produces `CategoryIcon({ icon, className }: { icon: string | null; className?: string })`.
- Mapping: `🍜→Utensils`, `🚗→Car`, `🧾→Receipt`, `🎮→Gamepad2`, `💰→Banknote`, `📦→Package`, `🏠→House`, `💊→Pill`, `🎓→GraduationCap`, `✈️→Plane`, `🎁→Gift`, `📚→BookOpen`; unknown → `Tag`.
- Renders `data-icon="utensils"` etc. and `aria-hidden`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/category-icon.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CategoryIcon } from '@/components/ui/category-icon'

describe('CategoryIcon', () => {
  it('maps a known category emoji to a lucide icon', () => {
    expect(renderToStaticMarkup(<CategoryIcon icon="🍜" />)).toContain('data-icon="utensils"')
  })
  it('falls back to Tag for unknown or null values', () => {
    expect(renderToStaticMarkup(<CategoryIcon icon="🛸" />)).toContain('data-icon="tag"')
    expect(renderToStaticMarkup(<CategoryIcon icon={null} />)).toContain('data-icon="tag"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/category-icon.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Install `lucide-react`, update Vitest, implement `CategoryIcon`**

Run: `npm install lucide-react`.
Update `vitest.config.ts` include to `['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx', 'src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.tsx']`.
Implement `CategoryIcon` with a `Record<string, LucideIcon>` map; render `<Icon data-icon={name} aria-hidden className={className} />`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/category-icon.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/components/ui/category-icon.tsx src/components/ui/index.ts tests/unit/components/category-icon.test.tsx
git commit -m "feat(design): add lucide icons and CategoryIcon"
```

---

### Task 3: Form primitives

**Files:**
- Modify: `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/index.ts`
- Create: `src/components/ui/textarea.tsx`, `src/components/ui/select.tsx`, `src/components/ui/label.tsx`, `src/components/ui/field.tsx`, `tests/unit/components/form.test.tsx`

**Interfaces:**
- `Button` variants `default | secondary | outline | ghost | coin | destructive | link`; sizes `sm | md | lg | icon`; props `loading?`, `fullWidth?`, `asChild?`. `default` is the leaf primary.
- `Input` adds `invalid?: boolean`, `size?: 'md' | 'lg'`; invalid sets `aria-invalid` and `border-destructive`.
- `Textarea` adds `invalid?`; `Select` is a styled native `<select>` with `invalid?`.
- `Label({ htmlFor, children, required? })`.
- `Field({ label, htmlFor, hint?, error?, required?, children })`; error renders `role="alert"`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/form.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button, Input, Field } from '@/components/ui'

describe('form primitives', () => {
  it('renders the default leaf button and the coin variant', () => {
    expect(renderToStaticMarkup(<Button>Nạp điểm</Button>)).toContain('bg-primary')
    expect(renderToStaticMarkup(<Button variant="coin">Đổi quà</Button>)).toContain('bg-coin')
  })
  it('marks a loading button busy and disabled', () => {
    const html = renderToStaticMarkup(<Button loading>Đang lưu</Button>)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('disabled')
  })
  it('marks an invalid input', () => {
    expect(renderToStaticMarkup(<Input invalid />)).toContain('aria-invalid="true"')
  })
  it('renders a field error as an alert', () => {
    expect(renderToStaticMarkup(<Field label="Email" error="Email không hợp lệ"><Input /></Field>))
      .toContain('role="alert"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/form.test.tsx`
Expected: FAIL — `bg-primary` missing / exports missing.

- [ ] **Step 3: Implement the primitives**

Use `cva` for `Button`; add a small spinner with `aria-hidden` when `loading`. Use `cn()` for all classes. Use semantic tokens only. Keep existing `Button` exports and default variant working.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/form.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui tests/unit/components/form.test.tsx
git commit -m "feat(design): add form primitives"
```

---

### Task 4: Surface primitives

**Files:**
- Create: `src/components/ui/card.tsx`, `src/components/ui/stat.tsx`, `src/components/ui/page-header.tsx`, `src/components/ui/section.tsx`, `src/components/ui/empty-state.tsx`, `tests/unit/components/surface.test.tsx`
- Modify: `src/components/ui/badge.tsx`, `src/components/ui/avatar.tsx`, `src/components/ui/index.ts`

**Interfaces:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`, `CardFooter`; `Card` `tone?: 'default' | 'paper' | 'coin' | 'lotus'`.
- `Badge` variants `neutral | leaf | lotus | coin | premium | outline`; `dot?`.
- `Avatar` `size?: 'sm' | 'md' | 'lg' | 'xl'`; `ring?`.
- `Stat({ label, value, delta?, tone?, icon? })`.
- `PageHeader({ title, description?, meta?, actions?, backHref? })`; title is an `<h1>`.
- `Section({ title?, action?, children })`.
- `EmptyState({ icon?, title, description?, action? })`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/surface.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Avatar, Badge, Card, EmptyState, PageHeader } from '@/components/ui'

describe('surface primitives', () => {
  it('renders card tones and badge variants', () => {
    expect(renderToStaticMarkup(<Card tone="paper">A</Card>)).toContain('bg-card')
    expect(renderToStaticMarkup(<Badge variant="lotus">Chi</Badge>)).toContain('bg-destructive')
  })
  it('renders avatar sizes', () => {
    expect(renderToStaticMarkup(<Avatar fallback="Minh Anh" size="xl" />)).toContain('h-20')
  })
  it('renders a page header and an empty state with an action', () => {
    const header = renderToStaticMarkup(<PageHeader title="Ví điểm" description="Số dư" actions={<button>Nạp</button>} />)
    expect(header).toContain('<h1')
    expect(header).toContain('Nạp')
    const empty = renderToStaticMarkup(<EmptyState title="Chưa có giao dịch" description="Nạp điểm để bắt đầu" action={<button>Nạp điểm</button>} />)
    expect(empty).toContain('Chưa có giao dịch')
    expect(empty).toContain('Nạp điểm')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/surface.test.tsx`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement the primitives**

`Card` uses `rounded-lg border border-border bg-card text-card-foreground`; no shadow. `Badge` uses semantic tones. `Avatar` maps sizes `sm h-8 w-8`, `md h-10 w-10`, `lg h-14 w-14`, `xl h-20 w-20`. `PageHeader` uses `flex flex-col gap-3 md:flex-row md:items-start md:justify-between`. `EmptyState` centers a `WatermarkCoin` (from Task 6; if not yet built, use a `Coins` icon) and one action.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/surface.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui tests/unit/components/surface.test.tsx
git commit -m "feat(design): add surface primitives"
```

---

### Task 5: Feedback and overlay primitives

**Files:**
- Modify: `src/components/ui/dialog.tsx`, `src/components/ui/toast.tsx`, `src/components/ui/index.ts`
- Create: `src/components/ui/sheet.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/segmented.tsx`, `src/components/ui/progress.tsx`, `src/components/ui/skeleton.tsx`, `src/components/ui/table.tsx`, `tests/unit/components/feedback.test.tsx`

**Interfaces:**
- `Dialog` adds `DialogDescription` and a close button; `DialogContent` is responsive and uses `bg-card`.
- `Sheet({ open, onOpenChange, side = 'bottom', title, description?, children })`; bottom sheet on mobile, right sheet on desktop.
- `Toast` variants `default | destructive | success`; viewport `top-center` on mobile, `bottom-right` on desktop.
- `Tabs({ items: { value: string; label: string; count?: number }[], value, onValueChange })`.
- `Segmented({ options: { value: string; label: string }[], value, onValueChange })`.
- `Progress({ value, max = 100, tone = 'leaf' })` with `role="progressbar"` and `aria-valuenow`.
- `Skeleton({ variant = 'text' })`.
- `Table`, `THead`, `TBody`, `TR`, `TH`, `TD` with semantic markup.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/feedback.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Progress, Segmented, Tabs } from '@/components/ui'

describe('feedback primitives', () => {
  it('renders tabs and the active segmented option', () => {
    expect(renderToStaticMarkup(<Tabs items={[{ value: 'all', label: 'Tất cả' }]} value="all" onValueChange={() => {}} />)).toContain('Tất cả')
    expect(renderToStaticMarkup(<Segmented options={[{ value: 'all', label: 'Tất cả' }]} value="all" onValueChange={() => {}} />)).toContain('aria-pressed="true"')
  })
  it('exposes progress semantics, tone and clamping', () => {
    const html = renderToStaticMarkup(<Progress value={62} />)
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuenow="62"')
    expect(renderToStaticMarkup(<Progress value={95} tone="lotus" />)).toContain('bg-destructive')
    expect(renderToStaticMarkup(<Progress value={150} />)).toContain('aria-valuenow="100"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/feedback.test.tsx`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement the primitives**

Use Radix `Dialog` and `Toast` where already installed; add `Sheet` with Radix Dialog primitives and CSS transitions. `Tabs`/`Segmented` are simple buttons with `aria-pressed`/`aria-selected`; no new Radix dependency. `Progress` uses `role="progressbar"`. `Skeleton` uses `animate-pulse bg-muted`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/feedback.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui tests/unit/components/feedback.test.tsx
git commit -m "feat(design): add feedback and overlay primitives"
```

---

### Task 6: Money and pattern components

**Files:**
- Create: `src/components/ui/amount.tsx`, `src/components/ui/serial.tsx`, `src/components/ui/stamp.tsx`, `src/components/ui/security-thread.tsx`, `src/components/ui/guilloche.tsx`, `src/components/ui/watermark-coin.tsx`, `src/components/ui/coin.tsx`, `src/components/ui/note.tsx`, `tests/unit/components/money.test.tsx`
- Modify: `src/components/ui/index.ts`

**Interfaces:**
- `Amount({ value, kind, sign = 'auto', size = 'md', tone = 'default' })`; `kind: 'vnd' | 'points'`; formats `vi-VN`; points suffix “điểm”, VND suffix “đ”; `auto` adds `+`/`−`.
- `Serial({ value, label?, copyable? })`; uppercase, strip non-alphanumerics, truncate 8, group `4 4`.
- `Stamp({ status, tone = 'leaf', rotate = true })`.
- `SecurityThread({ orientation = 'vertical' })`; `Guilloche({ opacity = 0.06, className? })`; `WatermarkCoin({ size = 120, opacity = 0.06 })`; `Coin({ size = 40, flip = false })`.
- `Note({ points, serial?, streak?, rank?, className? })`; renders the polymer note with guilloche, thread, watermark, serial, points and streak.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/money.test.tsx
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Amount, Note, Serial } from '@/components/ui'

describe('money components', () => {
  it('formats points, VND, large values and negatives', () => {
    expect(renderToStaticMarkup(<Amount value={1250} kind="points" />)).toContain('1.250')
    expect(renderToStaticMarkup(<Amount value={1250} kind="points" />)).toContain('điểm')
    expect(renderToStaticMarkup(<Amount value={50000} kind="vnd" />)).toContain('50.000')
    expect(renderToStaticMarkup(<Amount value={1000000000} kind="vnd" />)).toContain('1.000.000.000')
    expect(renderToStaticMarkup(<Amount value={-150} kind="points" />)).toContain('−150')
    expect(renderToStaticMarkup(<Amount value={18500000} kind="vnd" sign="plus" />)).toContain('+18.500.000')
    expect(renderToStaticMarkup(<Amount value={11240000} kind="vnd" sign="minus" />)).toContain('−11.240.000')
  })
  it('formats a serial and renders the note', () => {
    expect(renderToStaticMarkup(<Serial value="7f2a19c4" />)).toContain('7F2A 19C4')
    const note = renderToStaticMarkup(<Note points={1250} serial="0042 8817" streak={7} rank="Người khai phá" />)
    expect(note).toContain('1.250')
    expect(note).toContain('SỐ VÍ')
    expect(note).toContain('7 ngày')
  })
  it('disables coin motion under reduced motion', () => {
    const css = readFileSync('src/app/globals.css', 'utf8')
    expect(css).toContain('prefers-reduced-motion')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/money.test.tsx`
Expected: FAIL — exports missing.

- [ ] **Step 3: Implement the components**

Use `Intl.NumberFormat('vi-VN')`; use `−` (U+2212) for negatives. `Note` uses `bg-secondary`, `border`, `rounded-[22px]`, `Guilloche` masked behind the number, `SecurityThread`, `WatermarkCoin`, and `Coin`. `Coin` uses the existing `coin-flip` class when `flip` is true. `Serial` uses `font-mono`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/money.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui tests/unit/components/money.test.tsx
git commit -m "feat(design): add money and polymer pattern components"
```

---

### Task 7: Design playground

**Files:**
- Create: `src/app/design/page.tsx`

**Interfaces:**
- Dev-only page; `notFound()` when `process.env.NODE_ENV === 'production'`.
- Renders every primitive in sections: tokens, type, buttons, fields, cards, badges, avatars, tabs, segmented, progress, skeletons, empty states, amounts, serials, stamps, note, dialog/sheet triggers.

- [ ] **Step 1: Write the failing smoke test**

```ts
// tests/e2e/design.spec.ts
import { expect, test } from '@playwright/test'

test('design playground renders the kit', async ({ page }) => {
  await page.goto('/design')
  await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible()
  await expect(page.getByText('The Note')).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/design.spec.ts`
Expected: FAIL — 404.

- [ ] **Step 3: Implement the playground**

Build the page with `PageHeader`, `Section`, and every component. Add a light/dark note (system preference). No data fetching.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/design.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/design/page.tsx tests/e2e/design.spec.ts
git commit -m "feat(design): add design system playground"
```

---

## Phase 1 — Shell, public, auth, system

### Task 8: App shell

**Files:**
- Modify: `src/components/AppNav.tsx`, `src/app/layout.tsx`, `src/features/notifications/components/NotificationBadge.tsx`
- Test: `tests/unit/components/app-nav.test.tsx`, `tests/e2e/nav.spec.ts`

**Interfaces:**
- `AppNav({ balance, streak, isAdmin, signOutAction, unreadCount })`.
- `RootLayout` fetches unread notifications count with a read-only Supabase query and passes it.
- Desktop sidebar 240px; mobile top bar (search, bell, avatar) + bottom nav (Bảng tin, Tài chính, Ví, Khám phá, Thêm) + `Sheet` for “Thêm”.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/app-nav.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({ usePathname: () => '/wallet' }))
import { AppNav } from '@/components/AppNav'

describe('AppNav', () => {
  it('renders the main links, active wallet and unread count', () => {
    const html = renderToStaticMarkup(<AppNav balance={1250} streak={7} isAdmin={false} signOutAction={() => {}} unreadCount={3} />)
    expect(html).toContain('Bảng tin')
    expect(html).toContain('Ví điểm')
    expect(html).toContain('3')
    expect(html).toContain('aria-current="page"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/app-nav.test.tsx`
Expected: FAIL — `unreadCount` not accepted / no `aria-current`.

- [ ] **Step 3: Implement the shell**

Rewrite `AppNav` per spec §6.2. Use Lucide icons, `Sheet` for mobile “Thêm”, `NotificationBadge` with a real count, `Search` link to `/explore`, avatar link to `/profile`. Add `aria-current="page"` on the active link. Update `layout.tsx` to query `notifications` count (head, exact) and pass it. Keep `md:pl-60` aligned with the new sidebar width (240px = `w-60`). Remove the duplicate notification badge from wherever it was orphaned; use the new one in the nav.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/app-nav.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the mobile nav E2E**

```ts
// tests/e2e/nav.spec.ts
import { expect, test } from '@playwright/test'
test('mobile more sheet opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/explore')
  await page.getByRole('button', { name: 'Thêm' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})
```

Run: `npx playwright test tests/e2e/nav.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/AppNav.tsx src/app/layout.tsx src/features/notifications/components/NotificationBadge.tsx tests/unit/components/app-nav.test.tsx tests/e2e/nav.spec.ts
git commit -m "feat(shell): redesign navigation and add notification entry"
```

---

### Task 9: Admin shell

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Create: `src/components/AdminTabs.tsx`, `tests/unit/components/admin-tabs.test.tsx`

**Interfaces:**
- `AdminTabs` uses `usePathname`; tabs `Tổng quan / Người dùng / Bài đăng / Cửa hàng`; active state with `aria-current`.
- Admin pages render inside the main shell; remove the second `w-48` sidebar and its `p-6` wrapper.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/admin-tabs.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('next/navigation', () => ({ usePathname: () => '/admin/users' }))
import { AdminTabs } from '@/components/AdminTabs'

describe('AdminTabs', () => {
  it('marks the current tab and links all sections', () => {
    const html = renderToStaticMarkup(<AdminTabs />)
    expect(html).toContain('Người dùng')
    expect(html).toContain('aria-current="page"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/admin-tabs.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `AdminTabs` and simplify the admin layout**

`admin/layout.tsx` becomes a thin wrapper: `PageHeader` + `AdminTabs` + `{children}` with the `wide` container. Remove the nested sidebar. Do not change admin actions or data fetching.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/admin-tabs.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/layout.tsx src/components/AdminTabs.tsx tests/unit/components/admin-tabs.test.tsx
git commit -m "feat(admin): replace nested sidebar with admin tabs"
```

---

### Task 10: Landing page

**Files:**
- Modify: `src/app/page.tsx`
- Test: `tests/e2e/landing.spec.ts`

**Interfaces:**
- Uses `Note`-style hero card, `Card` features, coin CTA band.
- Preserves CTAs “Nhận 50 điểm khi đăng ký” and “Xem bài đăng”.

- [ ] **Step 1: Write the failing smoke test**

```ts
// tests/e2e/landing.spec.ts
import { expect, test } from '@playwright/test'
test('landing shows the polymer hero and CTAs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Quản lý tiền của bạn/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nhận 50 điểm khi đăng ký' })).toBeVisible()
  await expect(page.getByTestId('landing-note')).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/landing.spec.ts`
Expected: FAIL — old hero has no `50` note/CTA mismatch.

- [ ] **Step 3: Implement the landing**

Rewrite `/` per spec §7.1: hero note with `50` denomination, thread, watermark; features as 2×3 `Card`s with Lucide icons; dark CTA band with coin button. Keep the existing copy and links. No new data fetching.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/landing.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx tests/e2e/landing.spec.ts
git commit -m "feat(landing): rebuild hero and feature grid"
```

---

### Task 11: Auth pages

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/features/auth/components/LoginForm.tsx`, `src/features/auth/components/RegisterForm.tsx`, `src/features/auth/components/OtpInput.tsx`
- Test: `tests/unit/components/otp-input.test.tsx`

**Interfaces:**
- Split brand/form card on desktop; brand mark + form on mobile.
- Keep `input[placeholder="000000"]` and the existing form field names (`email`, `display_name`).
- `OtpInput` keeps `maxLength=6`, numeric-only, and the placeholder.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/otp-input.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OtpInput } from '@/features/auth/components/OtpInput'

describe('OtpInput', () => {
  it('keeps the E2E placeholder and adds OTP autofill semantics', () => {
    const html = renderToStaticMarkup(<OtpInput value="" onChange={() => {}} />)
    expect(html).toContain('placeholder="000000"')
    expect(html).toContain('inputMode="numeric"')
    expect(html).toContain('maxLength="6"')
    expect(html).toContain('autoComplete="one-time-code"')
    expect(html).toContain('aria-label="Mã OTP"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/otp-input.test.tsx`
Expected: FAIL — attributes changed/missing (depending on current markup).

- [ ] **Step 3: Implement the auth redesign**

Use `Field`/`Input`/`Button`, a brand panel with a mini Note, and a lotus error banner. Keep the 2-step flow and server actions unchanged. Add a “Gửi lại mã” quiet action only if the existing action supports it; otherwise omit.

- [ ] **Step 4: Run the test and the existing auth E2E**

Run: `npx vitest run tests/unit/components/otp-input.test.tsx`
Run: `npx playwright test tests/e2e/auth.spec.ts` (requires local Supabase/Inbucket)
Expected: PASS (or note the environment requirement).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\) src/features/auth/components tests/unit/components/otp-input.test.tsx
git commit -m "feat(auth): redesign login and register"
```

---

### Task 12: Error, not-found, loading

**Files:**
- Modify: `src/app/error.tsx`, `src/app/not-found.tsx`
- Create: `src/app/loading.tsx`, `src/app/feed/loading.tsx`, `src/app/finance/loading.tsx`, `src/app/wallet/loading.tsx`, `src/app/shop/loading.tsx`, `src/app/admin/loading.tsx`
- Test: `tests/e2e/system.spec.ts`

**Interfaces:**
- `error.tsx` offers “Thử lại” + “Về trang chủ”; `not-found.tsx` offers “Về trang chủ”; loading pages use `Skeleton`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/e2e/system.spec.ts
import { expect, test } from '@playwright/test'
test('unknown route shows the branded not-found', async ({ page }) => {
  await page.goto('/this-route-does-not-exist')
  await expect(page.getByTestId('not-found')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Về trang chủ' })).toBeVisible()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/system.spec.ts`
Expected: FAIL — old not-found copy.

- [ ] **Step 3: Implement the system pages**

Use `EmptyState`/`WatermarkCoin`/`Button`. Add route-level `loading.tsx` with `Skeleton` variants. Keep `error.tsx` a client component with `reset`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/e2e/system.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/error.tsx src/app/not-found.tsx src/app/loading.tsx src/app/feed/loading.tsx src/app/finance/loading.tsx src/app/wallet/loading.tsx src/app/shop/loading.tsx src/app/admin/loading.tsx tests/e2e/system.spec.ts
git commit -m "feat(system): add branded error, not-found and loading states"
```

---

## Phase 2 — Wallet and rewards

### Task 13: Wallet page and the Note

**Files:**
- Modify: `src/app/wallet/page.tsx`, `src/features/wallet/components/BalanceCard.tsx`, `src/features/wallet/components/RealtimeBalance.tsx`, `src/features/wallet/components/LedgerTable.tsx`
- Test: `tests/e2e/wallet.spec.ts` (existing), `tests/unit/components/wallet-note.test.tsx`

**Interfaces:**
- Wallet hero uses `Note`; `data-testid="balance"` preserved.
- Ledger rows use `Amount`, `Serial`, `CategoryIcon` (reason icons via Lucide, not category emoji).
- Tabs: Tất cả / Nhận / Chi / Nạp (client-side filter).

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/wallet-note.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BalanceCard } from '@/features/wallet/components/BalanceCard'

describe('BalanceCard', () => {
  it('shows the polymer note serial, points, streak and the balance test id', () => {
    const html = renderToStaticMarkup(<BalanceCard balance={1250} streak={7} />)
    expect(html).toContain('1.250')
    expect(html).toContain('điểm')
    expect(html).toContain('data-testid="balance"')
    expect(html).toContain('data-testid="wallet-note"')
    expect(html).toContain('SỐ VÍ')
    expect(html).toContain('7 ngày')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/wallet-note.test.tsx`
Expected: FAIL — old card lacks “điểm”/test id.

- [ ] **Step 3: Implement the wallet page**

Use `PageHeader`, `Note`, quick actions, `Tabs`, `LedgerTable` with `Amount`/`Serial`. Keep the realtime subscription. Add an `EmptyState` when the ledger is empty.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/components/wallet-note.test.tsx`
Run: `npx playwright test tests/e2e/wallet.spec.ts` (requires auth)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/wallet/page.tsx src/features/wallet/components tests/unit/components/wallet-note.test.tsx
git commit -m "feat(wallet): redesign wallet note and ledger"
```

---

### Task 14: Top-up and return

**Files:**
- Modify: `src/app/wallet/topup/page.tsx`, `src/features/wallet/components/TopupForm.tsx`, `src/app/wallet/topup/return/page.tsx`
- Test: `tests/e2e/wallet.spec.ts` (existing selectors), `tests/unit/components/topup-form.test.tsx`

**Interfaces:**
- Preset buttons keep the text `50.000`; primary button keeps `Thanh toán qua VNPay`.
- Summary shows VND → points at `1.000đ = 1 điểm`.
- Return page uses `Stamp` success/failure, no giant emoji.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/topup-form.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TopupForm } from '@/features/wallet/components/TopupForm'

describe('TopupForm', () => {
  it('renders the 50.000 preset, selected state and the VNPay CTA', () => {
    const html = renderToStaticMarkup(<TopupForm />)
    expect(html).toContain('50.000')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Thanh toán qua VNPay')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/topup-form.test.tsx`
Expected: FAIL — broken `primary`/`border` tokens or missing CTA.

- [ ] **Step 3: Implement the top-up redesign**

Replace undefined `primary`/`border`/`muted-foreground` classes with semantic tokens. Preset grid 2×3; selected state leaf border + check; custom amount; summary card; disabled VNPay note when credentials are missing. Return page uses `Stamp` and `Amount`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/components/topup-form.test.tsx`
Run: `npx playwright test tests/e2e/wallet.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/wallet/topup src/features/wallet/components/TopupForm.tsx tests/unit/components/topup-form.test.tsx
git commit -m "feat(wallet): redesign top-up and payment result"
```

---

### Task 15: Redeem and Premium

**Files:**
- Modify: `src/app/redeem/page.tsx`, `src/features/wallet/components/RedeemCard.tsx`, `src/app/billing/upgrade/page.tsx`
- Test: `tests/unit/components/redeem-card.test.tsx`

**Interfaces:**
- `RedeemCard` uses `Card`, `Badge`, `Amount`, `Button`; confirmation dialog shows cost and remaining balance.
- Premium: one real path “Dùng 500 điểm”; secondary link “Nạp điểm để nâng cấp” → `/wallet/topup`. No “Thanh toán 19.000đ” promise.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/redeem-card.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RedeemCard } from '@/features/wallet/components/RedeemCard'

describe('RedeemCard', () => {
  it('shows the reward cost in points', () => {
    const html = renderToStaticMarkup(<RedeemCard userBalance={500} reward={{ id: '1', name: 'Huy hiệu', description: null, points_cost: 200, stock: null, active: true, created_at: '' }} />)
    expect(html).toContain('200')
    expect(html).toContain('điểm')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/redeem-card.test.tsx`
Expected: FAIL — old card lacks semantic markup.

- [ ] **Step 3: Implement the redesign**

Use the new primitives. Premium page uses a Note variant, benefits list with `Check`, and the honest top-up link. Keep the existing `subscribeWithPoints` action and error handling.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/redeem-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/redeem src/app/billing/upgrade src/features/wallet/components/RedeemCard.tsx tests/unit/components/redeem-card.test.tsx
git commit -m "feat(rewards): redesign redeem and premium pages"
```

---

## Phase 3 — Finance

### Task 16: Finance list and new transaction

**Files:**
- Modify: `src/app/finance/page.tsx`, `src/app/finance/new/page.tsx`, `src/features/finance/components/MonthPicker.tsx`
- Test: `tests/unit/components/finance-page.test.ts`, `tests/e2e/finance.spec.ts`

**Interfaces:**
- `PageHeader` + `MonthPicker` (segmented) + “Thêm giao dịch”.
- Summary `Stat` cards with `Amount`; ledger grouped by date; mobile rows stack.
- New form uses `Segmented` (Chi/Thu), `Input` with `đ`, `Select` with `CategoryIcon`, `Textarea`, sticky save on mobile.
- Page roots get `data-testid="finance-summary"` and `data-testid="transaction-ledger"`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/components/finance-page.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('finance page', () => {
  it('marks the summary and the transaction ledger', () => {
    const page = readFileSync('src/app/finance/page.tsx', 'utf8')
    expect(page).toContain('data-testid="finance-summary"')
    expect(page).toContain('data-testid="transaction-ledger"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/finance-page.test.ts`
Expected: FAIL — test ids missing.

- [ ] **Step 3: Implement the finance pages**

Use `PageHeader`, `Stat`, `Amount`, `CategoryIcon`, `EmptyState`. Add the page test ids. Keep `listTransactions`/`getSubscriptionStatus` and the `?month=` param. New form keeps the existing `createTransaction` action and validation. No new mutations.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/components/finance-page.test.ts`
Run: `npx playwright test tests/e2e/finance.spec.ts` (add a smoke test that logs in and opens `/finance`)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/finance/page.tsx src/app/finance/new/page.tsx src/features/finance/components/MonthPicker.tsx tests/unit/components/finance-page.test.ts tests/e2e/finance.spec.ts
git commit -m "feat(finance): redesign transactions and new transaction form"
```

---

### Task 17: Budgets and goals

**Files:**
- Modify: `src/app/finance/budgets/page.tsx`, `src/app/finance/goals/page.tsx`
- Test: `tests/unit/components/budgets-goals-pages.test.ts`

**Interfaces:**
- Read-only restyle. Budget cards: category, limit, spent, remaining, `Progress` tone by ratio; each card gets `data-testid="budget-card"`. Goal cards: target/current/`Progress`, deadline, achieved `Stamp`; each card gets `data-testid="goal-card"`.
- No “Thêm ngân sách”/“Thêm mục tiêu” forms.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/components/budgets-goals-pages.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('budgets and goals pages', () => {
  it('marks the read-only cards', () => {
    expect(readFileSync('src/app/finance/budgets/page.tsx', 'utf8')).toContain('data-testid="budget-card"')
    expect(readFileSync('src/app/finance/goals/page.tsx', 'utf8')).toContain('data-testid="goal-card"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/budgets-goals-pages.test.ts`
Expected: FAIL — test ids missing.

- [ ] **Step 3: Implement the read-only restyle**

Use `PageHeader`, `Card`, `Progress`, `Amount`, `Badge`, `EmptyState`. Add the card test ids. Keep the existing data queries. Add a month picker only if the page can use the existing `?month=` pattern; otherwise keep the current month display.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/budgets-goals-pages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/finance/budgets/page.tsx src/app/finance/goals/page.tsx tests/unit/components/budgets-goals-pages.test.ts
git commit -m "feat(finance): restyle budgets and goals as read-only ledgers"
```

---

### Task 18: Finance trends

**Files:**
- Modify: `src/app/finance/trends/page.tsx`, `src/features/finance/components/TrendChart.tsx`
- Test: `tests/unit/components/trend-chart.test.tsx`

**Interfaces:**
- Premium gate as a Note card with coin CTA.
- Chart uses `var(--color-leaf)`/`var(--color-lotus)` (no hardcoded hex), `Amount` for net savings, tabular month labels.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/trend-chart.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TrendChart } from '@/features/finance/components/TrendChart'

describe('TrendChart', () => {
  it('uses token colors and renders both series', () => {
    const html = renderToStaticMarkup(<TrendChart data={[{ month: '2026-11-01', total_income: 100, total_expense: 50 }]} />)
    expect(html).toContain('var(--color-leaf)')
    expect(html).toContain('var(--color-lotus)')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/trend-chart.test.tsx`
Expected: FAIL — hardcoded `#22c55e`/`#ef4444`.

- [ ] **Step 3: Implement the redesign**

Replace hardcoded colors with CSS variables; use `PageHeader`, `Stat`, `Card`, `Amount`. Keep `get_finance_trend` RPC and the premium check. No data changes.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/trend-chart.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/finance/trends/page.tsx src/features/finance/components/TrendChart.tsx tests/unit/components/trend-chart.test.tsx
git commit -m "feat(finance): redesign premium trends with token colors"
```

---

## Phase 4 — Social

### Task 19: Feed

**Files:**
- Modify: `src/app/feed/page.tsx`, `src/features/feed/components/PostComposer.tsx`, `PostCard.tsx`, `LikeButton.tsx`, `CommentList.tsx`, `CommentInput.tsx`, `WelcomeBanner.tsx`, `NewPostsBanner.tsx`, `FeedList.tsx`, `LoadMoreFeed.tsx`
- Test: `tests/unit/components/post-card.test.tsx`, `tests/e2e/feed.spec.ts`

**Interfaces:**
- Composer and posts use `Card`; action icons use Lucide (`Heart`, `MessageCircle`, `ImagePlus`); no UI emoji.
- Keep optimistic like/comment behavior and realtime banner.
- Empty state when no posts.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/post-card.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PostCard } from '@/features/feed/components/PostCard'

const post = {
  id: 'p1', user_id: 'u1', content: 'Xin chào', image_urls: [], like_count: 2, comment_count: 1,
  created_at: new Date().toISOString(), deleted_at: null, hidden: false,
  profiles: { display_name: 'Minh Anh', avatar_url: null }, comments: [],
} as any

describe('PostCard', () => {
  it('renders the author, content and icon actions', () => {
    const html = renderToStaticMarkup(<PostCard post={post} currentUserId="u2" />)
    expect(html).toContain('Minh Anh')
    expect(html).toContain('Xin chào')
    expect(html).toContain('data-icon="heart"')
    expect(html).toContain('data-icon="message-circle"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/post-card.test.tsx`
Expected: FAIL — emoji/markup.

- [ ] **Step 3: Implement the feed redesign**

Use `PageHeader`, `Card`, `Avatar`, `Button`, `EmptyState`, Lucide icons. Keep `fetchFeedPage`, `createPost`, realtime subscription, and infinite scroll. Replace emoji in `WelcomeBanner`/`NewPostsBanner` with icons. Keep image upload logic unchanged.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/components/post-card.test.tsx`
Run: `npx playwright test tests/e2e/feed.spec.ts` (add a smoke test with login)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/feed src/features/feed/components tests/unit/components/post-card.test.tsx tests/e2e/feed.spec.ts
git commit -m "feat(feed): redesign composer, posts and banners"
```

---

### Task 20: Explore and public profile

**Files:**
- Modify: `src/app/explore/page.tsx`, `src/app/u/[username]/page.tsx`, `src/features/search/components/SearchInput.tsx`, `src/features/profile/components/ProfileHeader.tsx`, `FollowButton.tsx`
- Test: `tests/e2e/search.spec.ts` (existing), `tests/unit/components/profile-header.test.tsx`

**Interfaces:**
- Search field with icon; tabs “Bài đăng / Người dùng”; result rows use `Card`.
- Public profile: cover band + thread, avatar overlap, stats, follow/edit button.
- Fix lookup: `username` first, then `display_name`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/profile-header.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'

const profile = {
  id: 'u1', display_name: 'Minh Anh', username: 'minhanh', avatar_url: null, bio: 'Tiết kiệm mỗi ngày',
  points_balance: 1250, streak_count: 7, role: 'user', locked: false, referral_code: 'abc',
  status: 'active', last_login_date: null, created_at: '', updated_at: '',
} as any

describe('ProfileHeader', () => {
  it('shows handle, bio, points and streak', () => {
    const html = renderToStaticMarkup(<ProfileHeader profile={profile} />)
    expect(html).toContain('@minhanh')
    expect(html).toContain('Tiết kiệm mỗi ngày')
    expect(html).toContain('1.250')
    expect(html).toContain('7 ngày')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/profile-header.test.tsx`
Expected: FAIL — no handle/points markup.

- [ ] **Step 3: Implement the pages**

Use `PageHeader`, `Card`, `Avatar`, `Stat`, `Badge`, `EmptyState`. Update the public profile query to:
```ts
const { data: profile } = await supabase.from('profiles').select('*').or(`username.eq.${username},display_name.eq.${username}`).maybeSingle()
```
Escape/validate the param; if none, `notFound()`. When `user?.id === profile.id`, show “Chỉnh sửa hồ sơ” instead of Follow.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/components/profile-header.test.tsx`
Run: `npx playwright test tests/e2e/search.spec.ts` (existing)
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/explore src/app/u src/features/search/components/SearchInput.tsx src/features/profile/components tests/unit/components/profile-header.test.tsx
git commit -m "feat(social): redesign explore and public profile"
```

---

### Task 21: Profile and notifications

**Files:**
- Modify: `src/app/profile/page.tsx`, `src/app/notifications/page.tsx`, `src/features/notifications/components/NotificationList.tsx`, `NotificationBadge.tsx`, `src/features/profile/components/AvatarUpload.tsx`, `EditProfileForm.tsx`
- Test: `tests/unit/components/notification-list.test.tsx`

**Interfaces:**
- `/profile` is a settings page: identity card, avatar upload, edit form; no feed.
- Notifications use `Segmented` tabs and icon rows; unread background `--secondary`.
- `NotificationBadge` is mounted in the nav (Task 8) and shows the real count.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/notification-list.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NotificationList } from '@/features/notifications/components/NotificationList'

describe('NotificationList', () => {
  it('renders accessible tabs and an empty state', () => {
    const html = renderToStaticMarkup(<NotificationList initialItems={[]} userId="u1" />)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Chưa có thông báo')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/notification-list.test.tsx`
Expected: FAIL — old copy/markup.

- [ ] **Step 3: Implement the pages**

Use `PageHeader`, `Card`, `Segmented`, `EmptyState`, `Avatar`, `Button`. Keep the realtime subscription and `markAllAsRead`. Profile uses `Field`/`Input`/`Textarea`; keep the existing `updateProfile` action.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/notification-list.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/profile src/app/notifications src/features/notifications src/features/profile/components tests/unit/components/notification-list.test.tsx
git commit -m "feat(profile): redesign settings and notifications"
```

---

## Phase 5 — Productivity and referral

### Task 22: Notes and todos (read-only)

**Files:**
- Modify: `src/app/notes/page.tsx`, `src/app/todos/page.tsx`
- Test: `tests/unit/components/productivity-pages.test.ts`

**Interfaces:**
- Read-only restyle. No create/edit/toggle forms.
- Notes: title, 3-line clamp, pinned `Badge`, updated time; 2-col desktop / 1-col mobile.
- Todos: active rows with status icon, title, due date; done section collapsed.
- Each page root gets `data-testid="notes-page"` / `data-testid="todos-page"` for smoke checks.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/components/productivity-pages.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('productivity pages', () => {
  it('marks the read-only pages with stable test ids', () => {
    expect(readFileSync('src/app/notes/page.tsx', 'utf8')).toContain('data-testid="notes-page"')
    expect(readFileSync('src/app/todos/page.tsx', 'utf8')).toContain('data-testid="todos-page"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/productivity-pages.test.ts`
Expected: FAIL — test ids missing.

- [ ] **Step 3: Implement the read-only restyle**

Use `PageHeader`, `Card`, `Badge`, `EmptyState`, Lucide icons. Add the page test ids. Keep the existing data queries; do not add forms or toggles.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/components/productivity-pages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/notes/page.tsx src/app/todos/page.tsx tests/unit/components/productivity-pages.test.ts
git commit -m "feat(productivity): restyle notes and todos as read-only"
```

---

### Task 23: Invite and referral

**Files:**
- Modify: `src/app/invite/page.tsx`, `src/features/referral/components/InviteLink.tsx`, `ReferralLeaderboard.tsx`, `ReferralStatus.tsx`
- Test: `tests/e2e/referral.spec.ts` (existing), `tests/unit/components/invite-link.test.tsx`

**Interfaces:**
- Hero card with referral code as `Serial` + copy; stats `Stat`; leaderboard ranked list.
- Preserve `data-testid="referral-code"` and `data-testid="referral-total"`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/invite-link.test.tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InviteLink } from '@/features/referral/components/InviteLink'

describe('InviteLink', () => {
  it('keeps the referral code test id and labels the copy action', () => {
    const html = renderToStaticMarkup(<InviteLink code="abc12345" />)
    expect(html).toContain('data-testid="referral-code"')
    expect(html).toContain('abc12345')
    expect(html).toContain('aria-label="Sao chép mã mời"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/invite-link.test.tsx`
Expected: FAIL — test id missing/markup changed.

- [ ] **Step 3: Implement the redesign**

Use `PageHeader`, `Card`, `Serial`, `Stat`, `Button`, `EmptyState`, `Avatar`. Keep the existing referral queries/actions. Add copy feedback via `Toast` if the existing component supports it; otherwise use a transient “Đã sao chép” label.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/components/invite-link.test.tsx`
Run: `npx playwright test tests/e2e/referral.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/invite src/features/referral/components tests/unit/components/invite-link.test.tsx
git commit -m "feat(referral): redesign invite hero, stats and leaderboard"
```

---

## Phase 6 — Shop

### Task 24: Shop list, detail, orders

**Files:**
- Modify: `src/app/shop/page.tsx`, `src/app/shop/[id]/page.tsx`, `src/app/shop/orders/page.tsx`, `src/app/shop/orders/RevealCodeButton.tsx`
- Test: `tests/e2e/shop.spec.ts` (existing), `tests/unit/components/shop-page.test.ts`

**Interfaces:**
- Product cards: image, partner, title, points/VND, stock badge; `a[href^="/shop/"]` preserved; each card gets `data-testid="shop-card"`.
- Detail: image hero, price card, “Mua bằng” preserved; confirmation dialog.
- Orders: status badge, `Serial` voucher code with copy.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/components/shop-page.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('shop page', () => {
  it('marks product cards with a stable test id', () => {
    expect(readFileSync('src/app/shop/page.tsx', 'utf8')).toContain('data-testid="shop-card"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/shop-page.test.ts`
Expected: FAIL — test id missing.

- [ ] **Step 3: Implement the shop redesign**

Use `PageHeader`, `Card`, `Badge`, `Amount`, `Serial`, `Button`, `EmptyState`. Add `data-testid="shop-card"`. Keep `listProducts`, `getProduct`, `purchaseProductWithPoints`, `getMyOrders`, `getMyOrderCode` and the existing error handling. Preserve “Mua bằng” and the VNPay note.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/components/shop-page.test.ts`
Run: `npx playwright test tests/e2e/shop.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/shop tests/unit/components/shop-page.test.ts
git commit -m "feat(shop): redesign catalog, detail and orders"
```

---

## Phase 7 — Admin

### Task 25: Admin dashboard, users, posts, shop

**Files:**
- Modify: `src/app/admin/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/posts/page.tsx`, `src/app/admin/shop/page.tsx`
- Test: `tests/e2e/admin.spec.ts` (existing), `tests/unit/components/admin-pages.test.ts`

**Interfaces:**
- Dashboard: `PageHeader`, admin tabs, 5 `Stat`, recent payments table; root `data-testid="admin-dashboard"`.
- Users: responsive table/cards, lock/unlock confirm dialog; root `data-testid="admin-users"`.
- Posts: moderation cards with hide/show confirm; root `data-testid="admin-posts"`.
- Shop: tabs Partners/Products/Codes/Orders, forms in `Dialog`/`Sheet`, Vietnamese copy, no double padding; root `data-testid="admin-shop"`.
- Keep all existing admin actions/RPCs.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/components/admin-pages.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('admin pages', () => {
  it('marks each admin surface with a stable test id', () => {
    expect(readFileSync('src/app/admin/page.tsx', 'utf8')).toContain('data-testid="admin-dashboard"')
    expect(readFileSync('src/app/admin/users/page.tsx', 'utf8')).toContain('data-testid="admin-users"')
    expect(readFileSync('src/app/admin/posts/page.tsx', 'utf8')).toContain('data-testid="admin-posts"')
    expect(readFileSync('src/app/admin/shop/page.tsx', 'utf8')).toContain('data-testid="admin-shop"')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/components/admin-pages.test.ts`
Expected: FAIL — test ids missing.

- [ ] **Step 3: Implement the admin redesign**

Use `PageHeader`, `Stat`, `Table`, `Badge`, `Button`, `Dialog`, `EmptyState`, `Amount`. Add the page test ids. Remove the double `p-6`/`max-w` nesting. Translate English copy to Vietnamese. Keep `requireAdmin`, `listUsers`, `lockUser`, `unlockUser`, `listAllPosts`, `hidePost`, `unhidePost`, shop admin actions unchanged.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/components/admin-pages.test.ts`
Run: `npx playwright test tests/e2e/admin.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin tests/unit/components/admin-pages.test.ts
git commit -m "feat(admin): redesign dashboard, users, posts and shop"
```

---

## Phase 8 — QA gate

### Task 26: Visual, accessibility and E2E gate

**Files:**
- Modify: `CLAUDE.md`, `docs/APP-REFERENCE.md` (design system section)
- Create: `docs/superpowers/specs/2026-11-18-ui-screenshots/` (screenshots)
- Test: `tests/e2e/design.spec.ts`, `tests/e2e/nav.spec.ts`, existing suites

**Interfaces:**
- No new components. This task verifies and documents.

- [ ] **Step 1: Run the full gate**

```bash
npx tsc --noEmit
npm run build
npm run test:unit
npm run lint
npx playwright test
```

Expected: all pass; if E2E auth needs local Supabase/Inbucket, start it and note it.

- [ ] **Step 2: Capture the screenshot matrix**

For each of `/`, `/login`, `/feed`, `/wallet`, `/finance`, `/shop`, `/admin` at 360/768/1280 in light/dark, save PNGs under `docs/superpowers/specs/2026-11-18-ui-screenshots/`. Check: no overflow, no `bg-white` in dark, focus ring visible, empty states.

- [ ] **Step 3: Fix the findings**

Fix only regressions found by the gate; no new scope. Re-run the failing check.

- [ ] **Step 4: Update docs**

Add a “Design system” section to `CLAUDE.md` and `docs/APP-REFERENCE.md`: tokens, primitives, shell, page template, motif rules, E2E selectors. Note the `lucide-react` dependency and the `CategoryIcon` mapping.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/APP-REFERENCE.md docs/superpowers/specs/2026-11-18-ui-screenshots tests
git commit -m "docs: document the Polymer Ledger design system and QA results"
```

---

## Self-review notes

- **Spec coverage:** tokens (§5.2), type (§5.3), spacing/radius (§5.4), motifs (§5.5), icons (§5.6), motion (§5.7), dark mode (§5.8), accessibility (§5.9), components (§6), all 30 routes (§7), copy (§8), phases (§9), testing (§11), risks (§12) each map to a task above.
- **Read-only scope:** Tasks 17, 22, and 23 explicitly avoid create/edit UI; Task 15 keeps the honest Premium top-up link.
- **Type consistency:** `Amount.kind` is `'vnd' | 'points'` everywhere; `CategoryIcon.icon` is `string | null`; `Note` props are `points/serial/streak/rank`; `AppNav` adds `unreadCount`.
- **Review Focus tests:** long amounts (Task 6), empty states (Tasks 4/21/22), dark contrast (Task 26 screenshots), keyboard/focus (Tasks 8/12/26), reduced motion (Task 6).
