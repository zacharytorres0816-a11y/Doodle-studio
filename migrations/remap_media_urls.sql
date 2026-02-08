\set ON_ERROR_STOP on

\if :{?r2_public_url}
\else
\echo 'ERROR: missing r2_public_url variable. Example:'
\echo '  psql "$SUPABASE_DATABASE_URL" -v r2_public_url="https://pub-xxxxx.r2.dev" -f migrations/remap_media_urls.sql'
\quit 1
\endif

CREATE OR REPLACE FUNCTION public.to_r2_url(input_url text, r2_base text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  value text := btrim(coalesce(input_url, ''));
  base text := regexp_replace(coalesce(r2_base, ''), '/+$', '');
BEGIN
  IF value = '' OR base = '' THEN
    RETURN input_url;
  END IF;

  IF value ILIKE base || '/%' THEN
    RETURN value;
  END IF;

  IF value LIKE '/uploads/%' THEN
    RETURN base || '/' || ltrim(substr(value, 10), '/');
  END IF;

  IF value LIKE 'uploads/%' THEN
    RETURN base || '/' || ltrim(substr(value, 9), '/');
  END IF;

  IF value ~* '^https?://[^/]+/uploads/' THEN
    RETURN base || '/' || regexp_replace(value, '^https?://[^/]+/uploads/', '', 'i');
  END IF;

  RETURN value;
END;
$$;

UPDATE public.projects
SET photo_url = public.to_r2_url(photo_url, :'r2_public_url')
WHERE photo_url IS NOT NULL;

UPDATE public.projects
SET thumbnail_url = public.to_r2_url(thumbnail_url, :'r2_public_url')
WHERE thumbnail_url IS NOT NULL;

UPDATE public.template_slots
SET photo_url = public.to_r2_url(photo_url, :'r2_public_url')
WHERE photo_url IS NOT NULL;

UPDATE public.templates
SET preview_url = public.to_r2_url(preview_url, :'r2_public_url')
WHERE preview_url IS NOT NULL;

UPDATE public.print_templates
SET final_image_url = public.to_r2_url(final_image_url, :'r2_public_url')
WHERE final_image_url IS NOT NULL;
