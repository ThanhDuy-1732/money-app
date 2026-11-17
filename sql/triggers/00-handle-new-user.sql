-- sql/triggers/00-handle-new-user.sql
-- Tạo public.profiles khi Supabase Auth tạo auth.users.
-- display_name lấy từ user metadata (signInWithOtp options.data.display_name),
-- fallback về phần trước @ của email.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  -- profiles.display_name check: 2..30 ký tự
  IF char_length(v_name) < 2 THEN
    v_name := v_name || '_';
  END IF;
  v_name := left(v_name, 30);

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, v_name)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
