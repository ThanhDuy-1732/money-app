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
