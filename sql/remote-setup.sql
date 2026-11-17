-- ============================================================================
-- REMOTE SUPABASE SETUP — chạy một lần trên project Supabase mới (SQL Editor)
-- Bao gồm: base schema + trigger tạo profile + storage buckets/policies + migrations 06-19
-- Lưu ý: file này dành cho database TRỐNG. Không chạy lại nhiều lần.
-- ============================================================================
begin;

-- Supabase cài extension trong schema "extensions"; cần có trong search_path
-- để các hàm/operator như unaccent(), similarity(), %, gin_trgm_ops, sha256() resolve được.
set local search_path = public, extensions;

-- ============================================================================
-- SCHEMA GIAI ĐOẠN 1 — SOCIAL + FINTECH (VÍ ĐIỂM THƯỞNG)
-- Mục tiêu: Postgres 15+ / Supabase (dùng auth.users có sẵn của Supabase Auth
-- để lưu email/phone/mật khẩu; public.profiles chỉ lưu dữ liệu ứng dụng).
-- Chạy toàn bộ file này trong Supabase SQL Editor theo đúng thứ tự từ trên xuống.
-- ============================================================================

create extension if not exists "pgcrypto"; -- cho gen_random_uuid()

-- ============================================================================
-- 1. BẢNG CHÍNH
-- ============================================================================

-- 1.1 profiles — mở rộng auth.users, KHÔNG lưu lại email/phone (đã có ở auth.users)
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null check (char_length(display_name) between 2 and 30),
  avatar_url      text,
  bio             text check (bio is null or char_length(bio) <= 160),
  points_balance  integer not null default 0 check (points_balance >= 0),
  streak_count    integer not null default 0 check (streak_count >= 0),
  last_login_date date,
  status          text not null default 'active' check (status in ('active', 'suspended')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.profiles is 'Hồ sơ ứng dụng, 1-1 với auth.users. points_balance là cache, nguồn sự thật là points_ledger.';

-- 1.2 posts
create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  content        text check (content is null or char_length(content) <= 500),
  image_urls     jsonb not null default '[]'::jsonb,
  like_count     integer not null default 0 check (like_count >= 0),
  comment_count  integer not null default 0 check (comment_count >= 0),
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  constraint posts_not_empty check (content is not null or jsonb_array_length(image_urls) > 0),
  constraint posts_max_4_images check (jsonb_array_length(image_urls) <= 4)
);

-- 1.3 follows (quan hệ 1 chiều)
create table public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

-- 1.4 likes
create table public.likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- 1.5 comments
create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) <= 300),
  created_at timestamptz not null default now()
);

-- 1.6 points_ledger — APPEND-ONLY, nguồn sự thật duy nhất cho điểm thưởng
create table public.points_ledger (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  delta          integer not null check (delta <> 0),
  reason_code    text not null check (reason_code in
                   ('signup', 'profile_complete', 'streak', 'post',
                    'referral_in', 'referral_out', 'redeem', 'adjustment')),
  reference_id   uuid,
  balance_after  integer not null check (balance_after >= 0),
  created_at     timestamptz not null default now()
);
comment on table public.points_ledger is 'Append-only. Không bao giờ UPDATE/DELETE — xem trigger bên dưới.';

-- 1.7 referrals
create table public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.profiles(id) on delete cascade,
  referred_id   uuid not null unique references public.profiles(id) on delete cascade,
  referral_code text not null,
  status        text not null default 'pending' check (status in ('pending', 'completed', 'rewarded', 'expired')),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  constraint referrals_no_self check (referrer_id <> referred_id)
);

-- 1.8 rewards (danh mục ưu đãi đổi điểm)
create table public.rewards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  points_cost integer not null check (points_cost > 0),
  stock       integer check (stock is null or stock >= 0), -- null = không giới hạn
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 1.9 redemptions
create table public.redemptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  reward_id     uuid not null references public.rewards(id),
  points_spent  integer not null check (points_spent > 0),
  status        text not null default 'pending' check (status in ('pending', 'fulfilled', 'rejected')),
  created_at    timestamptz not null default now()
);

-- 1.10 notifications
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type in ('follow', 'like', 'comment', 'points', 'referral')),
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- 1.11 payments (Sprint 5 — nạp tiền qua cổng thanh toán bên thứ ba, KHÔNG phải ví P2P)
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  amount_vnd      integer not null check (amount_vnd > 0),
  gateway         text not null check (gateway in ('payos', 'vnpay', 'momo')),
  gateway_txn_id  text,
  status          text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- 2. INDEX
-- ============================================================================

create index idx_posts_feed on public.posts (user_id, created_at desc) where deleted_at is null;
create index idx_follows_following on public.follows (following_id);
create index idx_likes_post on public.likes (post_id);
create index idx_comments_post_created on public.comments (post_id, created_at);
create index idx_ledger_user_created on public.points_ledger (user_id, created_at desc);
create index idx_referrals_referrer on public.referrals (referrer_id);
create index idx_referrals_status on public.referrals (status);
create index idx_redemptions_user on public.redemptions (user_id, created_at desc);
create index idx_notifications_user_unread on public.notifications (user_id, read_at, created_at desc);
create index idx_payments_user on public.payments (user_id, created_at desc);

-- ============================================================================
-- 3. TRIGGER — updated_at tự động
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. TRIGGER — points_ledger APPEND-ONLY (chặn UPDATE/DELETE ở tầng DB)
-- ============================================================================

create or replace function public.prevent_ledger_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'points_ledger la append-only: khong duoc UPDATE hoac DELETE ban ghi da co';
end;
$$;

create trigger trg_ledger_no_update
before update on public.points_ledger
for each row execute function public.prevent_ledger_mutation();

create trigger trg_ledger_no_delete
before delete on public.points_ledger
for each row execute function public.prevent_ledger_mutation();

-- ============================================================================
-- 5. TRIGGER — đồng bộ like_count / comment_count trên posts
-- ============================================================================

create or replace function public.sync_post_like_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger trg_likes_sync
after insert or delete on public.likes
for each row execute function public.sync_post_like_count();

create or replace function public.sync_post_comment_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger trg_comments_sync
after insert or delete on public.comments
for each row execute function public.sync_post_comment_count();

