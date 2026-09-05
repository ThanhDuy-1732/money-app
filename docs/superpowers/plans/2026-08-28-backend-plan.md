# Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thiết lập toàn bộ backend Supabase cho money-app Phase 1: triggers tự động cộng điểm, Storage buckets, Auth providers, và Edge Function thanh toán.

**Architecture:** Supabase làm backend thuần — Postgres với RLS + triggers cho business logic; Edge Function chạy với service_role cho webhook thanh toán. Không có server riêng. `schema.sql` đã có sẵn (bảng, RLS, functions); plan này thêm vào phần còn thiếu theo thứ tự sprint.

**Tech Stack:** PostgreSQL 15, Supabase Auth (GoTrue), Supabase Storage, Supabase Edge Functions (Deno/TypeScript)

**Spec:** `docs/superpowers/specs/2026-08-28-backend-design.md`

## Global Constraints

- Tất cả SQL chạy trong Supabase SQL Editor theo đúng thứ tự (sau `schema.sql`)
- Functions dùng `SECURITY DEFINER` + `SET search_path = public` để tránh search path injection
- `add_points` và `complete_referral` đã bị REVOKE với `authenticated` — chỉ gọi từ triggers/Edge Function
- `points_ledger` là append-only — không bao giờ UPDATE/DELETE
- Tỉ lệ điểm thưởng cố định: signup=50, profile_complete=20, post=10 (tối đa 3/ngày), streak=5/ngày, milestone=random(10-100)
- Milestone streak: 7, 14, 30, 60, 100 ngày
- Storage: avatars ≤ 5MB, post-images ≤ 10MB, tối đa 4 ảnh/bài

---

## File Structure

```
docs/requirement/
  schema.sql                          # đã có — chạy trước tất cả
supabase/
  functions/
    payment-webhook/
      index.ts                        # Edge Function webhook thanh toán
      deno.json                       # Deno config
sql/
  triggers/
    01-signup-bonus.sql               # T1
    02-profile-complete.sql           # T2
    03-post-bonus.sql                 # T3
    04-login-streak.sql               # T4
  storage/
    05-storage-policies.sql           # bucket policies
```

---

### Task 1: Trigger T1 — Signup Bonus

**Sprint:** 0 (chạy ngay sau schema.sql)

**Files:**
- Create: `sql/triggers/01-signup-bonus.sql`

**Interfaces:**
- Consumes: `public.add_points(uuid, integer, text, uuid)` từ schema.sql
- Produces: trigger `trg_signup_bonus` trên `public.profiles`

- [ ] **Step 1: Viết file SQL**

```sql
-- sql/triggers/01-signup-bonus.sql
-- Trigger cộng 50 điểm khi user tạo profile lần đầu

CREATE OR REPLACE FUNCTION public.handle_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_points(NEW.id, 50, 'signup', NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_signup_bonus
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_signup_bonus();
```

- [ ] **Step 2: Chạy trong Supabase SQL Editor**

Copy nội dung `sql/triggers/01-signup-bonus.sql` → paste vào SQL Editor → Run.

- [ ] **Step 3: Xác nhận trigger tồn tại**

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trg_signup_bonus';
-- Phải thấy 1 dòng
```

- [ ] **Step 4: Test trigger bằng cách insert profile mẫu**

```sql
-- Tạo user giả trong auth.users trước (chỉ test môi trường local)
-- Sau đó kiểm tra points_ledger
SELECT * FROM public.points_ledger
ORDER BY created_at DESC LIMIT 5;
-- Phải thấy 1 dòng với reason_code = 'signup', delta = 50
```

- [ ] **Step 5: Commit**

```bash
git add sql/triggers/01-signup-bonus.sql
git commit -m "feat(backend): add signup bonus trigger (50pts)"
```

---

### Task 2: Trigger T2 — Profile Complete Bonus

**Sprint:** 1 (trước khi dựng màn hình edit profile)

**Files:**
- Create: `sql/triggers/02-profile-complete.sql`

**Interfaces:**
- Consumes: `public.add_points`, `public.points_ledger`
- Produces: trigger `trg_profile_complete` trên `public.profiles`

- [ ] **Step 1: Viết file SQL**

```sql
-- sql/triggers/02-profile-complete.sql
-- Cộng 20 điểm khi avatar_url VÀ bio được điền lần đầu tiên
-- Idempotent: check points_ledger để không cộng hai lần

CREATE OR REPLACE FUNCTION public.handle_profile_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chỉ trigger khi cả avatar và bio vừa đủ điều kiện
  IF (NEW.avatar_url IS NOT NULL AND NEW.bio IS NOT NULL)
     AND (OLD.avatar_url IS NULL OR OLD.bio IS NULL) THEN

    -- Idempotent: chỉ thưởng 1 lần duy nhất
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

