-- Migration 17: Advanced search — ts_rank ranking + pg_trgm autocomplete
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- Wrapper required to use unaccent() in indexes/generated columns
-- (unaccent() is STABLE, not IMMUTABLE — this wrapper is safe because the
-- 'unaccent' dictionary itself never changes between calls)
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', $1);
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
set search_path = public
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
