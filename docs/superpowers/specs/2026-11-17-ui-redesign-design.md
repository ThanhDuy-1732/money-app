# Money App — Full UI Redesign Design Spec

> Date: 2026-11-17
> Branch: `feat/phase5-production-ready` (working tree has an uncommitted partial redesign — build on it, do not revert)
> Based on: full UI inventory of all 30 routes, `src/components/ui/*`, `src/components/AppNav.tsx`, `src/app/globals.css`

## 1. Intent

Money App is a personal-finance + social-rewards product for Vietnamese users. The current UI has two visual languages: a new polymer/green/coin direction (landing, sidebar, wallet balance card, 3 primitives) and a legacy gray/white card system on ~90% of the app. The token layer is incomplete, dark mode is unowned, and every page re-invents cards, buttons, empty states, and spacing.

This redesign unifies the whole product under one identity: **a polymer banknote as the material, a modern e-wallet as the interaction model.** The banknote gives the product a Vietnamese, tactile, trustworthy character; the e-wallet gives it speed, clarity, and the patterns users already know from MoMo/ZaloPay/Revolut.

Success means: every route uses the same tokens and primitives, the app feels intentional on mobile and desktop, dark mode works, and no screen looks like a leftover from another product.

**Audience:** Vietnamese users 18–35, mobile-first, managing daily spending and rewards; secondary: admins using the back office.

**Primary job of the UI:** make balances, transactions, points, and rewards instantly legible; make the social/rewards layer feel light, not gamified noise.

---

## 2. Goals / Non-goals / Anti-goals

### Goals
1. One token system (color, type, radius, shadow, container, spacing) used by every screen.
2. A component kit thick enough that pages stop hand-rolling buttons, inputs, cards, tabs, progress, empty states, and tables.
3. A single app shell: desktop sidebar, mobile top bar + bottom nav, one notification entry point, one search entry point.
4. A signature wallet/landing treatment that carries the polymer idea; quieter, denser treatments for finance/admin.
5. Full coverage of all 30 routes, including auth, admin, error/not-found, and the VNPay return page.
6. System dark mode via tokens (no manual toggle in this pass).
7. Replace UI emoji with a consistent icon set; emoji remain allowed only inside user-generated content.
8. Preserve or deliberately update the E2E selectors listed in §11.

### Non-goals
- No backend, database, auth, payment, or data-model changes.
- No new product features (no transfers, QR pay, recurring transactions, gift points, etc.).
- No new create/edit UI for budgets, savings goals, notes, or todos in this pass. Those screens are restyled read-only; their existing server actions are not wired to new forms.
- No manual light/dark toggle; dark mode follows the OS.
- No full i18n; Vietnamese copy stays Vietnamese.
- No redesign of the dev-only `/mock/vnpay` brand island (it must keep looking like VNPay).
- No new display font. One family (Be Vietnam Pro) + system mono for serials/codes.
- No page-level data-fetching changes; Server Components/Actions stay as they are.

### Anti-goals (what would make this a failure even if it “works”)
- A literal banknote skeuomorph: guilloche behind body text, fake watermarks everywhere, gold on every surface, “security” decoration that carries no information.
- Identical rounded cards with identical shadows on every page (the current SaaS-card default).
- Emoji used as the primary icon system.
- Inconsistent radii, container widths, or vertical rhythm.
- A dark mode that is just an inverted screenshot; contrast and hierarchy must be designed.
- Breaking E2E flows or hiding existing actions behind new navigation.

---

## 3. Constraints

- **Stack:** Next.js 16 App Router, Tailwind CSS v4 (`@theme inline`), Radix primitives, React Hook Form + Zod, Be Vietnam Pro via `next/font`.
- **Existing partial redesign:** keep the `giấy / mực / lá / sen / xu` palette, `AppNav`, landing page, and `BalanceCard` as the starting point. Extend and refine; do not revert.
- **Server/client split:** most pages are Server Components. Design components must work in both; interactive primitives are client components.
- **No image assets required:** motifs are CSS/SVG so they work in dark mode and at any density. Avoid raster textures.
- **Performance:** no large background images, no animation on every card; respect `prefers-reduced-motion`.
- **Read-only additions allowed:** the redesign may add read-only queries/params where a designed control needs them (notification unread count, month filter on budgets, admin search, follower counts). No new mutations, RPCs, schema, or payment flows.
- **Tests:** Playwright E2E pins text/selectors (§11). Preserve them or update the tests in the same change.
- **Dependency:** one new dependency allowed if approved: `lucide-react` for icons. If rejected, build a curated local icon set with the same API.
- **Browser support:** evergreen Chrome/Safari/Firefox; mobile Safari safe-area insets.

---

## 4. Approaches considered