- [ ] **Step 2: Chạy trong Supabase SQL Editor**

- [ ] **Step 3: Xác nhận**

```sql
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trg_profile_complete';
```

- [ ] **Step 4: Test idempotency**

```sql
-- Update profile với avatar + bio → phải thấy 1 dòng 'profile_complete'
-- Update lại lần 2 → vẫn chỉ 1 dòng (không duplicate)
SELECT COUNT(*) FROM public.points_ledger
WHERE user_id = '<test_user_id>' AND reason_code = 'profile_complete';
-- Phải là 1, không phải 2
```

- [ ] **Step 5: Commit**

```bash
git add sql/triggers/02-profile-complete.sql
git commit -m "feat(backend): add profile complete bonus trigger (20pts)"
```

---

### Task 3: Trigger T3 — Post Bonus + Complete Referral

**Sprint:** 2 (trước khi dựng PostComposer)

**Files:**
- Create: `sql/triggers/03-post-bonus.sql`

**Interfaces:**
- Consumes: `public.add_points`, `public.complete_referral`, `public.posts`
- Produces: trigger `trg_post_bonus` trên `public.posts`

- [ ] **Step 1: Viết file SQL**

```sql
-- sql/triggers/03-post-bonus.sql
-- Cộng 10 điểm/bài, tối đa 3 bài/ngày
-- Nếu là bài đầu tiên all-time → complete_referral

CREATE OR REPLACE FUNCTION public.handle_post_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_posts_today  integer;
  v_total_posts  integer;
BEGIN
  -- Đếm bài đã đăng hôm nay (bao gồm bài vừa insert)
  SELECT COUNT(*) INTO v_posts_today
  FROM public.posts
  WHERE user_id = NEW.user_id
    AND deleted_at IS NULL
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- Cộng điểm nếu chưa vượt quá 3 bài/ngày
  IF v_posts_today <= 3 THEN
    PERFORM public.add_points(NEW.user_id, 10, 'post', NEW.id);
  END IF;

  -- Kiểm tra bài đầu tiên all-time → hoàn tất referral nếu có
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

- [ ] **Step 2: Chạy trong SQL Editor**

- [ ] **Step 3: Test giới hạn 3 bài/ngày**

```sql
-- Sau khi insert 4 bài trong ngày, ledger phải có đúng 3 dòng 'post'
SELECT COUNT(*) FROM public.points_ledger
WHERE user_id = '<test_user_id>'
  AND reason_code = 'post'
  AND created_at >= CURRENT_DATE;
-- Phải là 3, không phải 4
```

- [ ] **Step 4: Test complete_referral chỉ chạy 1 lần**

```sql
-- Sau khi insert bài đầu tiên, referral (nếu có) phải chuyển sang 'rewarded'
SELECT status FROM public.referrals WHERE referred_id = '<test_user_id>';
-- Nếu có referral: 'rewarded'. Nếu không có referral: query trả về 0 dòng (ok)
```

- [ ] **Step 5: Commit**

```bash
git add sql/triggers/03-post-bonus.sql
git commit -m "feat(backend): add post bonus trigger (10pts, max 3/day) + complete_referral"
```

---

### Task 4: Trigger T4 — Daily Login Streak

**Sprint:** 3 (trước khi frontend gọi Server Action cập nhật last_login_date)

**Files:**
- Create: `sql/triggers/04-login-streak.sql`

**Interfaces:**
- Consumes: `public.add_points`, `public.profiles.last_login_date`, `public.profiles.streak_count`
- Produces: trigger `trg_login_streak` trên `public.profiles` (BEFORE UPDATE)

- [ ] **Step 1: Viết file SQL**

```sql
-- sql/triggers/04-login-streak.sql
-- BEFORE UPDATE để có thể ghi NEW.streak_count trực tiếp
-- Logic:
--   - same day → skip
--   - yesterday → streak++, +5pts, bonus nếu đạt milestone
--   - trước đó → reset về 1, +5pts

CREATE OR REPLACE FUNCTION public.handle_login_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_milestone_days integer[] := ARRAY[7, 14, 30, 60, 100];
  v_bonus          integer;
