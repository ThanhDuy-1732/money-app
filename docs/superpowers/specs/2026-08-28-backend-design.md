# Backend Design — money-app Phase 1

**Date:** 2026-08-28  
**Status:** Approved

---

## Tổng quan

Backend là Supabase thuần — không có server riêng. Tất cả logic nghiệp vụ nằm trong:
1. `schema.sql` — bảng, RLS, functions `add_points` / `redeem_reward` / `complete_referral` (đã có)
2. **Database triggers** — các điểm thưởng tự động (cần viết thêm)
3. **Edge Function** — webhook thanh toán (Sprint 5)
4. **Storage policies** — kiểm soát upload

Local dev chạy qua Docker Compose (`docker-compose.yml`). Production dùng Supabase Cloud.

---

## Những gì đã có trong schema.sql

- 11 bảng: `profiles`, `posts`, `follows`, `likes`, `comments`, `points_ledger`, `referrals`, `rewards`, `redemptions`, `notifications`, `payments`
- RLS đầy đủ cho tất cả bảng
- Indexes tối ưu cho feed, notifications, ledger
- Functions: `add_points` (race-condition-safe), `redeem_reward` (client-callable), `complete_referral` (idempotent)
- `points_ledger` append-only (trigger chặn UPDATE/DELETE)
- Seed: 2 rewards mẫu

---

## Triggers cần viết thêm (chạy trong SQL Editor sau schema.sql)

### T1 — Signup bonus

```sql
CREATE OR REPLACE FUNCTION public.handle_signup_bonus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.add_points(NEW.id, 50, 'signup', NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_signup_bonus
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_signup_bonus();
```

### T2 — Profile complete bonus

Điều kiện: `avatar_url` và `bio` vừa đủ điều kiện lần đầu (check ledger để idempotent).

```sql
CREATE OR REPLACE FUNCTION public.handle_profile_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Chỉ trigger khi avatar và bio vừa được điền, chưa từng nhận bonus này
  IF (NEW.avatar_url IS NOT NULL AND NEW.bio IS NOT NULL)
     AND (OLD.avatar_url IS NULL OR OLD.bio IS NULL) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.points_ledger
      WHERE user_id = NEW.id AND reason_code = 'profile_complete'
    ) THEN
      PERFORM public.add_points(NEW.id, 20, 'profile_complete', NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_complete
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_complete();
```

### T3 — Post bonus + complete_referral

```sql
CREATE OR REPLACE FUNCTION public.handle_post_bonus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_posts_today integer;
  v_total_posts integer;
BEGIN
  -- Đếm bài đăng hôm nay (chưa xóa)
  SELECT COUNT(*) INTO v_posts_today
  FROM public.posts
  WHERE user_id = NEW.user_id
    AND deleted_at IS NULL
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- Cộng điểm nếu <= 3 bài/ngày
  IF v_posts_today <= 3 THEN
    PERFORM public.add_points(NEW.user_id, 10, 'post', NEW.id);
  END IF;

  -- Nếu là bài đầu tiên all-time → complete_referral
  SELECT COUNT(*) INTO v_total_posts
  FROM public.posts
  WHERE user_id = NEW.user_id AND deleted_at IS NULL;

  IF v_total_posts = 1 THEN
    PERFORM public.complete_referral(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_bonus
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.handle_post_bonus();
```

### T4 — Daily login streak

Frontend gọi `UPDATE profiles SET last_login_date = today` → trigger này xử lý streak và điểm.

**Hằng số streak:**
- Điểm cố định hàng ngày: **5đ**
- Mốc milestone: **7, 14, 30, 60, 100 ngày**
- Thưởng ngẫu nhiên tại milestone: **10–100đ** (`floor(random() * 91 + 10)`)

```sql
CREATE OR REPLACE FUNCTION public.handle_login_streak()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_milestone_days integer[] := ARRAY[7, 14, 30, 60, 100];
  v_bonus integer;
BEGIN
  -- Chỉ xử lý khi last_login_date thực sự thay đổi
  IF NEW.last_login_date IS NOT DISTINCT FROM OLD.last_login_date THEN
    RETURN NEW;
  END IF;

  -- Đã đăng nhập hôm nay rồi → skip
  IF OLD.last_login_date = CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  IF OLD.last_login_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Streak tiếp tục
    NEW.streak_count := OLD.streak_count + 1;
  ELSE
    -- Bỏ ngày → reset
    NEW.streak_count := 1;
  END IF;

  -- Cộng điểm cố định hàng ngày
  PERFORM public.add_points(NEW.id, 5, 'streak', NULL);

  -- Bonus ngẫu nhiên tại mốc milestone
  IF NEW.streak_count = ANY(v_milestone_days) THEN
    v_bonus := floor(random() * 91 + 10)::integer; -- 10–100đ
    PERFORM public.add_points(NEW.id, v_bonus, 'streak', NULL);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_login_streak
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_login_streak();
```