| Approach | What it is | Trade-off | Verdict |
|---|---|---|---|
| **A. Polymer Ledger** | Polymer banknote as material identity; modern e-wallet as interaction model. Paper surfaces, security thread, serials, watermark, coin; big balance, quick actions, ledger rows, sheets. | Needs discipline to avoid kitsch; more components to build. | **Chosen.** Matches the user's direction and the existing partial redesign; scales from marketing to admin. |
| B. Neo-banknote | Dark-first, high-contrast, iridescent gradients, neon balance, oversized social cards. | Weak trust signal for finance; hard to read tables/charts; expensive theming. | Rejected: wrong emotional register for money. |
| C. Minimal fintech + polymer accent | White/ink base, green primary, polymer only on hero/balance/auth. | Fast and safe, but the polymer identity becomes decoration. | Rejected as the primary direction; its discipline is borrowed for forms/admin. |

**Decision:** A, with C's restraint on dense screens.

---

## 5. Design system

### 5.1 Concept: “A wallet made of polymer”

The banknote is a **material**, not a costume. It shows up where trust and identity matter: the landing hero, auth, the wallet note, vouchers, premium. Everywhere else the app behaves like a fast e-wallet: large numbers, clear rows, one primary action per screen, no decoration that does not carry information.

**Five principles**
1. **One bold moment per screen.** The balance note, the hero, the voucher, or the chart is the memorable thing; everything around it is quiet.
2. **Security marks are information.** Serial numbers, stamps, and threads label real IDs/statuses; never fake decoration.
3. **Numbers are the hero.** Amounts use tabular numerals, strong weight, and generous space; labels stay small and calm.
4. **Paper, not glass.** Surfaces are matte, lightly bordered, low-shadow. Floating layers (sheets, dialogs) are the only elevated surfaces.
5. **Mobile is the default.** Design at 360px first; desktop adds a sidebar and wider ledgers, not a different product.

### 5.2 Color tokens

Semantic tokens are the contract. Legacy `blue/green/red/gray` remaps stay temporarily so unmigrated pages do not break, but new code must use semantic names.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#EDF2EF` | `#0B1512` | App canvas |
| `--foreground` | `#10231C` | `#E6ECE9` | Primary text |
| `--card` | `#F7FAF7` | `#12211C` | Paper surface |
| `--card-foreground` | `#10231C` | `#E6ECE9` | Text on card |
| `--muted` | `#E3EAE4` | `#1A2B25` | Secondary surface |
| `--muted-foreground` | `#5B6B63` | `#A6B5AE` | Secondary text |
| `--border` | `#D2DBD7` | `#2A3B34` | Hairlines, inputs |
| `--input` | `#FFFFFF` | `#12211C` | Input background |
| `--ring` | `#1E6B52` | `#4FB08C` | Focus ring |
| `--primary` | `#1E6B52` | `#4FB08C` | Primary actions, links |
| `--primary-foreground` | `#F7FAF7` | `#0B1512` | Text on primary |
| `--secondary` | `#D3EBE0` | `#1A3A2E` | Secondary actions |
| `--secondary-foreground` | `#134334` | `#D3EBE0` | Text on secondary |
| `--accent` / `--coin` | `#F0B429` | `#F0B429` | Points, premium, coin |
| `--accent-foreground` | `#10231C` | `#0B1512` | Text on coin |
| `--coin-deep` | `#B9820A` | `#F5C65A` | Coin text on pale coin |
| `--destructive` / `--lotus` | `#C93A64` | `#E86B8F` | Expense, errors, streak |
| `--destructive-foreground` | `#FFFFFF` | `#0B1512` | Text on lotus |
| `--paper` | `#EDF2EF` | `#0B1512` | Alias for background |
| `--paper-deep` | `#E3EAE4` | `#12211C` | Alternating band |
| `--ink` | `#10231C` | `#E6ECE9` | Alias for foreground |
| `--security-1` | `#7BD3B0` | `#7BD3B0` | Thread gradient stop |
| `--security-2` | `#F0B429` | `#F0B429` | Thread gradient stop |
| `--security-3` | `#E86B8F` | `#E86B8F` | Thread gradient stop |

**Rules**
- Lotus 600 (`#C93A64`) is for fills and large text; lotus 700 (`#A52D51`) for small text on paper.
- Coin is never used for body text on paper; use `--coin-deep` for small coin-colored text.
- Do not use `zinc`, `amber`, `yellow`, or `neutral` in new code. Map them to semantic tokens during migration.
- Security gradient is used only on the thread and the “premium” stamp edge; never as a background wash.

### 5.3 Typography

- **Family:** Be Vietnam Pro (400/500/600/700/800). **Mono:** system `ui-monospace` for serials, voucher codes, OTP, and IDs only.
- **Body:** 15px / 1.5 (Vietnamese diacritics need air). Small: 13/1.45. Micro: 11/1.3.
- **Display:** 48/1.05, weight 800, tracking `-0.03em`. H1: 32/1.15. H2: 24/1.25. H3: 18/1.35.
- **Numbers:** `font-variant-numeric: tabular-nums` on all amounts, balances, dates, and tables. Use `text-right` for amounts.
- **Labels:** sentence case. All-caps only for banknote micro-text (“SỐ SERI”, “MỆNH GIÁ”) where it labels a real serial/denomination; never as a generic eyebrow above every section.
- **Line length:** 60–75ch for prose; 45ch for forms; full width for tables.
- **Links:** underline on hover; never color-only.

### 5.4 Spacing, radius, shadow, containers

