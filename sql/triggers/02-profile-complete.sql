-- sql/triggers/02-profile-complete.sql
-- Cộng 20 điểm khi avatar_url VÀ bio được điền lần đầu tiên
-- Idempotent: check points_ledger để không cộng hai lần

CREATE OR REPLACE FUNCTION public.handle_profile_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chỉ trigger khi cả avatar và bio vừa đủ điều kiện
  IF (NEW.avatar_url IS NOT NULL AND NEW.bio IS NOT NULL)
     AND (OLD.avatar_url IS NULL OR OLD.bio IS NULL) THEN

    -- Idempotent: chỉ thưởng 1 lần duy nhất
    IF NOT EXISTS (
      SELECT 1 FROM public.points_ledger
      WHERE user_id = NEW.id AND reason_code = 'profile_complete'
    ) THEN
      PERFORM public.add_points(NEW.id, 20, 'profile_complete', NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_complete
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_complete();
