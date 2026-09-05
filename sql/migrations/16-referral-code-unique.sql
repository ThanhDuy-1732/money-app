-- Migration 16: Add UNIQUE constraint to profiles.referral_code
-- Backfills existing users with their SHA-256-derived code (same value they already have
-- if migration 10 already populated it). New users get a random 8-char code via trigger.

-- 1. Backfill: set referral_code for any user that somehow has NULL
--    (uses same formula as migration 10 / the old runtime SHA-256 computation)
update public.profiles
set referral_code = lower(substr(encode(sha256(id::text::bytea), 'hex'), 1, 8))
where referral_code is null;

-- 2. Add UNIQUE constraint (now safe — no NULLs, and SHA-256 of distinct UUIDs is distinct)
alter table public.profiles
  add constraint profiles_referral_code_unique unique (referral_code);

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
      raise exception 'Không sinh được mã referral duy nhất sau 5 lần thử';
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