- **Spacing base:** 4px. Use 4/8/12/16/20/24/32/40/48/64.
- **Radius:** `sm 8`, `md 12`, `lg 16`, `xl 20`, `2xl 28`, `full`. Cards use `lg`; inputs/buttons `md`; sheets `2xl`; pills `full`. No `rounded`/`rounded-md`/`rounded-lg` mix in new code.
- **Shadow:** cards have no shadow; only floating sheets/dialogs/toasts use `0 24px 60px -24px rgb(16 35 28 / 0.35)`. Focus ring is 2px `--ring` + 2px offset.
- **Containers:** `narrow` 640 (feed, forms, auth), `default` 960 (finance, shop, profile), `wide` 1200 (admin tables, trends). Page padding: 16 mobile / 24 tablet / 32 desktop. Section gap: 24 mobile / 32 desktop.
- **Vertical rhythm:** every page starts with `PageHeader` and 24px gap; sections use 32px gaps; no page without top padding.

### 5.5 Signature motifs

| Motif | What it is | Where | Rules |
|---|---|---|---|
| **The Note** | A polymer note surface: paper card, 1px line, guilloche at 4–6% opacity, vertical security thread, watermark coin, serial, denomination amount. | Wallet balance, landing hero, premium card, voucher. | Max one per screen. Never put body text over guilloche; pattern sits behind the number only, masked. |
| **The Thread** | 2px iridescent vertical line (green→gold→lotus) along the left edge of the sidebar / top of mobile sheet / edge of premium card. | Shell, premium, voucher. | Decorative but consistent; no animation except a slow shimmer on hover (reduced-motion off). |
| **The Serial** | Mono uppercase `SERI 0042 8817`, derived from real transaction/order/referral IDs. | Ledger rows, order cards, vouchers, invite code. | Only real IDs; truncate to 8 chars; copyable where useful. |
| **The Stamp** | Circular outlined stamp, rotated -8°, with status text (“ĐÃ ĐỔI”, “PREMIUM”, “ĐÃ NHẬN”). | Voucher, premium, completed goal. | Max one per card; lotus/leaf/coin color by status; not a generic badge. |
| **The Coin** | Gold coin with `đ` or a lotus mark; used for points, streak, premium. | Wallet, rewards, nav balance. | Coin = points; never use it for VND amounts. |
| **The Watermark** | Large low-opacity coin/`đ` mark, clipped by the card edge. | Note, empty states, auth. | 4–8% opacity; never behind small text. |

### 5.6 Iconography

- Use **Lucide** (`lucide-react`) at 20/24px, stroke 1.75, `currentColor`. One icon per action; always pair with a label or `aria-label`.
- Replace all UI emoji (🎉 ⚠️ ✅ ❌ 📌 🔒 📈 📦 ⬜ 🔥 💬 🔄 ❤️ 📷 🔔) with icons. Emoji inside user posts/comments are user content and stay.
- Icon map: feed `Newspaper`, finance `WalletCards`, wallet `Coins`, explore `Compass`, profile `UserRound`, notifications `Bell`, notes `NotebookPen`, todos `ListChecks`, shop `Store`, invite `Gift`, premium `Sparkles`, admin `ShieldCheck`, search `Search`, more `Ellipsis`, add `Plus`, back `ArrowLeft`, trend `TrendingUp`, lock `Lock`, check `Check`, warning `TriangleAlert`, image `ImagePlus`, like `Heart`, comment `MessageCircle`, refresh `RefreshCw`, streak `Flame`, copy `Copy`, external `ArrowUpRight`.
- If `lucide-react` is rejected: create `src/components/ui/icon.tsx` with the same names and 24px paths; no per-page SVG strings.
- **Category icons are data.** `categories.icon` stores emoji (🍜 🚗 🧾 🎮 💰 📦). Do **not** migrate the schema/seed. Build `CategoryIcon` that maps known emoji to Lucide icons and falls back to `Tag` for unknown/custom values. This keeps the no-UI-emoji rule without touching data.

### 5.7 Motion

- **Coin flip** on balance change (existing `coin-flip`): 400ms, only when the number changes.
- **Thread shimmer**: 1.2s once on hover of the Note/premium; disabled for reduced motion.
- **Sheets/dialogs**: 180ms fade + 8px slide; **toasts**: 160ms.
- **Page load**: no fade-in on every section. One orchestrated hero reveal on `/` only (staggered 0/60/120ms).
- Respect `prefers-reduced-motion: reduce` globally.

### 5.8 Dark mode

- System preference only, via `@media (prefers-color-scheme: dark)` and token overrides. No `.dark` class, no toggle in this pass.
- Every component must use semantic tokens, never `bg-white`/`text-gray-*` directly.
- Dark paper is deep ink, not pure black; cards are `#12211C`; borders are `#2A3B34`.
- Test all 30 routes in both modes; screenshots at 360/768/1280.

### 5.9 Accessibility

- WCAG AA: body text ≥4.5:1; large text ≥3:1; coin on ink is fine; lotus small text uses lotus 700.
- Visible `focus-visible` ring on every interactive element (2px + offset).
- Touch targets ≥44px on mobile; bottom nav items 56px.
- No color-only status: pair with icon/text.
- Form fields always have a visible label or `aria-label`; errors use `aria-describedby`.
- Tables have `<caption>`/`scope`; mobile tables become stacked rows with labels.
- `prefers-reduced-motion` disables coin flip/shimmer/transitions.

