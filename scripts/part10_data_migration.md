# Part 10: Existing Data Migration Script

Script: `scripts/migrate_local_to_cloud.sh`

## What it does

1. Exports local PostgreSQL data (`pg_dump` data-only)
2. Imports data into Supabase (`psql`)
3. Uploads local files from `backend/uploads` to Cloudflare R2
4. Remaps media columns to R2 URLs for these 5 columns:
   - `projects.photo_url`
   - `projects.thumbnail_url`
   - `template_slots.photo_url`
   - `templates.preview_url`
   - `print_templates.final_image_url`

## Required environment variables

```bash
export LOCAL_DATABASE_URL="postgresql://...local..."
export SUPABASE_DATABASE_URL="postgresql://...supabase..."
export R2_BUCKET="my-app-media"
export R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
```

Optional:

```bash
export UPLOADS_DIR="backend/uploads"
export EXPORT_FILE="migrations/local_data_dump.sql"
export R2_WRANGLER_ENV="production"
```

## Run

```bash
bash scripts/migrate_local_to_cloud.sh
```

## Partial reruns

```bash
# Re-upload files only + remap URLs
bash scripts/migrate_local_to_cloud.sh --skip-export --skip-import

# Only remap URLs
bash scripts/migrate_local_to_cloud.sh --skip-export --skip-import --skip-upload
```