BEGIN
  -- Chỉ xử lý khi last_login_date thực sự thay đổi
  IF NEW.last_login_date IS NOT DISTINCT FROM OLD.last_login_date THEN
    RETURN NEW;
  END IF;

  -- Đã đăng nhập hôm nay rồi → skip (không cộng thêm)
  IF OLD.last_login_date = CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  IF OLD.last_login_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Hôm qua đăng nhập → streak tiếp tục
    NEW.streak_count := COALESCE(OLD.streak_count, 0) + 1;
  ELSE
    -- Bỏ ngày (hoặc lần đầu) → reset
    NEW.streak_count := 1;
  END IF;

  -- Cộng điểm cố định hàng ngày
  PERFORM public.add_points(NEW.id, 5, 'streak', NULL);

  -- Bonus ngẫu nhiên tại các mốc milestone
  IF NEW.streak_count = ANY(v_milestone_days) THEN
    v_bonus := floor(random() * 91 + 10)::integer; -- 10–100 điểm
    PERFORM public.add_points(NEW.id, v_bonus, 'streak', NULL);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_login_streak
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_login_streak();
```

- [ ] **Step 2: Chạy trong SQL Editor**

- [ ] **Step 3: Test streak liên tục**

```sql
-- Simulate 3 ngày liên tiếp
UPDATE public.profiles SET last_login_date = CURRENT_DATE - 2 WHERE id = '<test_id>';
UPDATE public.profiles SET last_login_date = CURRENT_DATE - 1 WHERE id = '<test_id>';
UPDATE public.profiles SET last_login_date = CURRENT_DATE     WHERE id = '<test_id>';

-- Kiểm tra streak_count = 3
SELECT streak_count FROM public.profiles WHERE id = '<test_id>';

-- Kiểm tra 3 dòng 'streak' trong ledger (tất cả delta = 5)
SELECT delta, created_at FROM public.points_ledger
WHERE user_id = '<test_id>' AND reason_code = 'streak'
ORDER BY created_at;
```

- [ ] **Step 4: Test reset khi bỏ ngày**

```sql
UPDATE public.profiles SET last_login_date = CURRENT_DATE - 5 WHERE id = '<test_id>';
UPDATE public.profiles SET last_login_date = CURRENT_DATE     WHERE id = '<test_id>';
SELECT streak_count FROM public.profiles WHERE id = '<test_id>';
-- Phải là 1 (reset)
```

- [ ] **Step 5: Test milestone bonus (streak = 7)**

```sql
-- Set streak_count = 6 + last_login_date = hôm qua
UPDATE public.profiles
SET streak_count = 6, last_login_date = CURRENT_DATE - 1
WHERE id = '<test_id>';

UPDATE public.profiles SET last_login_date = CURRENT_DATE WHERE id = '<test_id>';

-- Phải thấy 2 dòng 'streak' mới: 1 dòng delta=5, 1 dòng delta>=10
SELECT delta FROM public.points_ledger
WHERE user_id = '<test_id>' AND reason_code = 'streak'
ORDER BY created_at DESC LIMIT 2;
```

- [ ] **Step 6: Commit**

```bash
git add sql/triggers/04-login-streak.sql
git commit -m "feat(backend): add daily login streak trigger (5pts/day, milestone bonus 10-100pts)"
```

---

### Task 5: Storage Buckets & Policies

**Sprint:** 1 (trước khi dựng avatar upload)

**Files:**
- Create: `sql/storage/05-storage-policies.sql`

**Interfaces:**
- Produces: bucket `avatars`, bucket `post-images`, RLS policies trên `storage.objects`

- [ ] **Step 1: Tạo buckets trong Supabase Dashboard**

Storage → New bucket:

| Bucket name | Public | Allowed MIME types |
|-------------|--------|--------------------|
| `avatars` | ✅ | image/jpeg, image/png, image/webp |
| `post-images` | ✅ | image/jpeg, image/png, image/webp, image/gif |

- [ ] **Step 2: Viết policies SQL**

```sql
-- sql/storage/05-storage-policies.sql

-- avatars: chỉ upload vào thư mục {user_id}/ của chính mình
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- avatars: ai cũng đọc được (public bucket)
CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- post-images: chỉ upload vào thư mục {user_id}/ của chính mình
CREATE POLICY "post_images_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- post-images: ai cũng đọc được
CREATE POLICY "post_images_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');
```

- [ ] **Step 3: Chạy trong SQL Editor**

- [ ] **Step 4: Xác nhận policies**

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
-- Phải thấy 4 policies: avatars_insert_own, avatars_select_public,
-- post_images_insert_own, post_images_select_public
```

- [ ] **Step 5: Commit**

```bash
git add sql/storage/05-storage-policies.sql
git commit -m "feat(backend): add storage bucket policies for avatars and post-images"
```

---

### Task 6: Auth Providers Configuration

**Sprint:** 1 (trước khi dựng màn hình đăng ký)

**Files:** (Dashboard config — không có file code)

- [ ] **Step 1: Bật Email OTP**

Supabase Dashboard → Authentication → Providers → Email:
- Enable Email provider: ✅
- Confirm email: ✅
- **Secure email change:** ✅
- OTP expiry: `86400` (24 giờ)

- [ ] **Step 2: Cấu hình URL**

Authentication → URL Configuration:
- Site URL: `http://localhost:3000` (local) / domain production sau
- Redirect URLs: thêm `http://localhost:3000/**`

