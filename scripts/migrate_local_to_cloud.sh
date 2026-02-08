#!/usr/bin/env bash
set -euo pipefail

SKIP_EXPORT="false"
SKIP_IMPORT="false"
SKIP_UPLOAD="false"
SKIP_REMAP="false"

for arg in "$@"; do
  case "$arg" in
    --skip-export) SKIP_EXPORT="true" ;;
    --skip-import) SKIP_IMPORT="true" ;;
    --skip-upload) SKIP_UPLOAD="true" ;;
    --skip-remap) SKIP_REMAP="true" ;;
    *)
      echo "Unknown flag: $arg"
      exit 1
      ;;
  esac
done

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_command pg_dump
require_command psql
require_command wrangler
require_command find

: "${LOCAL_DATABASE_URL:?LOCAL_DATABASE_URL is required}"
: "${SUPABASE_DATABASE_URL:?SUPABASE_DATABASE_URL is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"
: "${R2_PUBLIC_URL:?R2_PUBLIC_URL is required (example: https://pub-xxxxx.r2.dev)}"

UPLOADS_DIR="${UPLOADS_DIR:-backend/uploads}"
EXPORT_FILE="${EXPORT_FILE:-migrations/local_data_dump.sql}"
R2_WRANGLER_ENV="${R2_WRANGLER_ENV:-}"

mkdir -p "$(dirname "$EXPORT_FILE")"

if [[ "$SKIP_EXPORT" != "true" ]]; then
  echo "[1/4] Exporting local PostgreSQL data to $EXPORT_FILE"
  pg_dump "$LOCAL_DATABASE_URL" \
    --data-only \
    --column-inserts \
    --disable-triggers \
    --no-owner \
    --no-privileges \
    --file "$EXPORT_FILE"
else
  echo "[1/4] Skipped export"
fi

if [[ "$SKIP_IMPORT" != "true" ]]; then
  echo "[2/4] Importing data dump into Supabase"
  psql "$SUPABASE_DATABASE_URL" -f "$EXPORT_FILE"
else
  echo "[2/4] Skipped import"
fi

if [[ "$SKIP_UPLOAD" != "true" ]]; then
  echo "[3/4] Uploading local files from $UPLOADS_DIR to R2 bucket $R2_BUCKET"
  if [[ -d "$UPLOADS_DIR" ]]; then
    count=0
    while IFS= read -r -d '' file; do
      rel="${file#"$UPLOADS_DIR"/}"
      if [[ "$rel" == "$file" ]]; then
        rel="$(basename "$file")"
      fi

      if [[ -n "$R2_WRANGLER_ENV" ]]; then
        wrangler r2 object put "$R2_BUCKET/$rel" --file "$file" --env "$R2_WRANGLER_ENV"
      else
        wrangler r2 object put "$R2_BUCKET/$rel" --file "$file"
      fi
      count=$((count + 1))
    done < <(find "$UPLOADS_DIR" -type f -print0)
    echo "Uploaded $count files to R2"
  else
    echo "Upload directory not found ($UPLOADS_DIR); skipping file upload"
  fi
else
  echo "[3/4] Skipped upload"
fi

if [[ "$SKIP_REMAP" != "true" ]]; then
  echo "[4/4] Remapping media URLs in Supabase to R2 public URLs"
  psql "$SUPABASE_DATABASE_URL" -v r2_public_url="$R2_PUBLIC_URL" -f migrations/remap_media_urls.sql
else
  echo "[4/4] Skipped URL remap"
fi

echo "Migration workflow complete."
