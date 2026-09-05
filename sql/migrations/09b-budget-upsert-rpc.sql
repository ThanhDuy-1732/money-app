-- 09b-budget-upsert-rpc.sql
-- Atomic budget upsert with free-tier limit enforcement.
-- Uses a per-user transaction-level advisory lock to prevent TOCTOU:
-- two concurrent requests for different categories in the same month
-- can no longer both pass the count check and overflow the limit.

CREATE OR REPLACE FUNCTION public.upsert_budget_with_limit(
  p_category_id uuid,
  p_month        date,
  p_limit_amount bigint,
  p_max_budgets  int DEFAULT 3
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_existing int;
  v_count    int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Chưa đăng nhập');
  END IF;

  -- Per-user advisory lock (released at end of transaction).
  -- Serialises all budget mutations for this user so the count is stable.
  PERFORM pg_advisory_xact_lock(hashtext('budget'), hashtext(v_user_id::text));

  -- Is this an update of an existing budget (same user + category + month)?
  SELECT COUNT(*) INTO v_existing
  FROM   public.budgets
  WHERE  user_id     = v_user_id
    AND  category_id = p_category_id
    AND  month       = p_month;

  -- Only enforce the limit on new budget creation.
  IF v_existing = 0 THEN
    SELECT COUNT(*) INTO v_count
    FROM   public.budgets
    WHERE  user_id = v_user_id
      AND  month   = p_month;

    IF v_count >= p_max_budgets THEN
      RETURN jsonb_build_object(
        'error',
        format('Đã đạt giới hạn %s ngân sách/tháng cho gói Free', p_max_budgets)
      );
    END IF;
  END IF;

  INSERT INTO public.budgets (user_id, category_id, month, limit_amount)
  VALUES (v_user_id, p_category_id, p_month, p_limit_amount)
  ON CONFLICT (user_id, category_id, month)
    DO UPDATE SET limit_amount = EXCLUDED.limit_amount;

  RETURN jsonb_build_object('error', null);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_budget_with_limit(uuid, date, bigint, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_budget_with_limit(uuid, date, bigint, int) TO authenticated;
