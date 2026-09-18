-- sql/migrations/20-phase6-gift-points.sql

-- 1. Extend points_ledger reason codes to include gift variants
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_code_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_code_check
  CHECK (reason_code IN (
    'signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved',
    'subscription_points','shop_purchase_points','gift_sent','gift_received'
  ));

-- 2. Extend notifications type to include gift
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow','like','comment','points','referral','finance','todo','shop','gift'));

-- 3. Daily limit tracker (one row per sender, reset when day changes)
CREATE TABLE IF NOT EXISTS public.gift_daily_limit (
  user_id    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  day        date NOT NULL DEFAULT current_date,
  total_sent integer NOT NULL DEFAULT 0
);

-- 4. gift_points() RPC
-- Security: reads auth.uid() internally → safe to GRANT to authenticated
-- Atomicity: both add_points() calls in same transaction — no partial state possible
-- ponytail: daily_limit constant=200, move to config table if product needs runtime adjustment
CREATE OR REPLACE FUNCTION public.gift_points(p_to_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from        uuid := auth.uid();
  v_daily_limit CONSTANT integer := 200;
  v_sent_today  integer;
BEGIN
  IF v_from IS NULL THEN RAISE EXCEPTION 'Yeu cau dang nhap'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'So diem tang phai duong'; END IF;
  IF p_to_user_id = v_from THEN RAISE EXCEPTION 'Khong the tu tang diem cho chinh minh'; END IF;

  -- Upsert daily limit row; reset total_sent if day changed
  INSERT INTO public.gift_daily_limit (user_id, day, total_sent)
  VALUES (v_from, current_date, 0)
  ON CONFLICT (user_id) DO UPDATE
    SET total_sent = CASE
          WHEN gift_daily_limit.day = current_date THEN gift_daily_limit.total_sent
          ELSE 0
        END,
        day = current_date
  RETURNING total_sent INTO v_sent_today;

  IF v_sent_today + p_amount > v_daily_limit THEN
    RAISE EXCEPTION 'Vuot han muc tang diem trong ngay (con lai % diem)', v_daily_limit - v_sent_today;
  END IF;

  PERFORM public.add_points(v_from, -p_amount, 'gift_sent', p_to_user_id);
  PERFORM public.add_points(p_to_user_id, p_amount, 'gift_received', v_from);

  UPDATE public.gift_daily_limit
  SET total_sent = total_sent + p_amount
  WHERE user_id = v_from;

  -- Notify recipient
  INSERT INTO public.notifications (user_id, type, data)
  VALUES (p_to_user_id, 'gift', jsonb_build_object('from_user_id', v_from, 'amount', p_amount));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gift_points(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gift_points(uuid, integer) TO authenticated;
