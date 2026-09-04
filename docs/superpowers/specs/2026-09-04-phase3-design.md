# Phase 3 Design — Admin, Referral, Notifications, Shop Marketplace

**Date:** 2026-09-04  
**Branch:** main  
**Depends on:** Phase 2 complete (commit `34ccd93`+)

---

## 0. Audit kết quả (Sprint 0)

Đọc trực tiếp source trước khi viết spec — tất cả đều xác nhận OK:

| Điểm cần audit | Kết quả |
|---|---|
| `08a` triggers có `SECURITY DEFINER` | ✅ confirmed |
| `add_points` REVOKED khỏi `authenticated`/`anon` | ✅ `schema.sql:433` |
| `complete_referral` REVOKED | ✅ `schema.sql:434` |
| `add_points` signature `(uuid, integer, text, uuid default null)` | ✅ khớp brief |
| Constraint `points_ledger_reason_code_check` | ✅ tên thật khớp |
| Constraint `notifications_type_check` | ✅ tên thật khớp; hiện có `todo`, thêm `shop` |
| `database.ts` | tồn tại ở `src/lib/types/database.ts`; regen sau migration cuối |

**Phát hiện quan trọng:** `getOrCreateReferralCode()` hiện tính SHA-256(user.id).slice(0,8) — không lưu vào DB. Sau migration 10 thêm cột `profiles.referral_code`, action này phải đọc từ cột DB thay vì tính lại mỗi lần.

---

## 1. Nguyên tắc bất biến (kế thừa Phase 1-2)

1. RLS + GRANT tường minh — bật RLS chưa đủ, phải `GRANT SELECT/INSERT/...` cho `authenticated`/`anon`
2. Hàm nhận `user_id` làm tham số không tự kiểm tra `auth.uid()` → chỉ dùng nội bộ / service_role
3. `points_ledger` append-only — mọi thay đổi điểm qua `add_points`
4. Trigger sửa dữ liệu không thuộc owner: `SECURITY DEFINER SET search_path = public`
5. Mã kho hàng: KHÔNG `GRANT` bảng `shop_product_codes` cho client — chỉ qua `get_my_order_code()`
6. Quyền admin: kiểm tra `role='admin'` ở Server Action trước; RLS là lớp thứ hai

---

## 2. Database migrations

### Migration 10 — `sql/migrations/10-phase3-admin-referral.sql`

Thêm vào `profiles`: `role text default 'user' check (role in ('user','admin'))`, `locked boolean default false`, `referral_code text unique`  
Thêm vào `posts`: `hidden boolean default false`  
Thêm vào `payments.payment_type` CHECK: thêm `'shop_purchase'`  

Tạo mới:
- Trigger `generate_referral_code()` SECURITY DEFINER (BEFORE INSERT trên profiles)
- Backfill `referral_code` cho user hiện có
- `notifications_type_check` mở rộng thêm `'shop'`
- `is_admin()` SECURITY DEFINER — bắt buộc tách ra để tránh RLS infinite recursion trên bảng profiles
- 6 admin RLS policies (select all profiles/posts/payments/subscriptions, update lock/hidden)
- `get_referrer_by_code(p_code text) → uuid` SECURITY DEFINER, GRANT to authenticated/anon

### Migration 11 — `sql/migrations/11-phase3-shop-marketplace.sql`

Thêm `'shop_purchase_points'` vào `points_ledger_reason_code_check`  

Bảng mới:
- `shop_partners` (id, name, logo_url, active)
- `shop_products` (id, partner_id, title, description, image_url, price_points?, price_vnd?, active) — check ít nhất 1 giá non-null
- `shop_product_codes` (id, product_id, code, assigned_order_id?) — **REVOKE ALL từ authenticated/anon**
- `shop_orders` (id, user_id, product_id, code_id, payment_method, amount_points?, amount_vnd?, status)

Hàm mới:
- `purchase_product_with_points(p_product_id uuid) → uuid` SECURITY DEFINER — SKIP LOCKED, gọi add_points, insert shop_orders, cập nhật assigned_order_id
- `get_my_order_code(p_order_id uuid) → text` SECURITY DEFINER — chỉ trả mã nếu `so.user_id = auth.uid()`

RLS: `shop_partners`/`shop_products` select public active; `shop_orders` select own; admin ALL trên cả 4 bảng  
GRANT: `shop_partners`, `shop_products` → authenticated + anon; `shop_orders` → authenticated

### Migration 12 — `sql/migrations/12-complete-payment-shop.sql`

