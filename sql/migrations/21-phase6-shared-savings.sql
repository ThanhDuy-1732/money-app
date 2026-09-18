-- sql/migrations/21-phase6-shared-savings.sql

-- 1. Membership table
CREATE TABLE IF NOT EXISTS public.savings_goal_members (
  goal_id uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, user_id)
);

-- 2. Contributions table (manual logging, not real money transfer)
CREATE TABLE IF NOT EXISTS public.savings_goal_contributions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id    uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount     integer NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Membership check — SECURITY DEFINER to avoid RLS infinite recursion
--    (same pattern as is_admin() — never write EXISTS directly in policy of tables
--    that reference each other: savings_goals ↔ savings_goal_members ↔ savings_goal_contributions)
CREATE OR REPLACE FUNCTION public.is_goal_member(p_goal_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.savings_goal_members
    WHERE goal_id = p_goal_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.savings_goals
    WHERE id = p_goal_id AND user_id = auth.uid()
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_goal_member(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_goal_member(uuid) TO authenticated;

-- 4. RLS
ALTER TABLE public.savings_goal_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goal_contributions ENABLE ROW LEVEL SECURITY;

-- savings_goals already has RLS from migration 08d — add member-visible policy alongside owner policy
CREATE POLICY "goals_select_member"
  ON public.savings_goals FOR SELECT
  USING (public.is_goal_member(id));

CREATE POLICY "members_select_member"
  ON public.savings_goal_members FOR SELECT
  USING (public.is_goal_member(goal_id));

CREATE POLICY "members_insert_owner"
  ON public.savings_goal_members FOR INSERT
  WITH CHECK (
    user_id <> auth.uid() AND
    EXISTS (SELECT 1 FROM public.savings_goals WHERE id = goal_id AND user_id = auth.uid())
  );

CREATE POLICY "contributions_select_member"
  ON public.savings_goal_contributions FOR SELECT
  USING (public.is_goal_member(goal_id));

CREATE POLICY "contributions_insert_member"
  ON public.savings_goal_contributions FOR INSERT
  WITH CHECK (public.is_goal_member(goal_id) AND user_id = auth.uid());

GRANT SELECT, INSERT ON public.savings_goal_members TO authenticated;
GRANT SELECT, INSERT ON public.savings_goal_contributions TO authenticated;

-- 5. Trigger: sync contribution amount to goal's current_amount
CREATE OR REPLACE FUNCTION public.sync_goal_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.savings_goals
  SET current_amount = current_amount + NEW.amount
  WHERE id = NEW.goal_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_goal_amount
AFTER INSERT ON public.savings_goal_contributions
FOR EACH ROW EXECUTE FUNCTION public.sync_goal_amount();

-- 6. Extend check_savings_goal_achieved() to award points to ALL members
--    (owner + invited members) when goal is reached
CREATE OR REPLACE FUNCTION public.check_savings_goal_achieved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member record;
BEGIN
  IF NEW.current_amount >= NEW.target_amount
     AND OLD.achieved_at IS NULL
     AND NEW.achieved_at IS NULL THEN
    NEW.achieved_at := now();
    -- Award owner
    PERFORM public.add_points(NEW.user_id, 30, 'savings_goal_achieved', NEW.id);
    -- Award invited members (if any)
    FOR v_member IN
      SELECT user_id FROM public.savings_goal_members
      WHERE goal_id = NEW.id AND user_id <> NEW.user_id
    LOOP
      PERFORM public.add_points(v_member.user_id, 30, 'savings_goal_achieved', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
-- Trigger already exists from migration 08d — function replacement is enough
