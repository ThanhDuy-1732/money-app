-- sql/migrations/08f-phase2-billing.sql

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan           text NOT NULL DEFAULT 'premium' CHECK (plan IN ('premium')),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  payment_method text NOT NULL CHECK (payment_method IN ('points', 'vnpay')),
  started_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.subscriptions TO authenticated;

-- Client cannot INSERT/UPDATE/DELETE directly
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon, public;

-- RPC: subscribe via points
CREATE OR REPLACE FUNCTION public.subscribe_premium_with_points()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_points_cost CONSTANT integer := 500; -- ponytail: change when founder confirms pricing
  v_sub_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Yeu cau dang nhap';
  END IF;

  -- Deduct points (will fail if balance insufficient due to check(balance_after >= 0) on points_ledger)
  PERFORM public.add_points(v_user_id, -v_points_cost, 'subscription_points', NULL);

  INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
  VALUES (v_user_id, 'premium', 'active', 'points', now() + interval '30 days')
  ON CONFLICT (user_id) DO UPDATE
    SET expires_at    = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
        status        = 'active',
        payment_method = 'points';

  SELECT id INTO v_sub_id FROM public.subscriptions WHERE user_id = v_user_id;
  RETURN v_sub_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.subscribe_premium_with_points() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_premium_with_points() TO authenticated;