Mở rộng `complete_payment()` thêm nhánh `payment_type = 'shop_purchase'`:
- Đọc `product_id` từ metadata (cột `metadata jsonb` sẽ cần thêm vào `payments` nếu chưa có — kiểm tra schema.sql)
- SKIP LOCKED chọn mã → insert `shop_orders` với `payment_method='vnpay'` → gán `code_id`
- Không gọi `add_points` (mua bằng tiền)
- Giữ nguyên tính atomic trong 1 transaction

---

## 3. Server Actions

```
src/features/admin/actions/
  dashboard.actions.ts    getRevenueSummary(range), listRecentPayments(), listUsers()
  moderation.actions.ts   lockUser(id), unlockUser(id), hidePost(id), unhidePost(id)
  shop.actions.ts         listPartners(), upsertPartner(), listProducts(), upsertProduct(),
                          bulkImportCodes(productId, codes[])
  — TẤT CẢ đều kiểm tra role='admin' đầu tiên, trước bất kỳ query nào

src/features/referral/actions/
  join.actions.ts         resolveReferralCode(code) → referrer_id (gọi get_referrer_by_code)
  (sửa) referral.actions.ts  getOrCreateReferralCode() → đọc profiles.referral_code thay vì tính SHA-256
  (sửa) registration flow     đọc cookie 'ref_code', tạo bản ghi referrals(status='pending') với đúng referrer_id

src/features/notifications/
  (sửa) actions           thêm markAllRead()

src/features/shop/actions/
  shop.actions.ts         listProducts(), getProduct(id),
                          purchaseWithPoints(productId) → gọi RPC purchase_product_with_points,
                          listMyOrders(), getOrderCode(orderId) → gọi RPC get_my_order_code
```

---

## 4. Routes

```
src/app/
  admin/
    layout.tsx            kiểm tra role='admin' → redirect /feed nếu không phải admin
    page.tsx              revenue dashboard (2 luồng: topup points + subscription VNPay)
    users/page.tsx        danh sách users, lock/unlock
    posts/page.tsx        danh sách posts, hide/unhide
    shop/page.tsx         quản lý partners/products, bulk import codes
  join/
    page.tsx              nhận ?ref=CODE → set cookie 'ref_code' (7 ngày) → redirect /register
  shop/
    page.tsx              danh sách sản phẩm active
    [id]/page.tsx         chi tiết sản phẩm + nút mua (points hoặc VNPay)
    orders/page.tsx       đơn hàng của tôi + nút "Xem mã"
  notifications/
    (sửa) page.tsx        thêm tab lọc theo type (tất cả / tài chính / xã hội / shop)
```

---

## 5. Middleware

Sửa `src/middleware.ts` — thêm vào sau auth check:
```ts
// Admin route protection
if (pathname.startsWith('/admin')) {
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/feed', request.url))
  }
}
// Public routes thêm: /join, /shop (xem không cần login)
```

`/join` là public (người chưa đăng nhập cũng cần truy cập).  
`/shop` cho phép xem không đăng nhập; mua hàng check trong action.

---

## 6. Thứ tự triển khai

| Task | Mô tả |
|------|-------|
| T-P3-01 | Migration 10 + cập nhật migrate.sh |
| T-P3-02 | Middleware admin route guard + `/admin` layout |
| T-P3-03 | Admin dashboard actions + page (doanh thu) |
| T-P3-04 | Admin users/posts moderation actions + pages |
| T-P3-05 | `/join` page + sửa referral.actions.ts (đọc từ DB) + update registration flow |
| T-P3-06 | Notifications: filter tab + markAllRead |
| T-P3-07 | Migration 11 (shop schema) + migrate.sh |
| T-P3-08 | Migration 12 (complete_payment shop) + migrate.sh |
| T-P3-09 | Shop Server Actions + `/shop`, `/shop/[id]`, `/shop/orders` |
| T-P3-10 | Admin shop management page + bulkImportCodes |
| T-P3-11 | Regen database.ts + checklist audit SQL (mục 8 trong brief) |

---

## 7. Checklist kiểm tra sau migration (từ brief mục 8)

```sql
-- Migration 10
select column_name from information_schema.columns
  where table_name='profiles' and column_name in ('role','locked','referral_code');  -- 3 dòng
select has_function_privilege('authenticated','public.is_admin()','execute');         -- true

-- Migration 11
select has_function_privilege('authenticated','public.purchase_product_with_points(uuid)','execute'); -- true
select has_function_privilege('authenticated','public.get_my_order_code(uuid)','execute');            -- true
select has_table_privilege('authenticated','public.shop_product_codes','select');                     -- false

-- Audit Phase 1-2 vẫn đúng
select has_function_privilege('authenticated','public.add_points(uuid,integer,text,uuid)','execute'); -- false
select has_function_privilege('authenticated','public.complete_referral(uuid)','execute');            -- false
```
