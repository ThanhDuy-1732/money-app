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
-- anon cũng cần EXECUTE vì policy admin_* được evaluate khi anon đọc posts/profiles.
-- Hàm chỉ trả false khi auth.uid() null nên không lộ quyền admin.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

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