---

## 6. Component kit

### 6.1 Primitives (new or extended)

| Component | API / variants | Notes |
|---|---|---|
| `Button` | `primary` (leaf), `secondary` (pale leaf), `outline`, `ghost`, `coin`, `destructive`, `link`; sizes `sm/md/lg/icon`; `loading`, `fullWidth`; `asChild` | Replace raw `bg-blue-600` buttons. Loading shows spinner + keeps width. |
| `Input` | default, `invalid`; optional leading/trailing icon; sizes `md/lg` | Always with `Label`/`Field`. |
| `Textarea` | auto-resize optional, `invalid` | Replaces raw textareas in composer/profile/admin. |
| `Select` | native select styled, or Radix Select | Replaces raw selects in finance/admin. |
| `Label`, `Field` | label + hint + error + required | One source of truth for form spacing. |
| `Checkbox` | Radix or native | Todos/admin. |
| `Card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`, `CardFooter`; `tone` default/paper/coin/lotus | `tone=paper` for the Note. No shadow. |
| `Badge` | `neutral`, `leaf`, `lotus`, `coin`, `premium`, `outline`; optional dot | Replaces inline pills. |
| `Avatar` | sizes `sm/md/lg/xl`; ring; fallback initials | Used in nav, feed, profile. |
| `Dialog` | responsive, close button, title/description, footer | Add animation + dark tokens. |
| `Sheet` | bottom sheet on mobile, side sheet on desktop | “Thêm”, filters, quick actions. |
| `Toast` | top-center mobile, bottom-right desktop; variants default/destructive/success | Never overlap bottom nav. |
| `Tabs` | underline or pill; controlled/uncontrolled | Notifications, finance, admin. |
| `Segmented` | 2–4 options | Wallet filters, finance month/type. |
| `Progress` | track + fill; tones leaf/coin/lotus | Budgets/goals. |
| `Skeleton` | text/card/row | Data-heavy pages. |
| `EmptyState` | icon/watermark + title + description + action | Every list page. |
| `Stat` | label, value, delta, tone | Finance/admin summary. |
| `PageHeader` | title, description, actions, back link, breadcrumb | Every page. |
| `Section` | title + action + content; optional divider | Page structure. |
| `Table` | responsive; `Table`, `THead`, `TR`, `TH`, `TD`; mobile stacked mode | Admin, ledger. |
| `Amount` | `value`, `currency` (`VND`/`POINTS`), `sign`, `size`, `tone` | Tabular nums; formats `vi-VN`; points use coin icon. |
| `Serial` | `value`, `label?` | Mono, truncated, copyable. |
| `Stamp` | `status`, `tone`, `rotate` | Voucher/premium. |
| `SecurityThread` | `orientation` | 2px gradient line. |
| `Guilloche` | `opacity`, `className` | SVG pattern; masked behind numbers. |
| `WatermarkCoin` | `size`, `opacity` | Decorative; aria-hidden. |
| `Coin` | `size`, `flip` | Gold coin with `đ`. |

### 6.2 Shell

**Desktop (`≥768px`)**
```
┌──────────────┬─────────────────────────────────────────────┐
│ MoneyApp     │  PageHeader (title, meta, actions)          │
│ [Note: bal]  │                                             │
│ ─────────    │  Page content (narrow/default/wide)         │
│ Bảng tin     │                                             │
│ Tài chính    │                                             │
│ Ví điểm      │                                             │
│ Khám phá     │                                             │
│ Hồ sơ        │                                             │
│ ─────────    │                                             │
│ Thông báo    │                                             │
│ Ghi chú      │                                             │
│ Việc cần làm │                                             │
│ Cửa hàng     │                                             │
│ Mời bạn      │                                             │
│ Premium      │                                             │
│ [Đăng xuất]  │                                             │
└──────────────┴─────────────────────────────────────────────┘
```
- Sidebar 240px, paper surface, 1px right border, thread on the left edge.
- Wordmark + small “VÍ CÁ NHÂN” micro-label (real section label, not decoration).
- Balance note compact: coin + points + streak; click → `/wallet`.
- Active item: leaf fill, paper text, left thread segment; focus ring.
- Notification bell in the sidebar header with unread count (mount `NotificationBadge`); search icon → `/explore`.
- Sign out at the bottom, quiet text button.

**Mobile (`<768px`)**
```
┌─────────────────────────────────────┐
│ MoneyApp      [search] [bell] [av]  │  top bar 56px
├─────────────────────────────────────┤
│                                     │
│  Page content                       │
│                                     │
├─────────────────────────────────────┤
│ Bảng tin  Tài chính  Ví  Khám phá  Thêm │  bottom nav 64px
└─────────────────────────────────────┘
```
- Top bar: wordmark, search, notification bell with count, avatar.
- Bottom nav: 4 main + “Thêm” sheet (Hồ sơ, Ghi chú, Việc cần làm, Cửa hàng, Mời bạn, Premium, Quản trị, Đăng xuất).
- Safe-area inset; active item leaf, icon + label; 56px height.
- “Thêm” is a `Sheet`, not a floating popover; closes on route change.

