-- sql/triggers/03-post-bonus.sql
-- Cộng 10 điểm/bài, tối đa 3 bài/ngày
-- Nếu là bài đầu tiên all-time → complete_referral

CREATE OR REPLACE FUNCTION public.handle_post_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_posts_today  integer;
  v_total_posts  integer;
BEGIN
  -- Đếm bài đã đăng hôm nay (bao gồm bài vừa insert)
  SELECT COUNT(*) INTO v_posts_today
  FROM public.posts
  WHERE user_id = NEW.user_id
    AND deleted_at IS NULL
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';

  -- Cộng điểm nếu chưa vượt quá 3 bài/ngày
  IF v_posts_today <= 3 THEN
    PERFORM public.add_points(NEW.user_id, 10, 'post', NEW.id);
  END IF;

  -- Kiểm tra bài đầu tiên all-time → hoàn tất referral nếu có
  SELECT COUNT(*) INTO v_total_posts
  FROM public.posts
  WHERE user_id = NEW.user_id AND deleted_at IS NULL;

  IF v_total_posts = 1 THEN
    PERFORM public.complete_referral(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_bonus
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.handle_post_bonus();
