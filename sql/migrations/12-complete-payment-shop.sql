-- Migration 12: Extend complete_payment() to handle payment_type = 'shop_purchase'
-- Adds shop_purchase branch; topup + subscription branches unchanged.

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
  v_payment  payments%ROWTYPE;
  v_delta    integer;
  v_code_id  uuid;
  v_order_id uuid;
  v_product_id uuid;
  v_err      text;
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
    -- product_id stored in payments.metadata when creating the VNPay link
    v_product_id := (v_payment.metadata->>'product_id')::uuid;
    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'shop_purchase missing product_id in metadata';
    END IF;

    SELECT id INTO v_code_id
      FROM public.shop_product_codes
     WHERE product_id = v_product_id AND assigned_order_id IS NULL
     FOR UPDATE SKIP LOCKED
     LIMIT 1;
    IF v_code_id IS NULL THEN
      -- No code available — mark order failed, refund is a manual ops task
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
