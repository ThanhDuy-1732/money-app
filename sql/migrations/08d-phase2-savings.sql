CREATE TABLE IF NOT EXISTS public.savings_goals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  target_amount  integer NOT NULL CHECK (target_amount > 0),
  current_amount integer NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date    date,
  achieved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals (user_id, created_at DESC);

ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "savings_goals_select" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "savings_goals_insert" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals_update" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.savings_goals TO authenticated;

-- Trigger: award 30 points when goal first reached (MUST be SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.check_savings_goal_achieved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount
     AND OLD.achieved_at IS NULL
     AND NEW.achieved_at IS NULL THEN
    NEW.achieved_at := now();
    PERFORM public.add_points(NEW.user_id, 30, 'savings_goal_achieved', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_savings_goal_achieved
BEFORE UPDATE ON public.savings_goals
FOR EACH ROW EXECUTE FUNCTION public.check_savings_goal_achieved();
