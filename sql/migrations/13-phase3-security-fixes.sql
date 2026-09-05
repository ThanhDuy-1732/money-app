-- Migration 13: Phase 3 security hardening
-- Fix 1: Narrow profiles UPDATE grant — prevent self-escalation
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, bio, status, updated_at, streak_count, last_login_date)
  ON public.profiles TO authenticated;
-- role, locked, points_balance, referral_code intentionally omitted

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND locked = (SELECT locked FROM public.profiles WHERE id = auth.uid())
    AND points_balance = (SELECT points_balance FROM public.profiles WHERE id = auth.uid())
  );

-- Fix 2: Referral insert RPC (avoids direct authenticated access to referrals table)
CREATE OR REPLACE FUNCTION public.create_referral(p_referrer_id uuid, p_referred_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF p_referrer_id = p_referred_id THEN RETURN; END IF;
  SELECT referral_code INTO v_code FROM public.profiles WHERE id = p_referrer_id;
  IF v_code IS NULL THEN RETURN; END IF;
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
  VALUES (p_referrer_id, p_referred_id, v_code, 'pending')
  ON CONFLICT DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_referral(uuid, uuid) TO authenticated;

-- Fix 3: Admin shop write privileges (RLS policies already limit to admins)
GRANT INSERT, UPDATE, DELETE ON public.shop_partners TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;

-- Fix 4: SECURITY DEFINER RPC for bulk code import
-- shop_product_codes stays locked down — codes only via get_my_order_code
CREATE OR REPLACE FUNCTION public.admin_import_codes(p_product_id uuid, p_codes text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code text;
  v_count integer := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  FOREACH v_code IN ARRAY p_codes
  LOOP
    INSERT INTO public.shop_product_codes (product_id, code)
    VALUES (p_product_id, v_code)
    ON CONFLICT (product_id, code) DO NOTHING;
    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_import_codes(uuid, text[]) TO authenticated;

-- Fix 5: Replace complete_payment with amount validation guard
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
  v_payment        payments%ROWTYPE;
  v_delta          integer;
  v_code_id        uuid;
  v_order_id       uuid;
  v_product_id     uuid;
  v_product_price  integer;
  v_err            text;
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
    v_product_id := (v_payment.metadata->>'product_id')::uuid;
    IF v_product_id IS NULL THEN
      RETURN json_build_object('ok', false, 'error', 'shop_purchase missing product_id in metadata');
    END IF;

    -- Validate payment amount matches product price
    SELECT price_vnd INTO v_product_price FROM public.shop_products WHERE id = v_product_id;
    IF v_product_price IS NOT NULL AND v_payment.amount_vnd < v_product_price THEN
      RETURN json_build_object('ok', false, 'error', 'amount mismatch');
    END IF;

    SELECT id INTO v_code_id
      FROM public.shop_product_codes
     WHERE product_id = v_product_id AND assigned_order_id IS NULL
     FOR UPDATE SKIP LOCKED
     LIMIT 1;
    IF v_code_id IS NULL THEN
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
