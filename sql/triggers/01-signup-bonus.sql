-- sql/triggers/01-signup-bonus.sql
-- Trigger cộng 50 điểm khi user tạo profile lần đầu

CREATE OR REPLACE FUNCTION public.handle_signup_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.add_points(NEW.id, 50, 'signup', NULL);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_signup_bonus
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_signup_bonus();
