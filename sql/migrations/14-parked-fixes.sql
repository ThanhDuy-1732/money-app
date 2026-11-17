-- Migration 14: Fix parked findings from Phase 3 final review
-- 1. UNIQUE index on shop_product_codes.assigned_order_id — prevents double-assignment
--    at DB level (RPC logic is already correct; this makes it impossible, not merely unlikely)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_codes_assigned_unique
  ON public.shop_product_codes (assigned_order_id)
  WHERE assigned_order_id IS NOT NULL;

-- 2. Notify buyer when paid-but-no-code (code exhausted after payment)
--    Replaces the complete_payment() shop_purchase branch with one that emits
--    a 'shop' notification on failure so the buyer knows and ops can track it.
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
      -- No code available: record failed order, notify buyer, leave payment as succeeded
      -- (money was received; ops must issue manual refund — notification creates the audit trail)
      INSERT INTO public.shop_orders (user_id, product_id, payment_method, amount_vnd, status)
      VALUES (v_payment.user_id, v_product_id, 'vnpay', v_payment.amount_vnd, 'failed')
      RETURNING id INTO v_order_id;

      INSERT INTO public.notifications (user_id, type, payload)
      VALUES (
        v_payment.user_id,
        'shop',
        json_build_object(
          'message', 'Thanh toán thành công nhưng sản phẩm đã hết mã. Chúng tôi sẽ hoàn tiền trong 3-5 ngày làm việc.',
          'order_id', v_order_id,
          'payment_id', v_payment.id
        )::jsonb
      );

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