**Admin shell:** no second sidebar. Admin pages render inside the main shell with an admin tab bar (`Tổng quan`, `Người dùng`, `Bài đăng`, `Cửa hàng`) and `PageHeader` “Quản trị”. Tables use the `wide` container.

### 6.3 Page template

```
PageHeader:
  [back?] [title]                         [primary action]
  description / meta (date, count)

Section:
  [section title]                         [secondary action]
  content
```

- `PageHeader` is required on every page. No page starts with a bare `<h1>`.
- Primary action is one per page, right-aligned on desktop, full-width or sticky on mobile where appropriate.
- Filters/tabs sit directly under the header, above content.
- Empty states use `EmptyState` with one action; never a bare gray sentence.

---

## 7. Page-by-page design

### 7.1 Public / auth

| Route | Layout | Design |
|---|---|---|
| `/` landing | `wide`, full-bleed bands | Keep the existing hero but make the coin disc a **Note**: a polymer card with guilloche, thread, watermark coin, and a large `50` denomination (“50 điểm khi đăng ký”). Header: wordmark + login/register. Features become a 2×3 grid of `Card`s with icons, not a `dl` divider list. Dark CTA band uses ink + coin button. One orchestrated hero reveal. |
| `/login` | `narrow`, centered | Split card on desktop: left = brand panel (Note mini, thread, “Ví của bạn, có điểm thưởng.”), right = form. Mobile: brand mark + form. `Field` + `Input`, `Button fullWidth`. OTP step: 6 boxes? Keep the existing single input for E2E (`placeholder="000000"`) but style it as a large mono code field with a “Gửi lại mã” quiet action and a countdown. Error banner uses lotus. |
| `/register` | same as login | Display name + email, then OTP. Add the +50 điểm note in the brand panel. Referral cookie flow unchanged. |
| `/join` | no UI | Unchanged. |

### 7.2 Wallet / rewards (signature area)

| Route | Layout | Design |
|---|---|---|
| `/wallet` | `narrow` | **The Note** as hero: full-width polymer card, 16:9-ish, guilloche masked behind the balance, vertical security thread, watermark coin, serial `SỐ VÍ` (short user id), balance in points (`1.250 điểm`), streak chip, “Nạp điểm” + “Đổi quà” quick actions below. Then `Tabs`: Tất cả / Nhận / Chi / Nạp. Ledger rows: date group, icon, reason label, serial, amount (coin tone for +, lotus for -), running balance. Empty state: coin watermark + “Chưa có giao dịch. Nạp điểm hoặc đăng bài để bắt đầu.” |
| `/wallet/topup` | `narrow` | Header “Nạp điểm”, rate note “1.000đ = 1 điểm”. Preset amounts as a 2×3 grid of `Card` buttons with VND + points; selected state leaf border + check. Custom amount `Input`. Summary card with conversion and total. Primary “Thanh toán qua VNPay” (preserve text for E2E). VNPay disabled state with a clear note if credentials missing. |
| `/wallet/topup/return` | `narrow`, centered | Result state as a **Stamp** on a paper card: success = leaf “ĐÃ THANH TOÁN”, failure = lotus “CHƯA THANH TOÁN”. Amount + points, mock warning as a `Badge`, actions “Nạp lại” / “Về ví”. No giant emoji. |
| `/redeem` | `default` | Header with balance chip. Rewards as a 1/2-col grid of `Card`s: name, description, cost (coin), stock badge, `Button` “Đổi”. Empty state if no rewards. Confirmation dialog with cost + remaining balance. |
| `/billing/upgrade` | `narrow` | Premium card as a Note variant with thread + stamp. One real path: “Dùng 500 điểm” (coin button). The VNPay path becomes an honest secondary link “Nạp điểm để nâng cấp” → `/wallet/topup`; do not imply a 19.000đ subscription checkout. Current plan as a quiet `Badge`. Benefits list with check icons. Error banner lotus. |

### 7.3 Finance

| Route | Layout | Design |
|---|---|---|
| `/finance` | `default` | `PageHeader` “Tài chính” + month `Segmented`/`MonthPicker` + “Thêm giao dịch” primary. Summary: two `Stat` cards (Thu nhập leaf, Chi tiêu lotus) with large tabular numbers and a thin progress/ratio bar. Transaction ledger: grouped by date, icon in a paper square, category + note, amount right-aligned, serial. Mobile: rows stack; no horizontal scroll. Empty state with “Thêm giao dịch đầu tiên”. |
| `/finance/new` | `narrow` | Form card: type `Segmented` (Chi/Thu), amount `Input` with `đ` suffix and large mono numerals, category `Select` with icons, date, note `Textarea`. Sticky footer “Lưu giao dịch” on mobile. Validation inline. |
| `/finance/budgets` | `default` | Header + month picker. Budget cards: category icon/name, limit, spent, remaining, `Progress` (leaf <70%, coin 70–90%, lotus >90%), “Còn lại” amount. **Read-only restyle** — no “Thêm ngân sách” form in this pass. Empty state explains how budgets appear. |
| `/finance/goals` | `default` | Goal cards: name, target, current, `Progress`, deadline, achieved stamp. **Read-only restyle** — no “Thêm mục tiêu” form in this pass. Empty state. |
| `/finance/trends` | `wide` | Premium gate as a Note card with coin CTA. When premium: `PageHeader` + 6-month bar chart using token colors (leaf income, lotus expense), legend with dots, net savings `Stat`, month labels tabular. No hardcoded hex. |