- [ ] **Step 3: Bật Google OAuth (khi có credentials)**

1. Google Cloud Console → Create OAuth 2.0 Client (Web application)
2. Authorized redirect URI: `{SUPABASE_URL}/auth/v1/callback`
3. Supabase → Authentication → Providers → Google:
   - Client ID: paste từ Google
   - Client Secret: paste từ Google

- [ ] **Step 4: Xác nhận Email OTP hoạt động (local)**

Dùng Inbucket (http://localhost:9000) để xem email OTP sau khi đăng ký thử.

- [ ] **Step 5: Commit note**

```bash
# Không có file code để commit — ghi note vào BACKEND-SETUP.md
git add docs/requirement/BACKEND-SETUP.md  # nếu cập nhật checklist
git commit -m "chore: mark auth providers configured"
```

---

### Task 7: Edge Function — payment-webhook (Sprint 5)

**Sprint:** 5

**Files:**
- Create: `supabase/functions/payment-webhook/index.ts`

**Interfaces:**
- Consumes: `public.payments`, `public.add_points` (via service_role)
- Produces: POST endpoint `/functions/v1/payment-webhook`

- [ ] **Step 1: Khởi tạo Edge Function**

```bash
npx supabase functions new payment-webhook
```

- [ ] **Step 2: Set secrets**

```bash
npx supabase secrets set PAYOS_CHECKSUM_KEY=<your_key>
npx supabase secrets set VNPAY_HASH_SECRET=<your_secret>
```

- [ ] **Step 3: Viết Edge Function**

```ts
// supabase/functions/payment-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

// ponytail: 1đ / 1000 VNĐ — thay đổi khi có quyết định business
const POINTS_PER_1000_VND = 1

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyPayOS(body: Record<string, unknown>, checksumKey: string): Promise<boolean> {
  // payOS checksum: HMAC-SHA256 trên chuỗi sorted key=value
  const data = Object.keys(body)
    .filter(k => k !== 'signature')
    .sort()
    .map(k => `${k}=${body[k]}`)
    .join('&')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(checksumKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === body['signature']
}

async function verifyVNPay(body: Record<string, unknown>, hashSecret: string): Promise<boolean> {
  // VNPay checksum: HMAC-SHA512
  const data = Object.keys(body)
    .filter(k => k !== 'vnp_SecureHash')
    .sort()
    .map(k => `${k}=${body[k]}`)
    .join('&')
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(hashSecret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === body['vnp_SecureHash']
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const body = await req.json() as Record<string, unknown>
  const gateway = (body['gateway'] as string) ?? 'payos'

  // Xác thực checksum
  const PAYOS_CHECKSUM_KEY = Deno.env.get('PAYOS_CHECKSUM_KEY') ?? ''
  const VNPAY_HASH_SECRET   = Deno.env.get('VNPAY_HASH_SECRET') ?? ''

  let valid = false
  if (gateway === 'payos') valid = await verifyPayOS(body, PAYOS_CHECKSUM_KEY)
  if (gateway === 'vnpay') valid = await verifyVNPay(body, VNPAY_HASH_SECRET)

  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid checksum' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Chỉ xử lý khi thanh toán thành công
  const status = body['status'] as string
  if (status !== 'PAID' && status !== '00') {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const gatewayTxnId = body['orderCode'] ?? body['vnp_TxnRef']
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .update({ status: 'succeeded', gateway_txn_id: gatewayTxnId as string })
    .eq('gateway_txn_id', gatewayTxnId as string)
    .eq('status', 'pending')
    .select('id, user_id, amount_vnd')
    .single()

  if (paymentError || !payment) {
    console.error('Payment not found or already processed:', paymentError)
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Cộng điểm tỉ lệ POINTS_PER_1000_VND
  const pointsDelta = Math.floor(payment.amount_vnd / 1000) * POINTS_PER_1000_VND
  if (pointsDelta > 0) {
    const { error: pointsError } = await supabase.rpc('add_points', {
      p_user_id: payment.user_id,
      p_delta: pointsDelta,
      p_reason_code: 'adjustment',
      p_reference_id: payment.id,
    })
    if (pointsError) console.error('add_points error:', pointsError)
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
```

- [ ] **Step 4: Deploy**

```bash
npx supabase functions deploy payment-webhook
```

- [ ] **Step 5: Test với curl (local)**

```bash
# Lấy anon key từ .env
curl -X POST http://localhost:8000/functions/v1/payment-webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon_key>" \
  -d '{"gateway":"payos","status":"PAID","orderCode":"TEST001","signature":"invalid"}'
# Phải trả về 400 (checksum sai)
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/payment-webhook/
git commit -m "feat(backend): add payment-webhook edge function (payOS + VNPay)"
```
