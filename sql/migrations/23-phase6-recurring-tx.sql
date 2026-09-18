-- sql/migrations/23-phase6-recurring-tx.sql

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id     uuid REFERENCES public.categories(id),
  type            text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_vnd      integer NOT NULL CHECK (amount_vnd > 0),
  note            text CHECK (note IS NULL OR char_length(note) <= 200),
  start_date      date NOT NULL,
  occurrences_run integer NOT NULL DEFAULT 0 CHECK (occurrences_run >= 0),
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- IMPORTANT: start_date is immutable — never update it after creation.
-- next_run is always: (start_date + (occurrences_run || ' months')::interval)::date
-- NOT: previous_next_run + interval (would cause permanent date drift for day 29-31)

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring_tx_owner" ON public.recurring_transactions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE ALL ON public.recurring_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.recurring_transactions TO authenticated;
GRANT INSERT (user_id, category_id, type, amount_vnd, note, start_date)
  ON public.recurring_transactions TO authenticated;
GRANT UPDATE (active) ON public.recurring_transactions TO authenticated;

-- run_recurring_transactions: processes all due recurring transactions
-- REVOKED from authenticated/anon — called only by pg_cron (service context)
CREATE OR REPLACE FUNCTION public.run_recurring_transactions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_due date;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  r record;
BEGIN
  FOR r IN
    SELECT * FROM public.recurring_transactions
    WHERE active
      AND (start_date + (occurrences_run || ' months')::interval)::date <= v_today
    FOR UPDATE SKIP LOCKED
  LOOP
    LOOP
      v_due := (r.start_date + (r.occurrences_run || ' months')::interval)::date;
      EXIT WHEN v_due > v_today;
      INSERT INTO public.transactions (user_id, category_id, type, amount_vnd, note, occurred_at)
      VALUES (r.user_id, r.category_id, r.type, r.amount_vnd, r.note, v_due);
      r.occurrences_run := r.occurrences_run + 1;
      v_count := v_count + 1;
    END LOOP;

    UPDATE public.recurring_transactions
    SET occurrences_run = r.occurrences_run
    WHERE id = r.id;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.run_recurring_transactions() FROM public, anon, authenticated;

-- Schedule daily at 01:00 UTC
SELECT cron.schedule(
  'run-recurring-transactions-daily',
  '0 1 * * *',
  $$SELECT public.run_recurring_transactions();$$
);
