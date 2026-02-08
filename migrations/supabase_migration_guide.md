# Part 3: Supabase Migration Guide

## SQL Files

- Schema migration: `migrations/supabase_migration.sql`
- URL remap (local `/uploads/*` -> R2 URL): `migrations/remap_media_urls.sql`

## Exact Columns Migrated to R2 URLs

1. `projects.photo_url`
2. `projects.thumbnail_url`
3. `template_slots.photo_url`
4. `templates.preview_url`
5. `print_templates.final_image_url`

## Run Schema Migration

```bash
psql "<SUPABASE_CONNECTION_STRING>" -f migrations/supabase_migration.sql
```

## Run URL Remap Migration

```bash
psql "<SUPABASE_CONNECTION_STRING>" \
  -v r2_public_url="https://pub-xxxxx.r2.dev" \
  -f migrations/remap_media_urls.sql
```

## Notes

- The schema preserves:
  - `updated_at` triggers for `orders` and `projects`
  - all FK relationships and check constraints
  - all indexes used by list/queue APIs
- RLS is enabled with permissive policies to match current backend behavior (no API auth guard yet).
