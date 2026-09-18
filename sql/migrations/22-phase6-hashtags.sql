-- sql/migrations/22-phase6-hashtags.sql

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Extracts #hashtags from post content into tags[]
-- Rules: lowercase, deduplicated, max 10 tags per post, preserves Vietnamese diacritics
-- Tested: #DuLich and #dulich → {dulich}; #ăn_uống preserved correctly
CREATE OR REPLACE FUNCTION public.extract_hashtags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tags text[];
BEGIN
  SELECT COALESCE(
    (SELECT array_agg(DISTINCT lower(m[1]))
     FROM regexp_matches(NEW.content, '#([[:alnum:]_]+)', 'g') AS m),
    '{}'
  ) INTO v_tags;

  -- Cap at 10 tags to prevent spam
  IF array_length(v_tags, 1) > 10 THEN
    v_tags := v_tags[1:10];
  END IF;

  NEW.tags := v_tags;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_extract_hashtags ON public.posts;
CREATE TRIGGER trg_extract_hashtags
BEFORE INSERT OR UPDATE OF content ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.extract_hashtags();

-- Include posts created before this migration.
UPDATE public.posts SET content = content WHERE content LIKE '%#%';

CREATE INDEX IF NOT EXISTS posts_tags_idx ON public.posts USING GIN(tags);
