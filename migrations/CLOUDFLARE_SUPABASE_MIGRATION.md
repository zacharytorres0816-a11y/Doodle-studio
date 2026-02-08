# Cloudflare + Supabase Migration Package (Parts 2-10)

## Part 2: R2 Setup

See: `migrations/r2_setup.md`

## Part 3: Supabase Migration

- Schema SQL: `migrations/supabase_migration.sql`
- URL remap SQL: `migrations/remap_media_urls.sql`
- Guide: `migrations/supabase_migration_guide.md`

## Part 4: Workers Backend Rewrite (Hono)

Worker backend folder:

```text
backend-workers/
├── src/
│   ├── index.js
│   ├── db.js
│   ├── r2.js
│   ├── cors.js
│   ├── lib/
│   │   ├── constants.js
│   │   ├── http.js
│   │   └── utils.js
│   └── routes/
│       ├── api.js
│       └── uploads.js
├── r2-cors.json
├── wrangler.toml
└── package.json
```

### Route compatibility

All existing API endpoints are preserved under `/api/*` and return the same response envelope.

### Preserved logic

- Template number generation uses transaction + `pg_advisory_xact_lock`
- `orders` bulk update endpoint preserved
- `template_slots` bulk upsert (`ON CONFLICT`) preserved
- Printed summary aggregate query preserved

### File handling

- `POST /api/uploads/project-image` now uploads to R2 (`project-images/{projectId}/...`)
- `GET /uploads/*` serves objects from R2 to preserve legacy media paths

## Part 5: Wrangler Configuration

See: `backend-workers/wrangler.toml`

Includes:

- R2 bindings
- dev + production environments
- optional custom domain route (`api.myapp.com/*`)
- compatibility flags
- vars/secrets model

## Part 6: Frontend Updates

Minimal changes applied:

- New env files:
  - `.env.development`
  - `.env.production`
- Upload save behavior now stores `publicUrl` (R2 URL first) in DB columns:
  - `src/pages/Upload.tsx`
  - `src/pages/Editor.tsx`
- API contract and call signatures unchanged (`src/lib/api.ts`)

## Part 7: GitHub Integration

- Worker deploy workflow: `.github/workflows/deploy-worker.yml`
- Pages deploy workflow: `.github/workflows/deploy-pages.yml`

## Part 8: Credentials and Secrets

See: `migrations/credentials_checklist.md`

## Part 9: Deployment Steps

See: `migrations/deployment_checklist.md`

## Part 10: Existing Data Migration Script

- Main script: `scripts/migrate_local_to_cloud.sh`
- Script guide: `scripts/part10_data_migration.md`

This script does all four required steps:

1. Export local PostgreSQL data
2. Import into Supabase
3. Upload existing local files to R2
4. Update DB media columns to R2 URLs