### 7.4 Social

| Route | Layout | Design |
|---|---|---|
| `/feed` | `narrow` | Welcome banner as a slim paper strip with coin icon (not blue alert). Composer as a `Card`: avatar + textarea, image thumbnails, icon-only actions with labels, “Đăng” button. New-posts banner as a floating pill above the list. Post cards: paper `Card`, avatar + name + time, content, image grid (1/2/4 layout), action row with heart/comment icons and counts, comments collapsed with “Xem bình luận”. No emoji as icons. |
| `/explore` | `narrow` | `PageHeader` “Khám phá” + search field with icon. Tabs: Bài đăng / Người dùng. Results: user rows with avatar + name + @username + follow; post results as compact cards. Empty state “Không tìm thấy…” with query. Autocomplete dropdown uses `Card` + focus states. |
| `/profile` | `default` | Settings-style profile: `PageHeader` “Hồ sơ” + “Xem trang công khai” link. Identity card with large avatar (upload overlay), display name, @username, bio, stats (điểm, streak, ngày tham gia). Edit form in a `Card`: display name, bio, avatar; save bar. No feed here. |
| `/u/[username]` | `default` | Cover band in paper-deep with thread; avatar overlapping, name, @username, bio, stats row (điểm, streak, followers), follow button. If viewing yourself, show “Chỉnh sửa hồ sơ” instead of Follow. Tabs: Bài đăng (only existing data). Fix lookup: match `username` first, then `display_name`, so Explore links (`username ?? id`) resolve. Empty state. |
| `/notifications` | `narrow` | `PageHeader` + “Đánh dấu đã đọc”. Tabs as `Segmented` (Tất cả, Xã hội, Tài chính, Công việc, Shop). Rows: icon in a paper square, label, time, unread dot; unread background `--secondary`. Empty state. |

### 7.5 Productivity / referral

| Route | Layout | Design |
|---|---|---|
| `/notes` | `default` | **Read-only restyle** — no “Thêm ghi chú” form in this pass. Header + count. Note cards: title, 3-line clamp, pinned `Badge` with pin icon, updated time. Masonry-ish 2-col on desktop; 1-col mobile. Empty state. |
| `/todos` | `default` | **Read-only restyle** — no create/toggle UI in this pass. Header + count. Active rows with status icon, title, due date. Done section collapsed. Empty state. |
| `/invite` | `narrow` | Hero card: “Mời bạn, cả hai nhận điểm”, referral code in a mono `Serial` with copy button, share actions. Stats `Stat` row (invited, completed, points). Leaderboard as a ranked list with avatars, not bordered rows; top 3 get coin/silver/bronze? Use coin tone only for #1 to avoid gamified noise. Empty state. |

### 7.6 Shop

| Route | Layout | Design |
|---|---|---|
| `/shop` | `default` | `PageHeader` “Cửa hàng” + “Đơn của tôi”. Product grid 2-col desktop / 1-col mobile: image (16:10), partner, title, price in points (coin) and/or VND, stock/active badge. Card hover: border leaf + slight lift (no shadow). Empty state. |
| `/shop/[id]` | `narrow` | Image hero, partner, title, description, price card with points/VND, “Mua bằng điểm” (preserve text) or VNPay note. Confirmation dialog with balance after purchase. Error states lotus. |
| `/shop/orders` | `narrow` | Order cards: product, date, status badge, amount, “Xem mã” reveal button; revealed code in a mono `Serial` with copy. Empty state. |

### 7.7 Admin

| Route | Layout | Design |
|---|---|---|
| `/admin` | `wide` | `PageHeader` “Quản trị” + admin tabs. 5 `Stat` cards in a responsive grid (2/3/5). Recent payments table: compact ledger, status badges, amounts tabular. Empty state. |
| `/admin/users` | `wide` | Search/filter row, table with avatar/name/@username/role/points/status/actions. Mobile: stacked cards. Lock/unlock as a `Dialog` confirm. No emoji status. |
| `/admin/posts` | `wide` | Moderation list: author, content excerpt, image count, hidden state, actions “Ẩn”/“Hiện” with confirm. Empty state. |
| `/admin/shop` | `wide` | Tabs: Partners / Products / Codes / Orders. Each tab: `PageHeader` + table + “Thêm” button opening a `Dialog`/`Sheet` form. Bulk code import as a `Textarea` with a clear “Mỗi dòng một mã” hint. All copy Vietnamese. No double padding. |

### 7.8 System