-- ============================================================================
-- 6. FUNCTION NGHIỆP VỤ — cộng/trừ điểm an toàn (chống race condition)
-- ============================================================================

-- add_points: hàm DUY NHẤT được phép ghi vào points_ledger.
-- Dùng UPDATE ... RETURNING để tận dụng row lock của Postgres, đảm bảo
-- 2 giao dịch đồng thời trên cùng 1 user không bao giờ tính sai số dư.
create or replace function public.add_points(
  p_user_id      uuid,
  p_delta        integer,
  p_reason_code  text,
  p_reference_id uuid default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  update public.profiles
     set points_balance = points_balance + p_delta
   where id = p_user_id
   returning points_balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'Khong tim thay profile %', p_user_id;
  end if;

  if v_new_balance < 0 then
    raise exception 'So du diem khong du (se am), giao dich bi huy';
  end if;

  insert into public.points_ledger (user_id, delta, reason_code, reference_id, balance_after)
  values (p_user_id, p_delta, p_reason_code, p_reference_id, v_new_balance);

  return v_new_balance;
end;
$$;

-- redeem_reward: đổi điểm lấy ưu đãi — atomic, khóa hàng đợi qua add_points ở trên.
create or replace function public.redeem_reward(p_reward_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id        uuid := auth.uid();
  v_cost           integer;
  v_active         boolean;
  v_redemption_id  uuid;
begin
  if v_user_id is null then
    raise exception 'Yeu cau dang nhap';
  end if;

  select points_cost, active into v_cost, v_active
    from public.rewards where id = p_reward_id;

  if v_cost is null or v_active is not true then
    raise exception 'Uu dai khong ton tai hoac da ngung hoat dong';
  end if;

  -- add_points tự lock row profiles và raise exception nếu không đủ điểm
  perform public.add_points(v_user_id, -v_cost, 'redeem', p_reward_id);

  insert into public.redemptions (user_id, reward_id, points_spent, status)
  values (v_user_id, p_reward_id, v_cost, 'fulfilled')
  returning id into v_redemption_id;

  return v_redemption_id;
end;
$$;

-- complete_referral: gọi sau khi user hoàn tất hồ sơ + có bài đăng đầu tiên.
-- Idempotent: chỉ thưởng đúng 1 lần nhờ điều kiện status = 'pending'.
create or replace function public.complete_referral(p_referred_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref record;
begin
  select * into v_ref from public.referrals
    where referred_id = p_referred_id and status = 'pending'
    for update;

  if not found then
    return; -- không có referral đang chờ, không làm gì cả
  end if;

  update public.referrals
     set status = 'completed', completed_at = now()
   where id = v_ref.id;

  perform public.add_points(v_ref.referrer_id, 100, 'referral_out', v_ref.id);
  perform public.add_points(v_ref.referred_id, 50, 'referral_in', v_ref.id);

  update public.referrals set status = 'rewarded' where id = v_ref.id;
end;
$$;

-- Lưu ý: quyền bảng cơ sở (GRANT/REVOKE) cho points_ledger, referrals,
-- redemptions, payments được khai báo tập trung ở mục 7b bên dưới, sau khi
-- đã bật RLS và tạo policy — tránh khai báo rải rác gây khó theo dõi.

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.profiles      enable row level security;
alter table public.posts         enable row level security;
alter table public.follows       enable row level security;
alter table public.likes         enable row level security;
alter table public.comments      enable row level security;
alter table public.points_ledger enable row level security;
alter table public.referrals     enable row level security;
alter table public.rewards       enable row level security;
alter table public.redemptions   enable row level security;
alter table public.notifications enable row level security;
alter table public.payments      enable row level security;

-- profiles: ai cũng xem được hồ sơ công khai, chỉ chủ tài khoản sửa được
create policy "profiles_select_public" on public.profiles for select using (true);
create policy "profiles_update_own"    on public.profiles for update using (auth.uid() = id);

-- posts: ai cũng xem bài chưa xóa, chỉ chủ bài đăng/sửa/xóa (soft delete = update)
create policy "posts_select_public" on public.posts for select using (deleted_at is null);
create policy "posts_insert_own"    on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own"    on public.posts for update using (auth.uid() = user_id);

-- follows: ai cũng xem được, chỉ tự thao tác theo dõi/bỏ theo dõi cho chính mình
create policy "follows_select_public" on public.follows for select using (true);
create policy "follows_insert_own"    on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own"    on public.follows for delete using (auth.uid() = follower_id);

-- likes
create policy "likes_select_public" on public.likes for select using (true);
create policy "likes_insert_own"    on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own"    on public.likes for delete using (auth.uid() = user_id);

-- comments
create policy "comments_select_public" on public.comments for select using (true);
create policy "comments_insert_own"    on public.comments for insert with check (auth.uid() = user_id);

-- points_ledger: chỉ xem được giao dịch của chính mình (insert đã bị revoke ở trên)
create policy "ledger_select_own" on public.points_ledger for select using (auth.uid() = user_id);

-- referrals: chỉ xem được referral liên quan đến mình
create policy "referrals_select_own" on public.referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referred_id);

-- rewards: ai cũng xem được danh mục đang hoạt động
create policy "rewards_select_active" on public.rewards for select using (active = true);

-- redemptions: chỉ xem được lịch sử đổi điểm của chính mình (insert qua function redeem_reward)
create policy "redemptions_select_own" on public.redemptions for select using (auth.uid() = user_id);

-- notifications: chỉ xem/đánh dấu đã đọc thông báo của chính mình
create policy "notifications_select_own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update using (auth.uid() = user_id);

-- payments: chỉ xem được giao dịch nạp tiền của chính mình (insert/update qua webhook backend)
create policy "payments_select_own" on public.payments for select using (auth.uid() = user_id);

-- ============================================================================
-- 7b. GRANT quyền bảng cơ sở cho anon / authenticated
-- ----------------------------------------------------------------------------
-- QUAN TRỌNG: RLS chỉ LỌC hàng, không tự cấp quyền — nếu role chưa có GRANT
-- SELECT/INSERT/... trên bảng thì mọi câu lệnh đều bị chặn với lỗi
-- "permission denied for table ..." bất kể policy cho phép gì. Supabase thường
-- tự cấu hình sẵn các GRANT này ở tầng project, nhưng khai báo tường minh ở
-- đây để schema tự đủ, không phụ thuộc vào cấu hình ngầm định của nền tảng.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select on public.profiles, public.posts, public.follows, public.likes,
  public.comments, public.rewards to anon, authenticated;

grant insert, update on public.profiles to authenticated;
grant insert, update on public.posts to authenticated;
grant insert, delete on public.follows to authenticated;
grant insert, delete on public.likes to authenticated;
grant insert on public.comments to authenticated;
grant update on public.notifications to authenticated;

grant select on public.points_ledger, public.referrals, public.redemptions,
  public.notifications, public.payments to authenticated;

-- points_ledger: chặn insert/update/delete trực tiếp — chỉ ghi qua add_points
revoke insert, update, delete on public.points_ledger from authenticated;

-- referrals, redemptions, payments: chỉ đọc trực tiếp — mọi thay đổi đi qua
-- function SECURITY DEFINER (complete_referral, redeem_reward, webhook)
revoke insert, update, delete on public.referrals, public.redemptions, public.payments from authenticated;

-- ============================================================================
-- 7c. KHÓA QUYỀN GỌI FUNCTION NHẠY CẢM
-- ----------------------------------------------------------------------------
-- add_points và complete_referral nhận user_id/referred_id làm tham số mà
-- KHÔNG tự kiểm tra người gọi có phải chính chủ hay không — nếu client gọi
-- thẳng được 2 hàm này, một người dùng có thể tự cộng điểm cho mình. Cả 2 chỉ
-- được gọi từ ngữ cảnh đáng tin cậy: trigger nội bộ, Edge Function (service
-- role). redeem_reward an toàn để client gọi trực tiếp vì tự lấy auth.uid().
-- ============================================================================

revoke execute on function public.add_points(uuid, integer, text, uuid) from public, authenticated, anon;
revoke execute on function public.complete_referral(uuid) from public, authenticated, anon;
grant execute on function public.redeem_reward(uuid) to authenticated;

-- ============================================================================
-- 8. SEED DATA MẪU (rewards khởi điểm — chỉnh sửa theo thực tế trước khi chạy)
-- ============================================================================

insert into public.rewards (name, description, points_cost, stock, active) values
  ('Huy hiệu Người khai phá', 'Huy hiệu đặc biệt hiển thị trên hồ sơ cho người tham gia sớm', 200, null, true),
  ('Khung avatar giới hạn', 'Khung ảnh đại diện phiên bản giới hạn', 150, null, true);

-- ============================================================================
-- HẾT FILE. Sau khi chạy: kiểm tra lại bằng `select * from pg_policies where schemaname = 'public';`
-- ============================================================================

-- Bổ sung cột username (app/types đang dùng; schema gốc chưa có)


alter table public.profiles add column if not exists username text;

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
-- sql/storage/05-storage-policies.sql

-- Buckets (public read; upload giới hạn theo user_id ở policy bên dưới)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- avatars: chỉ upload vào thư mục {user_id}/ của chính mình
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- avatars: ai cũng đọc được (public bucket)
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- post-images: chỉ upload vào thư mục {user_id}/ của chính mình
DROP POLICY IF EXISTS "post_images_insert_own" ON storage.objects;
CREATE POLICY "post_images_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- post-images: ai cũng đọc được
DROP POLICY IF EXISTS "post_images_select_public" ON storage.objects;
CREATE POLICY "post_images_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-images');

-- >>> sql/migrations/06-payments-table.sql
-- sql/migrations/06-payments-table.sql
-- Bảng payments: ghi nhận giao dịch nạp tiền qua cổng thanh toán bên thứ ba.
-- INSERT/UPDATE chỉ được thực hiện qua Edge Function (service_role) hoặc trigger DB.

create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  amount_vnd      integer not null check (amount_vnd > 0),
  gateway         text not null check (gateway in ('payos', 'vnpay', 'momo')),
  gateway_txn_id  text,
  status          text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_payments_user on public.payments (user_id, created_at desc);

-- RLS
alter table public.payments enable row level security;

-- User có thể xem giao dịch của chính mình
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

-- User có thể INSERT giao dịch pending (webhook sẽ update status).
-- ponytail: đây là trade-off có chủ ý — Server Action tạo row 'pending', webhook
-- xác thực chữ ký VNPay và mới update status. Nếu cần lock hoàn toàn INSERT,
-- tạo thêm Edge Function create-payment chạy với service_role.
drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);

-- UPDATE/DELETE chỉ qua service_role (Edge Function payment-webhook)
revoke update, delete on public.payments from authenticated;

-- >>> sql/migrations/07-complete-payment-rpc.sql
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

-- >>> sql/migrations/08a-fix-count-triggers.sql
-- sql/migrations/08a-fix-count-triggers.sql
-- Fix: add SECURITY DEFINER so trigger can UPDATE posts owned by other users

CREATE OR REPLACE FUNCTION public.sync_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- >>> sql/migrations/08b-phase2-core.sql
-- sql/migrations/08b-phase2-core.sql

-- 1. Add payment_type to existing payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'topup'
  CHECK (payment_type IN ('topup', 'subscription'));

-- 2. Extend points_ledger reason_code constraint
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_code_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_code_check
  CHECK (reason_code IN (
    'signup', 'profile_complete', 'streak', 'post',
    'referral_in', 'referral_out', 'redeem', 'adjustment',
    'savings_goal_achieved', 'subscription_points', 'topup'
  ));

-- 3. Extend notifications type constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'like', 'comment', 'points', 'referral', 'finance', 'todo'));

