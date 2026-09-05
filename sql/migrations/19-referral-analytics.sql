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