| Route | Design |
|---|---|
| `error.tsx` | Paper card, lotus stamp, “Có lỗi xảy ra”, description, “Thử lại” + “Về trang chủ”. |
| `not-found.tsx` | Watermark coin, “Không tìm thấy trang”, “Về trang chủ”. |
| `loading.tsx` (new) | Skeleton page template for `feed`, `finance`, `wallet`, `shop`, `admin` (route-level `loading.tsx`). |

### 7.9 Dev island

- `/mock/vnpay` keeps its VNPay blue/white identity. Do not apply polymer tokens inside the mock card; only the surrounding page may use paper.

---

## 8. Copy and content

**Terms**
- Points: **điểm** (not `đ`). Currency: **đ** (VND). Never mix in one number.
- “Ví điểm” for the points wallet; “Nạp điểm” for top-up; “Đổi quà” for redeem; “Cửa hàng” for shop; “Mời bạn” for invite; “Premium” stays English.
- “Bảng tin” for feed; “Khám phá” for explore; “Hồ sơ” for profile; “Tài chính” for finance.

**Buttons** say exactly what happens: “Lưu giao dịch”, “Đăng bài”, “Mua bằng điểm”, “Đổi quà”, “Sao chép mã”, “Đánh dấu đã đọc”. Avoid “Submit”, “OK”, “Xác nhận” when a specific verb is possible.

**Empty states** invite action: “Chưa có giao dịch tháng này. Thêm giao dịch đầu tiên để bắt đầu.” / “Chưa có bài đăng. Theo dõi vài người hoặc đăng bài đầu tiên.”

**Errors** are specific and actionable: “Số dư không đủ. Bạn cần thêm 120 điểm.” not “Đã xảy ra lỗi.”

**Tone:** plain, warm, confident. No exclamation marks in system messages; no emoji in UI chrome.

---

## 9. Implementation phases

Each phase is shippable and must keep the build/tests green.

**Phase 0 — Foundation (highest leverage)**
- Extend `globals.css`: semantic tokens, dark overrides, radius/shadow/container tokens, base layer (`border-color`, focus-visible, selection, heading defaults), remove `zinc/amber/yellow` usage in new code.
- Build `src/components/ui/` primitives: Button variants, Input/Textarea/Select/Label/Field, Card, Badge, Avatar sizes, Dialog, Sheet, Toast, Tabs, Segmented, Progress, Skeleton, EmptyState, Stat, PageHeader, Section, Table, Amount, Serial, Stamp, SecurityThread, Guilloche, WatermarkCoin, Coin.
- Add `lucide-react` (if approved) and an icon map.
- Acceptance: a `/design` playground page (dev-only) renders every primitive in light/dark at 360/768/1280; build passes.

**Phase 1 — Shell + public/auth**
- Redesign `AppNav` (desktop sidebar + mobile top bar/bottom nav + more sheet + notification badge + search).
- Remove admin double sidebar; add admin tabs.
- Redesign `/`, `/login`, `/register`, `error`, `not-found`, route `loading.tsx`.
- Acceptance: nav active states, focus rings, safe-area, no overlap with toast; auth E2E still passes.

**Phase 2 — Wallet + rewards**
- `/wallet`, `/wallet/topup`, `/wallet/topup/return`, `/redeem`, `/billing/upgrade`.
- Build the Note, Serial, Stamp, SecurityThread, Guilloche, Coin components.
- Acceptance: balance `data-testid="balance"` preserved; top-up preset text “50.000” preserved; VNPay button text preserved; light/dark screenshots.

**Phase 3 — Finance**
- `/finance`, `/finance/new`, `/finance/budgets`, `/finance/goals`, `/finance/trends`.
- Build `Stat`, `Progress`, `Table`/ledger rows, `Amount`, `MonthPicker` (styled).
- Acceptance: no hardcoded chart hex; mobile rows stack; premium gate works.

**Phase 4 — Social**
- `/feed`, `/explore`, `/u/[username]`, `/notifications`, feed components (composer, post card, comments, like, banners).
- Replace emoji icons with Lucide; preserve `data-testid` on follow/like if present.
- Acceptance: infinite scroll, optimistic like, realtime banner still work; no layout shift.

**Phase 5 — Productivity + referral**
- `/notes`, `/todos`, `/invite`, referral components.
- Acceptance: `data-testid="referral-code"` and `referral-total` preserved; leaderboard responsive.

**Phase 6 — Shop + billing**
- `/shop`, `/shop/[id]`, `/shop/orders`, `RevealCodeButton`.
- Acceptance: `a[href^="/shop/"]`, “Mua bằng”, “Thanh toán qua VNPay” preserved; voucher code mono/copy.

**Phase 7 — Admin**
- `/admin`, `/admin/users`, `/admin/posts`, `/admin/shop`.
- Remove double padding/sidebar; responsive tables; Vietnamese copy; dialogs for destructive actions.
- Acceptance: lock/unlock, hide/show, partner/product/code/order forms still work.

**Phase 8 — QA + polish**
- Screenshot matrix (360/768/1280, light/dark), contrast audit, reduced-motion audit, keyboard tab-through, build, unit, E2E.
- Remove temporary legacy color remaps only when no page uses them.
- Update `CLAUDE.md`/`docs/APP-REFERENCE.md` with the design system and component map.

