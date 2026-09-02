-- Migration 07: complete_payment RPC — atomic mark-succeeded + add_points in one transaction
-- Replaces the two-step approach in the Edge Function that had a race window.

-- ponytail: complete_payment is REVOKED from public/authenticated/anon;
-- only callable by service_role (Edge Function), consistent with add_points.

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
  v_err      text;
BEGIN
  -- Atomically claim the pending row (idempotent: concurrent calls all fail except one)
  UPDATE payments
  SET    status = 'succeeded', gateway_txn_id = p_gateway_txn_id
  WHERE  gateway_txn_id = p_gateway_txn_id
    AND  gateway         = p_gateway
    AND  status          = 'pending'
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN
    -- Already processed or doesn't exist — safe to return ok (idempotent)
    RETURN json_build_object('ok', true, 'skipped', true);
  END IF;

  -- Award points within the same transaction
  v_delta := FLOOR(v_payment.amount_vnd::numeric / 1000)::integer;
  IF v_delta > 0 THEN
    PERFORM public.add_points(v_payment.user_id, v_delta, 'topup', v_payment.id);
  END IF;

  RETURN json_build_object('ok', true, 'payment_id', v_payment.id, 'points', v_delta);

EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
  -- Transaction auto-rolls back — payment stays 'pending', IPN can retry
  RETURN json_build_object('ok', false, 'error', v_err);
END;
$$;

-- Only service_role (Edge Function) can call this
REVOKE EXECUTE ON FUNCTION public.complete_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.complete_payment(text, text) TO service_role;
