-- sql/triggers/04-login-streak.sql
-- BEFORE UPDATE để có thể ghi NEW.streak_count trực tiếp
-- Logic:
--   - same day → skip
--   - yesterday → streak++, +5pts, bonus nếu đạt milestone
--   - trước đó → reset về 1, +5pts

CREATE OR REPLACE FUNCTION public.handle_login_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_milestone_days integer[] := ARRAY[7, 14, 30, 60, 100];
  v_bonus          integer;
BEGIN
  -- Chỉ xử lý khi last_login_date thực sự thay đổi
  IF NEW.last_login_date IS NOT DISTINCT FROM OLD.last_login_date THEN
    RETURN NEW;
  END IF;

  -- Đã đăng nhập hôm nay rồi → skip (không cộng thêm)
  IF OLD.last_login_date = CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  IF OLD.last_login_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Hôm qua đăng nhập → streak tiếp tục
    NEW.streak_count := COALESCE(OLD.streak_count, 0) + 1;
  ELSE
    -- Bỏ ngày (hoặc lần đầu) → reset
    NEW.streak_count := 1;
  END IF;

  -- Cộng điểm cố định hàng ngày
  PERFORM public.add_points(NEW.id, 5, 'streak', NULL);

  -- Bonus ngẫu nhiên tại các mốc milestone
  IF NEW.streak_count = ANY(v_milestone_days) THEN
    v_bonus := floor(random() * 91 + 10)::integer; -- 10–100 điểm
    PERFORM public.add_points(NEW.id, v_bonus, 'streak', NULL);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_login_streak
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_login_streak();