---

## 10. File map (expected)

```
src/app/globals.css                         — tokens, base layer, motifs
src/components/ui/                          — primitives + kit
src/components/ui/icon.tsx                  — only if lucide rejected
src/components/AppNav.tsx                   — shell
src/components/AdminTabs.tsx                — admin sub-nav
src/components/patterns/Note.tsx            — wallet/landing note
src/components/patterns/SecurityThread.tsx
src/components/patterns/Guilloche.tsx
src/components/patterns/Stamp.tsx
src/components/patterns/EmptyState.tsx
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/feed/page.tsx + features/feed/components/*
src/app/finance/** + features/finance/components/*
src/app/wallet/** + features/wallet/components/*
src/app/shop/** 
src/app/notes/page.tsx
src/app/todos/page.tsx
src/app/invite/page.tsx + features/referral/components/*
src/app/admin/** + admin actions (markup only)
src/app/error.tsx, not-found.tsx, loading.tsx
```

---

## 11. Testing and acceptance

**Must preserve (or update tests in the same change)**
- `data-testid="balance"` on the wallet balance.
- `data-testid="referral-code"`, `data-testid="referral-total"`.
- `input[placeholder="000000"]` for OTP.
- `button:has-text("50.000")` on top-up presets.
- `"Thanh toán qua VNPay"` on top-up.
- `"Thanh toán (Mock)"` on the mock VNPay page.
- `"Mua bằng"` on shop detail.
- `a[href^="/shop/"]` on shop cards.
- Auth flow: register → OTP → redirect; login → OTP → redirect.

**Commands**
- `npx tsc --noEmit`
- `npm run build`
- `npm run test:unit` (40 tests)
- `npm run test:e2e` (requires local Supabase/Inbucket; if unavailable, state it and run the subset that does not need email)
- `npm run lint`

**Visual acceptance**
- Every route has `PageHeader` and consistent container/padding.
- No `text-muted-foreground`/`border-primary`/`bg-primary/10` undefined tokens.
- No `zinc/amber/yellow` in new code; no `bg-white` cards in dark mode.
- No UI emoji in chrome; icons paired with labels.
- Light/dark screenshots at 360/768/1280 for: `/`, `/login`, `/feed`, `/wallet`, `/finance`, `/shop`, `/admin`.
- Keyboard: tab through nav, forms, dialogs; focus visible.
- Reduced motion: no coin flip/shimmer; sheets still usable.

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Scope creep across 30 routes | Phase order above; ship per phase; no backend changes. |
| Polymer becomes kitsch | Motif rules §5.5; one Note per screen; guilloche never behind text. |
| Dark mode breaks legacy pages | Tokens first; migrate page-by-page; screenshot matrix. |
| E2E selectors break | Preserve list §11; run E2E after each phase. |
| Component churn | Build the kit in Phase 0 and reuse; no per-page one-offs. |
| Performance | CSS/SVG motifs only; no raster textures; no per-card animation. |
| Admin regressions | Keep actions/RPC calls untouched; markup-only changes; test forms manually. |

---

## 13. Open decisions (builder may settle)

### Builder calls (settled)
- **`/profile` is its own settings-style page**, not a duplicate of `/u/[username]`. The public profile is `/u/[username]`; viewing yourself there shows “Chỉnh sửa hồ sơ”.
- **Category emoji:** map known emoji to Lucide via `CategoryIcon`; unknown/custom → `Tag`. No data migration.
- **Read-only queries/params are allowed** where a designed control needs them (notification count, month filter, admin search, follower counts). No new mutations/RPCs/schema/payment flows.
- **`/u/[username]` lookup:** match `username` first, then `display_name`; fix it in Phase 4 so Explore links resolve. This is a read-only query fix, not a data change.
- **`lucide-react` vs local icon set:** recommend Lucide; if the repo must stay dependency-light, build `icon.tsx` with the same names.
- **Route-level `loading.tsx` coverage:** start with feed/finance/wallet/shop/admin; add more only if cheap.
- **Admin tabs vs a collapsible “Quản trị” group:** tabs recommended (no second sidebar).
- **Legacy `blue/green/red/gray` remap:** keep during migration; remove only when no page depends on it.

### Product-owner decisions (answered)
- **Create/edit affordances:** only restyle the current read-only screens. Do not add forms/dialogs/toggles for budgets, savings goals, notes, or todos in this pass. (Option R.)
- **Premium second CTA:** keep an honest link to top-up with copy “Nạp điểm để nâng cấp”; do not imply a 19.000đ subscription checkout. (Option A.)

### 13.1 Create/edit scope — resolved
The server actions exist, but they are **not** wired to new UI in this pass. `/finance/budgets`, `/finance/goals`, `/notes`, and `/todos` are restyled as read-only. A later feature pass can add forms, validation, free-limit handling, optimistic state, and tests.

### 13.2 Premium second CTA — resolved
`/billing/upgrade` keeps one real path (“Dùng 500 điểm”) and one honest secondary link (“Nạp điểm để nâng cấp” → `/wallet/topup`). No subscription checkout is built in this pass; the VNPay link must not promise a 19.000đ subscription.
