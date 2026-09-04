-- sql/migrations/11-phase3-shop-marketplace.sql
-- ============================================================================
-- PHASE 3 — TRACK B: SHOP MARKETPLACE
-- ============================================================================

-- 1. Extend points_ledger reason_code
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_code_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_code_check
  CHECK (reason_code IN (
    'signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved',
    'subscription_points','shop_purchase_points'
  ));

-- 2. Partners
CREATE TABLE IF NOT EXISTS public.shop_partners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  logo_url   text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Products
CREATE TABLE IF NOT EXISTS public.shop_products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   uuid NOT NULL REFERENCES public.shop_partners(id) ON DELETE RESTRICT,
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description  text,
  image_url    text,
  price_points integer CHECK (price_points IS NULL OR price_points > 0),
  price_vnd    integer CHECK (price_vnd IS NULL OR price_vnd > 0),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_products_price_check CHECK (price_points IS NOT NULL OR price_vnd IS NOT NULL)
);

-- 4. Code inventory — NEVER grant to client
CREATE TABLE IF NOT EXISTS public.shop_product_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE RESTRICT,
  code              text NOT NULL,
  assigned_order_id uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, code)
);
CREATE INDEX IF NOT EXISTS idx_shop_codes_available
  ON public.shop_product_codes (product_id) WHERE assigned_order_id IS NULL;

-- 5. Orders
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES public.shop_products(id),
  code_id        uuid REFERENCES public.shop_product_codes(id),
  payment_method text NOT NULL CHECK (payment_method IN ('points', 'vnpay')),
  amount_points  integer,
  amount_vnd     integer,
  status         text NOT NULL DEFAULT 'fulfilled' CHECK (status IN ('fulfilled', 'failed')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON public.shop_orders (user_id, created_at DESC);

-- 6. Purchase with points — SKIP LOCKED for concurrent safety
CREATE OR REPLACE FUNCTION public.purchase_product_with_points(p_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_price    integer;
  v_code_id  uuid;
  v_order_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Yeu cau dang nhap'; END IF;

  SELECT price_points INTO v_price
    FROM public.shop_products
   WHERE id = p_product_id AND active;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'San pham khong kha dung hoac khong ho tro mua bang diem';
  END IF;

  -- Lock exactly 1 available code; skip any row another transaction has locked
  SELECT id INTO v_code_id
    FROM public.shop_product_codes
   WHERE product_id = p_product_id AND assigned_order_id IS NULL
   FOR UPDATE SKIP LOCKED
   LIMIT 1;
  IF v_code_id IS NULL THEN RAISE EXCEPTION 'Het ma, vui long thu lai sau'; END IF;

  -- Deduct points (add_points validates balance internally)
  PERFORM public.add_points(v_user_id, -v_price, 'shop_purchase_points', p_product_id);

  INSERT INTO public.shop_orders (user_id, product_id, code_id, payment_method, amount_points, status)
  VALUES (v_user_id, p_product_id, v_code_id, 'points', v_price, 'fulfilled')
  RETURNING id INTO v_order_id;

  UPDATE public.shop_product_codes SET assigned_order_id = v_order_id WHERE id = v_code_id;

  RETURN v_order_id;
END;
$$;

-- 7. Reveal code — only for order owner
CREATE OR REPLACE FUNCTION public.get_my_order_code(p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT spc.code INTO v_code
    FROM public.shop_orders so
    JOIN public.shop_product_codes spc ON spc.id = so.code_id
   WHERE so.id = p_order_id AND so.user_id = auth.uid();
  IF v_code IS NULL THEN RAISE EXCEPTION 'Khong co quyen xem ma nay'; END IF;
  RETURN v_code;
END;
$$;

-- 8. RLS
ALTER TABLE public.shop_partners      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_partners_select_active" ON public.shop_partners FOR SELECT USING (active);
CREATE POLICY "shop_products_select_active" ON public.shop_products FOR SELECT USING (active);
CREATE POLICY "shop_orders_select_own"      ON public.shop_orders   FOR SELECT USING (auth.uid() = user_id);

-- Admin sees and manages everything
CREATE POLICY "admin_all_shop_partners" ON public.shop_partners FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "admin_all_shop_products" ON public.shop_products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "admin_all_shop_codes" ON public.shop_product_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "admin_all_shop_orders" ON public.shop_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- 9. GRANT (explicit — RLS alone does not grant table access)
GRANT SELECT ON public.shop_partners, public.shop_products TO authenticated, anon;
GRANT SELECT ON public.shop_orders TO authenticated;
-- shop_product_codes: NO GRANT to any client role — codes only via get_my_order_code()
REVOKE ALL ON public.shop_product_codes FROM authenticated, anon, public;

GRANT EXECUTE ON FUNCTION public.purchase_product_with_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_order_code(uuid) TO authenticated;
