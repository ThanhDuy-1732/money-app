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