**Lưu ý:** Trigger này là `BEFORE UPDATE` để có thể ghi `NEW.streak_count` trực tiếp.

---

## Storage Buckets & Policies

Tạo 2 bucket trong Supabase Dashboard → Storage:

| Bucket | Public | Max size |
|--------|--------|---------|
| `avatars` | Có | 5MB/file |
| `post-images` | Có | 10MB/file, 4 file/bài |

**Policies (chạy trong SQL Editor):**

```sql
-- avatars: chỉ upload vào folder {user_id}/ của chính mình
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- post-images: tương tự
CREATE POLICY "post_images_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

Giới hạn size enforce phía client trước khi upload (không chờ server reject).

---

## Edge Function: payment-webhook (Sprint 5)

**Tạo:**
```bash
npx supabase functions new payment-webhook
npx supabase secrets set PAYOS_CHECKSUM_KEY=xxx VNPAY_HASH_SECRET=xxx
```

**Logic (`supabase/functions/payment-webhook/index.ts`):**

```
POST /functions/v1/payment-webhook
  1. Parse body → xác định gateway từ header hoặc body (payos / vnpay / momo)
  2. Verify checksum theo từng gateway
     - payOS: HMAC-SHA256 với PAYOS_CHECKSUM_KEY
     - VNPay: HMAC-SHA512 với VNPAY_HASH_SECRET
  3. Nếu checksum sai → return 400 (chặn replay attack)
  4. Nếu status thành công:
     a. UPDATE payments SET status = 'succeeded' WHERE gateway_txn_id = ?
     b. Tính điểm: amount_vnd / 1000 * POINTS_PER_1000_VND (mặc định = 1)
     c. add_points(user_id, delta, 'adjustment', payment_id)
  5. Return 200
```

Edge Function chạy với `service_role` → được phép gọi `add_points` (đã revoke với authenticated users).

**Hằng số:**
```ts
const POINTS_PER_1000_VND = 1 // ponytail: thay đổi tỉ lệ này khi có quyết định business
```

**Deploy:**
```bash
npx supabase functions deploy payment-webhook
```
Sau đó cấu hình URL callback trong dashboard payOS/VNPay/MoMo.

---

## Authentication config (Supabase Dashboard)

| Provider | Cấu hình |
|----------|---------|
| Email | OTP mode (magic code 6 số), không phải magic link |
| Google | OAuth Client ID/Secret từ Google Cloud Console; redirect URI = `{SUPABASE_URL}/auth/v1/callback` |
| Phone | Để sau (cần Twilio/MessageBird, có phí) |

URL Configuration: `Site URL` và `Redirect URLs` khớp với `NEXT_PUBLIC_SITE_URL`.

---

## Security checklist

- `add_points` và `complete_referral`: REVOKE EXECUTE với `authenticated` (đã có trong schema.sql)
- `redeem_reward`: GRANT EXECUTE với `authenticated`, tự kiểm tra `auth.uid()` bên trong
- `service_role` key: chỉ dùng trong Edge Function, không commit, không dùng ở frontend
- `points_ledger`: append-only (trigger chặn UPDATE/DELETE ở tầng DB)
- Storage: upload chỉ vào folder `{user_id}/` của chính mình

---

## Thứ tự chạy (lần đầu setup)

1. Chạy `docker compose up -d` (local) hoặc tạo Supabase project (production)
2. Chạy `docs/requirement/schema.sql` trong SQL Editor
3. Xác nhận: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
4. Chạy 4 triggers SQL ở phần trên (T1–T4) trong SQL Editor
5. Tạo 2 Storage bucket + policies
6. Cấu hình Auth providers
7. Gen types: `npx supabase gen types typescript ...`

---

## TODO trước từng sprint

| Trước Sprint | Việc cần làm |
|-------------|-------------|
| Sprint 1 | T1 (signup), T2 (profile_complete), cấu hình Auth providers |
| Sprint 2 | T3 (post bonus) |
| Sprint 3 | T4 (streak) — login streak cần frontend gọi update |
| Sprint 5 | Edge Function payment-webhook, tạo bucket + policies |
