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