-- 4. categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  icon       text,
  type       text NOT NULL CHECK (type IN ('income', 'expense')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id),
  type        text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_vnd  integer NOT NULL CHECK (amount_vnd > 0),
  note        text CHECK (note IS NULL OR char_length(note) <= 200),
  occurred_at date NOT NULL DEFAULT current_date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_month ON public.transactions (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories (user_id);

-- 7. RLS
ALTER TABLE public.categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- 8. GRANT (RLS alone is not enough)
GRANT SELECT, INSERT ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;

-- 9. Default categories seed
INSERT INTO public.categories (user_id, name, icon, type) VALUES
  (NULL, 'Ăn uống',   '🍜', 'expense'),
  (NULL, 'Di chuyển', '🚗', 'expense'),
  (NULL, 'Hóa đơn',   '🧾', 'expense'),
  (NULL, 'Giải trí',  '🎮', 'expense'),
  (NULL, 'Lương',     '💰', 'income'),
  (NULL, 'Khác',      '📦', 'expense')
ON CONFLICT DO NOTHING;

-- >>> sql/migrations/08c-phase2-budgets.sql
-- sql/migrations/08c-phase2-budgets.sql

CREATE TABLE IF NOT EXISTS public.budgets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES public.categories(id),
  month        date NOT NULL, -- always day 1 of month, e.g. 2026-09-01
  limit_amount integer NOT NULL CHECK (limit_amount > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets (user_id, month);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_select" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;

-- >>> sql/migrations/08d-phase2-savings.sql
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

-- >>> sql/migrations/08e-phase2-productivity.sql
-- sql/migrations/08e-phase2-productivity.sql

CREATE TABLE IF NOT EXISTS public.notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text CHECK (title IS NULL OR char_length(title) <= 100),
  content    text CHECK (content IS NULL OR char_length(content) <= 5000),
  pinned     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.todos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title      text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  done       boolean NOT NULL DEFAULT false,
  due_date   date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON public.notes (user_id, pinned, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_user_done   ON public.todos (user_id, done, due_date);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select" ON public.notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert" ON public.notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update" ON public.notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete" ON public.notes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "todos_select" ON public.todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "todos_insert" ON public.todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "todos_update" ON public.todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "todos_delete" ON public.todos FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todos TO authenticated;

-- notes.updated_at auto-update (reuse set_updated_at() from Phase 1)
CREATE TRIGGER trg_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- >>> sql/migrations/08f-phase2-billing.sql
-- sql/migrations/08f-phase2-billing.sql

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan           text NOT NULL DEFAULT 'premium' CHECK (plan IN ('premium')),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  payment_method text NOT NULL CHECK (payment_method IN ('points', 'vnpay')),
  started_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.subscriptions TO authenticated;

-- Client cannot INSERT/UPDATE/DELETE directly
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated, anon, public;

-- RPC: subscribe via points
CREATE OR REPLACE FUNCTION public.subscribe_premium_with_points()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_points_cost CONSTANT integer := 500; -- ponytail: change when founder confirms pricing
  v_sub_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Yeu cau dang nhap';
  END IF;

  -- Deduct points (will fail if balance insufficient due to check(balance_after >= 0) on points_ledger)
  PERFORM public.add_points(v_user_id, -v_points_cost, 'subscription_points', NULL);

  INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
  VALUES (v_user_id, 'premium', 'active', 'points', now() + interval '30 days')
  ON CONFLICT (user_id) DO UPDATE
    SET expires_at    = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
        status        = 'active',
        payment_method = 'points';

  SELECT id INTO v_sub_id FROM public.subscriptions WHERE user_id = v_user_id;
  RETURN v_sub_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.subscribe_premium_with_points() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_premium_with_points() TO authenticated;

-- >>> sql/migrations/09-extend-complete-payment.sql
-- Migration 09: Extend complete_payment() to handle payment_type = 'subscription'
-- Replaces the topup-only implementation with a branch on payment_type.

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
  v_payment payments%ROWTYPE;
  v_delta   integer;
  v_err     text;
BEGIN
  UPDATE payments
  SET    status = 'succeeded',
         gateway_txn_id = p_gateway_txn_id
  WHERE  gateway_txn_id = p_gateway_txn_id
    AND  gateway         = p_gateway
    AND  status          = 'pending'
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', true, 'skipped', true);
  END IF;

  IF v_payment.payment_type = 'subscription' THEN
    INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
    VALUES (v_payment.user_id, 'premium', 'active', 'vnpay', now() + interval '30 days')
    ON CONFLICT (user_id) DO UPDATE
      SET expires_at     = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
          status         = 'active',
          payment_method = 'vnpay';
    RETURN json_build_object('ok', true, 'subscription', true, 'payment_id', v_payment.id);
  ELSE
    -- Default: topup — convert VND to points (1.000đ = 1 point)
    v_delta := FLOOR(v_payment.amount_vnd::numeric / 1000)::integer;
    IF v_delta > 0 THEN
      PERFORM public.add_points(v_payment.user_id, v_delta, 'topup', v_payment.id);
    END IF;
    RETURN json_build_object('ok', true, 'payment_id', v_payment.id, 'points', v_delta);
  END IF;

EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
  RETURN json_build_object('ok', false, 'error', v_err);
END;
$$;

-- Permissions stay the same (already REVOKE'd from public/anon/authenticated)
REVOKE EXECUTE ON FUNCTION public.complete_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment(text, text) TO service_role;

-- >>> sql/migrations/09b-budget-upsert-rpc.sql
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

-- >>> sql/migrations/10-phase3-admin-referral.sql
-- sql/migrations/10-phase3-admin-referral.sql
-- ============================================================================
-- PHASE 3 — TRACK A: ADMIN ROLE, REFERRAL CODE, NOTIFICATION TYPE
-- ============================================================================

-- 1. Admin role + lock columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts    ADD COLUMN IF NOT EXISTS hidden  boolean NOT NULL DEFAULT false;

-- 2. metadata on payments (needed for shop VNPay purchase — store product_id)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 3. Extend payment_type to include shop_purchase
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_type_check
  CHECK (payment_type IN ('topup', 'subscription', 'shop_purchase'));

-- 4. Referral code — unique, generated once at profile creation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_tries integer := 0;
BEGIN
  IF new.referral_code IS NOT NULL THEN RETURN new; END IF;
  LOOP
    v_tries := v_tries + 1;
    v_code := lower(substr(md5(new.id::text || clock_timestamp()::text || v_tries::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code);
    IF v_tries > 5 THEN
      RAISE EXCEPTION 'Khong sinh duoc ma referral duy nhat sau 5 lan thu';
    END IF;
  END LOOP;
  new.referral_code := v_code;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_referral_code ON public.profiles;
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Backfill for existing users (idempotent — skips rows that already have a code)
UPDATE public.profiles
SET referral_code = lower(substr(md5(id::text || clock_timestamp()::text), 1, 8))
WHERE referral_code IS NULL;

-- 5. Extend notifications.type — add 'shop' (was: follow,like,comment,points,referral,finance,todo)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow','like','comment','points','referral','finance','todo','shop'));

-- 6. is_admin() — SECURITY DEFINER to avoid RLS infinite recursion on profiles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;
-- anon cũng cần EXECUTE vì policy admin_* được evaluate khi anon đọc posts/profiles.
-- Hàm chỉ trả false khi auth.uid() null nên không lộ quyền admin.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 7. Admin RLS policies (additive — existing user policies stay)
CREATE POLICY "admin_select_all_profiles"       ON public.profiles     FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_update_lock_profiles"      ON public.profiles     FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_select_all_posts"          ON public.posts        FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_update_hide_posts"         ON public.posts        FOR UPDATE USING (public.is_admin());
CREATE POLICY "admin_select_all_payments"       ON public.payments     FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_select_all_subscriptions"  ON public.subscriptions FOR SELECT USING (public.is_admin());

-- 8. get_referrer_by_code — public lookup (needed for unauthenticated /join visitors)
CREATE OR REPLACE FUNCTION public.get_referrer_by_code(p_code text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.profiles WHERE referral_code = p_code LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_referrer_by_code(text) TO authenticated, anon;

-- >>> sql/migrations/11-phase3-shop-marketplace.sql
-- sql/migrations/11-phase3-shop-marketplace.sql
-- ============================================================================
-- PHASE 3 — TRACK B: SHOP MARKETPLACE
-- ============================================================================

-- 1. Extend points_ledger reason_code
ALTER TABLE public.points_ledger DROP CONSTRAINT IF EXISTS points_ledger_reason_code_check;
ALTER TABLE public.points_ledger ADD CONSTRAINT points_ledger_reason_code_check
  CHECK (reason_code IN (
    'signup','profile_complete','streak','post','referral_in',
    'referral_out','redeem','adjustment','savings_goal_achieved',
    'subscription_points','shop_purchase_points','topup'
  ));

-- 2. Partners
CREATE TABLE IF NOT EXISTS public.shop_partners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  logo_url   text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Products
CREATE TABLE IF NOT EXISTS public.shop_products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   uuid NOT NULL REFERENCES public.shop_partners(id) ON DELETE RESTRICT,
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description  text,
  image_url    text,
  price_points integer CHECK (price_points IS NULL OR price_points > 0),
  price_vnd    integer CHECK (price_vnd IS NULL OR price_vnd > 0),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_products_price_check CHECK (price_points IS NOT NULL OR price_vnd IS NOT NULL)
);

-- 4. Code inventory — NEVER grant to client
CREATE TABLE IF NOT EXISTS public.shop_product_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE RESTRICT,
  code              text NOT NULL,
  assigned_order_id uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, code)
);
CREATE INDEX IF NOT EXISTS idx_shop_codes_available
  ON public.shop_product_codes (product_id) WHERE assigned_order_id IS NULL;

-- 5. Orders
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES public.shop_products(id),
  code_id        uuid REFERENCES public.shop_product_codes(id),
  payment_method text NOT NULL CHECK (payment_method IN ('points', 'vnpay')),
  amount_points  integer,
  amount_vnd     integer,
  status         text NOT NULL DEFAULT 'fulfilled' CHECK (status IN ('fulfilled', 'failed')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON public.shop_orders (user_id, created_at DESC);

-- 6. Purchase with points — SKIP LOCKED for concurrent safety
CREATE OR REPLACE FUNCTION public.purchase_product_with_points(p_product_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_price    integer;
  v_code_id  uuid;
  v_order_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Yeu cau dang nhap'; END IF;

  SELECT price_points INTO v_price
    FROM public.shop_products
   WHERE id = p_product_id AND active;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'San pham khong kha dung hoac khong ho tro mua bang diem';
  END IF;

  -- Lock exactly 1 available code; skip any row another transaction has locked
  SELECT id INTO v_code_id
    FROM public.shop_product_codes
   WHERE product_id = p_product_id AND assigned_order_id IS NULL
   FOR UPDATE SKIP LOCKED
   LIMIT 1;
  IF v_code_id IS NULL THEN RAISE EXCEPTION 'Het ma, vui long thu lai sau'; END IF;

  -- Deduct points (add_points validates balance internally)
  PERFORM public.add_points(v_user_id, -v_price, 'shop_purchase_points', p_product_id);

  INSERT INTO public.shop_orders (user_id, product_id, code_id, payment_method, amount_points, status)
  VALUES (v_user_id, p_product_id, v_code_id, 'points', v_price, 'fulfilled')
  RETURNING id INTO v_order_id;

  UPDATE public.shop_product_codes SET assigned_order_id = v_order_id WHERE id = v_code_id;

  RETURN v_order_id;
END;
$$;

-- 7. Reveal code — only for order owner
CREATE OR REPLACE FUNCTION public.get_my_order_code(p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT spc.code INTO v_code
    FROM public.shop_orders so
    JOIN public.shop_product_codes spc ON spc.id = so.code_id
   WHERE so.id = p_order_id AND so.user_id = auth.uid();
  IF v_code IS NULL THEN RAISE EXCEPTION 'Khong co quyen xem ma nay'; END IF;
  RETURN v_code;
END;
$$;

-- 8. RLS
ALTER TABLE public.shop_partners      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_product_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_partners_select_active" ON public.shop_partners FOR SELECT USING (active);
CREATE POLICY "shop_products_select_active" ON public.shop_products FOR SELECT USING (active);
CREATE POLICY "shop_orders_select_own"      ON public.shop_orders   FOR SELECT USING (auth.uid() = user_id);

-- Admin sees and manages everything
CREATE POLICY "admin_all_shop_partners" ON public.shop_partners FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "admin_all_shop_products" ON public.shop_products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "admin_all_shop_codes" ON public.shop_product_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "admin_all_shop_orders" ON public.shop_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- 9. GRANT (explicit — RLS alone does not grant table access)
GRANT SELECT ON public.shop_partners, public.shop_products TO authenticated, anon;
GRANT SELECT ON public.shop_orders TO authenticated;
-- shop_product_codes: NO GRANT to any client role — codes only via get_my_order_code()
REVOKE ALL ON public.shop_product_codes FROM authenticated, anon, public;

GRANT EXECUTE ON FUNCTION public.purchase_product_with_points(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_order_code(uuid) TO authenticated;

-- >>> sql/migrations/12-complete-payment-shop.sql
-- Migration 12: Extend complete_payment() to handle payment_type = 'shop_purchase'
-- Adds shop_purchase branch; topup + subscription branches unchanged.

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
  v_code_id  uuid;
  v_order_id uuid;
  v_product_id uuid;
  v_err      text;
BEGIN
  UPDATE payments
  SET    status = 'succeeded',
         gateway_txn_id = p_gateway_txn_id
  WHERE  gateway_txn_id = p_gateway_txn_id
    AND  gateway         = p_gateway
    AND  status          = 'pending'
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', true, 'skipped', true);
  END IF;

  IF v_payment.payment_type = 'subscription' THEN
    INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
    VALUES (v_payment.user_id, 'premium', 'active', 'vnpay', now() + interval '30 days')
    ON CONFLICT (user_id) DO UPDATE
      SET expires_at     = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
          status         = 'active',
          payment_method = 'vnpay';
    RETURN json_build_object('ok', true, 'subscription', true, 'payment_id', v_payment.id);

  ELSIF v_payment.payment_type = 'shop_purchase' THEN
    -- product_id stored in payments.metadata when creating the VNPay link
    v_product_id := (v_payment.metadata->>'product_id')::uuid;
    IF v_product_id IS NULL THEN
      RETURN json_build_object('ok', false, 'error', 'shop_purchase missing product_id in metadata');
    END IF;

    SELECT id INTO v_code_id
      FROM public.shop_product_codes
     WHERE product_id = v_product_id AND assigned_order_id IS NULL
     FOR UPDATE SKIP LOCKED
     LIMIT 1;
    IF v_code_id IS NULL THEN
      -- No code available — mark order failed, refund is a manual ops task
      INSERT INTO public.shop_orders (user_id, product_id, payment_method, amount_vnd, status)
      VALUES (v_payment.user_id, v_product_id, 'vnpay', v_payment.amount_vnd, 'failed')
      RETURNING id INTO v_order_id;
      RETURN json_build_object('ok', false, 'error', 'Het ma', 'order_id', v_order_id);
    END IF;

    INSERT INTO public.shop_orders (user_id, product_id, code_id, payment_method, amount_vnd, status)
    VALUES (v_payment.user_id, v_product_id, v_code_id, 'vnpay', v_payment.amount_vnd, 'fulfilled')
    RETURNING id INTO v_order_id;

    UPDATE public.shop_product_codes SET assigned_order_id = v_order_id WHERE id = v_code_id;

    RETURN json_build_object('ok', true, 'shop_purchase', true, 'order_id', v_order_id);

  ELSE
    -- Default: topup — convert VND to points (1.000đ = 1 point)
    v_delta := FLOOR(v_payment.amount_vnd::numeric / 1000)::integer;
    IF v_delta > 0 THEN
      PERFORM public.add_points(v_payment.user_id, v_delta, 'topup', v_payment.id);
    END IF;
    RETURN json_build_object('ok', true, 'payment_id', v_payment.id, 'points', v_delta);
  END IF;

EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
  RETURN json_build_object('ok', false, 'error', v_err);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.complete_payment(text, text) TO service_role;

-- >>> sql/migrations/13-phase3-security-fixes.sql
-- Migration 13: Phase 3 security hardening
-- Fix 1: Narrow profiles UPDATE grant — prevent self-escalation
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, bio, status, updated_at, streak_count, last_login_date)
  ON public.profiles TO authenticated;
-- role, locked, points_balance, referral_code intentionally omitted

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND locked = (SELECT locked FROM public.profiles WHERE id = auth.uid())
    AND points_balance = (SELECT points_balance FROM public.profiles WHERE id = auth.uid())
  );

-- Fix 2: Referral insert RPC (avoids direct authenticated access to referrals table)
CREATE OR REPLACE FUNCTION public.create_referral(p_referrer_id uuid, p_referred_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF p_referrer_id = p_referred_id THEN RETURN; END IF;
  SELECT referral_code INTO v_code FROM public.profiles WHERE id = p_referrer_id;
  IF v_code IS NULL THEN RETURN; END IF;
  INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
  VALUES (p_referrer_id, p_referred_id, v_code, 'pending')
  ON CONFLICT DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_referral(uuid, uuid) TO authenticated;

-- Fix 3: Admin shop write privileges (RLS policies already limit to admins)
GRANT INSERT, UPDATE, DELETE ON public.shop_partners TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_products TO authenticated;

-- Fix 4: SECURITY DEFINER RPC for bulk code import
-- shop_product_codes stays locked down — codes only via get_my_order_code
CREATE OR REPLACE FUNCTION public.admin_import_codes(p_product_id uuid, p_codes text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code text;
  v_count integer := 0;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  FOREACH v_code IN ARRAY p_codes
  LOOP
    INSERT INTO public.shop_product_codes (product_id, code)
    VALUES (p_product_id, v_code)
    ON CONFLICT (product_id, code) DO NOTHING;
    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_import_codes(uuid, text[]) TO authenticated;

-- Fix 5: Replace complete_payment with amount validation guard
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
  v_payment        payments%ROWTYPE;
  v_delta          integer;
  v_code_id        uuid;
  v_order_id       uuid;
  v_product_id     uuid;
  v_product_price  integer;
  v_err            text;
BEGIN
  UPDATE payments
  SET    status = 'succeeded',
         gateway_txn_id = p_gateway_txn_id
  WHERE  gateway_txn_id = p_gateway_txn_id
    AND  gateway         = p_gateway
    AND  status          = 'pending'
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', true, 'skipped', true);
  END IF;

  IF v_payment.payment_type = 'subscription' THEN
    INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
    VALUES (v_payment.user_id, 'premium', 'active', 'vnpay', now() + interval '30 days')
    ON CONFLICT (user_id) DO UPDATE
      SET expires_at     = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
          status         = 'active',
          payment_method = 'vnpay';
    RETURN json_build_object('ok', true, 'subscription', true, 'payment_id', v_payment.id);

  ELSIF v_payment.payment_type = 'shop_purchase' THEN
    v_product_id := (v_payment.metadata->>'product_id')::uuid;
    IF v_product_id IS NULL THEN
      RETURN json_build_object('ok', false, 'error', 'shop_purchase missing product_id in metadata');
    END IF;

    -- Validate payment amount matches product price
    SELECT price_vnd INTO v_product_price FROM public.shop_products WHERE id = v_product_id;
    IF v_product_price IS NOT NULL AND v_payment.amount_vnd < v_product_price THEN
      RETURN json_build_object('ok', false, 'error', 'amount mismatch');
    END IF;

    SELECT id INTO v_code_id
      FROM public.shop_product_codes
     WHERE product_id = v_product_id AND assigned_order_id IS NULL
     FOR UPDATE SKIP LOCKED
     LIMIT 1;
    IF v_code_id IS NULL THEN
      INSERT INTO public.shop_orders (user_id, product_id, payment_method, amount_vnd, status)
      VALUES (v_payment.user_id, v_product_id, 'vnpay', v_payment.amount_vnd, 'failed')
      RETURNING id INTO v_order_id;
      RETURN json_build_object('ok', false, 'error', 'Het ma', 'order_id', v_order_id);
    END IF;

    INSERT INTO public.shop_orders (user_id, product_id, code_id, payment_method, amount_vnd, status)
    VALUES (v_payment.user_id, v_product_id, v_code_id, 'vnpay', v_payment.amount_vnd, 'fulfilled')
    RETURNING id INTO v_order_id;

    UPDATE public.shop_product_codes SET assigned_order_id = v_order_id WHERE id = v_code_id;

    RETURN json_build_object('ok', true, 'shop_purchase', true, 'order_id', v_order_id);

  ELSE
    -- Default: topup — convert VND to points (1.000đ = 1 point)
    v_delta := FLOOR(v_payment.amount_vnd::numeric / 1000)::integer;
    IF v_delta > 0 THEN
      PERFORM public.add_points(v_payment.user_id, v_delta, 'topup', v_payment.id);
    END IF;
    RETURN json_build_object('ok', true, 'payment_id', v_payment.id, 'points', v_delta);
  END IF;

EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
  RETURN json_build_object('ok', false, 'error', v_err);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.complete_payment(text, text) TO service_role;

-- >>> sql/migrations/14-parked-fixes.sql
-- Migration 14: Fix parked findings from Phase 3 final review
-- 1. UNIQUE index on shop_product_codes.assigned_order_id — prevents double-assignment
--    at DB level (RPC logic is already correct; this makes it impossible, not merely unlikely)
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_codes_assigned_unique
  ON public.shop_product_codes (assigned_order_id)
  WHERE assigned_order_id IS NOT NULL;

-- 2. Notify buyer when paid-but-no-code (code exhausted after payment)
--    Replaces the complete_payment() shop_purchase branch with one that emits
--    a 'shop' notification on failure so the buyer knows and ops can track it.
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
  v_payment        payments%ROWTYPE;
  v_delta          integer;
  v_code_id        uuid;
  v_order_id       uuid;
  v_product_id     uuid;
  v_product_price  integer;
  v_err            text;
BEGIN
  UPDATE payments
  SET    status = 'succeeded',
         gateway_txn_id = p_gateway_txn_id
  WHERE  gateway_txn_id = p_gateway_txn_id
    AND  gateway         = p_gateway
    AND  status          = 'pending'
  RETURNING * INTO v_payment;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', true, 'skipped', true);
  END IF;

  IF v_payment.payment_type = 'subscription' THEN
    INSERT INTO public.subscriptions (user_id, plan, status, payment_method, expires_at)
    VALUES (v_payment.user_id, 'premium', 'active', 'vnpay', now() + interval '30 days')
    ON CONFLICT (user_id) DO UPDATE
      SET expires_at     = GREATEST(subscriptions.expires_at, now()) + interval '30 days',
          status         = 'active',
          payment_method = 'vnpay';
    RETURN json_build_object('ok', true, 'subscription', true, 'payment_id', v_payment.id);

  ELSIF v_payment.payment_type = 'shop_purchase' THEN
    v_product_id := (v_payment.metadata->>'product_id')::uuid;
    IF v_product_id IS NULL THEN
      RETURN json_build_object('ok', false, 'error', 'shop_purchase missing product_id in metadata');
    END IF;

    -- Validate payment amount matches product price
    SELECT price_vnd INTO v_product_price FROM public.shop_products WHERE id = v_product_id;
    IF v_product_price IS NOT NULL AND v_payment.amount_vnd < v_product_price THEN
      RETURN json_build_object('ok', false, 'error', 'amount mismatch');
    END IF;

    SELECT id INTO v_code_id
      FROM public.shop_product_codes
     WHERE product_id = v_product_id AND assigned_order_id IS NULL
     FOR UPDATE SKIP LOCKED
     LIMIT 1;

    IF v_code_id IS NULL THEN
      -- No code available: record failed order, notify buyer, leave payment as succeeded
      -- (money was received; ops must issue manual refund — notification creates the audit trail)
      INSERT INTO public.shop_orders (user_id, product_id, payment_method, amount_vnd, status)
      VALUES (v_payment.user_id, v_product_id, 'vnpay', v_payment.amount_vnd, 'failed')
      RETURNING id INTO v_order_id;

      INSERT INTO public.notifications (user_id, type, payload)
      VALUES (
        v_payment.user_id,
        'shop',
        json_build_object(
          'message', 'Thanh toán thành công nhưng sản phẩm đã hết mã. Chúng tôi sẽ hoàn tiền trong 3-5 ngày làm việc.',
          'order_id', v_order_id,
          'payment_id', v_payment.id
        )::jsonb
      );

      RETURN json_build_object('ok', false, 'error', 'Het ma', 'order_id', v_order_id);
    END IF;

    INSERT INTO public.shop_orders (user_id, product_id, code_id, payment_method, amount_vnd, status)
    VALUES (v_payment.user_id, v_product_id, v_code_id, 'vnpay', v_payment.amount_vnd, 'fulfilled')
    RETURNING id INTO v_order_id;

    UPDATE public.shop_product_codes SET assigned_order_id = v_order_id WHERE id = v_code_id;

    RETURN json_build_object('ok', true, 'shop_purchase', true, 'order_id', v_order_id);

  ELSE
    -- Default: topup — convert VND to points (1.000đ = 1 point)
    v_delta := FLOOR(v_payment.amount_vnd::numeric / 1000)::integer;
    IF v_delta > 0 THEN
      PERFORM public.add_points(v_payment.user_id, v_delta, 'topup', v_payment.id);
    END IF;
    RETURN json_build_object('ok', true, 'payment_id', v_payment.id, 'points', v_delta);
  END IF;

EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
  RETURN json_build_object('ok', false, 'error', v_err);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.complete_payment(text, text) TO service_role;

-- >>> sql/migrations/15-search-indexes.sql
-- Migration 15: GIN search indexes for full-text search
-- Enables efficient full-text search on posts and profiles

-- GIN index for full-text search on posts
CREATE INDEX IF NOT EXISTS posts_search_idx
  ON public.posts
  USING GIN (to_tsvector('simple', coalesce(content, '')));

-- GIN index for full-text search on profiles (display_name + username)
CREATE INDEX IF NOT EXISTS profiles_search_idx
  ON public.profiles
  USING GIN (
    to_tsvector('simple',
      coalesce(display_name, '') || ' ' || coalesce(username, ''))
  );

-- >>> sql/migrations/16-referral-code-unique.sql
-- Migration 16: Add UNIQUE constraint to profiles.referral_code
-- Backfills existing users with their SHA-256-derived code (same value they already have
-- if migration 10 already populated it). New users get a random 8-char code via trigger.

-- 1. Backfill: set referral_code for any user that somehow has NULL
--    (uses same formula as migration 10 / the old runtime SHA-256 computation)
update public.profiles
set referral_code = lower(substr(encode(sha256(id::text::bytea), 'hex'), 1, 8))
where referral_code is null;

-- 2. Add UNIQUE constraint (now safe — no NULLs, and SHA-256 of distinct UUIDs is distinct)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_referral_code_unique'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_referral_code_unique unique (referral_code);
  end if;
end;
$$;

-- 3. Trigger function for new users — generates a random 8-char code, retries on collision
create or replace function public.generate_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_tries integer := 0;
begin
  -- If code already set (e.g. backfill or explicit insert), keep it
  if new.referral_code is not null then
    return new;
  end if;
  loop
    v_tries := v_tries + 1;
    v_code := lower(substr(md5(new.id::text || clock_timestamp()::text || v_tries::text), 1, 8));
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
    if v_tries > 5 then
      raise exception 'Không sinh được mã referral duy nhất sau 6 lần thử';
    end if;
  end loop;
  new.referral_code := v_code;
  return new;
end;
$$;

-- 4. Attach trigger (only fires on INSERT — updates are not affected)
drop trigger if exists trg_generate_referral_code on public.profiles;
create trigger trg_generate_referral_code
  before insert on public.profiles
  for each row execute function public.generate_referral_code();

-- >>> sql/migrations/17-search-advanced.sql
-- Migration 17: Advanced search — ts_rank ranking + pg_trgm autocomplete
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Wrapper required to use unaccent() in indexes/generated columns
-- (unaccent() is STABLE, not IMMUTABLE — this wrapper is safe because the
-- 'unaccent' dictionary itself never changes between calls)
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select unaccent($1);
$$;

-- GIN trigram index for autocomplete on post content (unaccented)
create index if not exists posts_content_trgm_idx
  on public.posts using gin (public.immutable_unaccent(content) gin_trgm_ops);

-- GIN trigram index for user display_name autocomplete
create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (public.immutable_unaccent(display_name) gin_trgm_ops);

-- Autocomplete RPC: returns posts whose content trigram-matches the query
create or replace function public.autocomplete_posts(p_query text, p_limit integer default 5)
returns table (content text)
language sql
security definer
set search_path = public, extensions
stable
as $$
  select p.content
  from public.posts p
  where p.hidden = false
    and p.deleted_at is null
    and public.immutable_unaccent(p.content) % public.immutable_unaccent(p_query)
  order by similarity(public.immutable_unaccent(p.content), public.immutable_unaccent(p_query)) desc
  limit p_limit;
$$;

grant execute on function public.autocomplete_posts(text, integer) to authenticated, anon;

-- >>> sql/migrations/18-finance-trend-rpc.sql
-- Migration 18: Premium analytics — get_finance_trend() RPC
create or replace function public.get_finance_trend(p_months integer default 6)
returns table (month date, total_income integer, total_expense integer)
language sql
security definer
set search_path = public
stable
as $$
  select
    date_trunc('month', occurred_at)::date as month,
    coalesce(sum(amount_vnd) filter (where type = 'income'), 0)::integer as total_income,
    coalesce(sum(amount_vnd) filter (where type = 'expense'), 0)::integer as total_expense
  from public.transactions
  where user_id = auth.uid()
    and occurred_at >= (current_date - (p_months || ' months')::interval)
  group by 1
  order by 1;
$$;

grant execute on function public.get_finance_trend(integer) to authenticated;

-- >>> sql/migrations/19-referral-analytics.sql
-- Migration 19: Referral analytics — get_referral_stats() RPC + leaderboard view

-- RPC: personal referral stats for the current user
create or replace function public.get_referral_stats()
returns table (total_invited integer, total_completed integer, points_earned integer)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(r.id)::integer as total_invited,
    count(r.id) filter (where r.status in ('completed', 'rewarded'))::integer as total_completed,
    coalesce(
      sum(pl.delta) filter (where pl.reason_code = 'referral_out'),
      0
    )::integer as points_earned
  from public.referrals r
  left join public.points_ledger pl
    on pl.reference_id = r.id
    and pl.user_id = r.referrer_id
  where r.referrer_id = auth.uid();
$$;

grant execute on function public.get_referral_stats() to authenticated;

-- View: public leaderboard (display_name + avatar only — no financial data)
create or replace view public.referral_leaderboard as
  select
    p.display_name,
    p.avatar_url,
    count(r.id) filter (where r.status in ('completed', 'rewarded'))::integer as total_referrals
  from public.referrals r
  join public.profiles p on p.id = r.referrer_id
  group by p.id, p.display_name, p.avatar_url
  having count(r.id) filter (where r.status in ('completed', 'rewarded')) > 0
  order by total_referrals desc
  limit 50;

grant select on public.referral_leaderboard to authenticated, anon;

commit;
