# Part 9: Deployment Checklist

## 1. Supabase Setup (15 min)

- [ ] Create Supabase project
- [ ] Copy Postgres connection string
- [ ] Run schema migration
  - `psql "<SUPABASE_CONNECTION_STRING>" -f migrations/supabase_migration.sql`
- [ ] Verify tables/indexes/triggers in Supabase SQL editor

## 2. Cloudflare R2 Setup (10 min)

- [ ] `cd backend-workers`
- [ ] `npx wrangler r2 bucket create my-app-media`
- [ ] `npx wrangler r2 bucket create my-app-media-preview`
- [ ] Apply CORS (`r2-cors.json`) or configure in dashboard
- [ ] Enable/publicize bucket URL and copy `https://pub-xxxxx.r2.dev`

## 3. Workers Deployment (20 min)

- [ ] `cd backend-workers`
- [ ] `npm install`
- [ ] `npx wrangler secret put DATABASE_URL`
- [ ] `npx wrangler secret put R2_PUBLIC_URL`
- [ ] `npx wrangler secret put SUPABASE_ANON_KEY`
- [ ] `npx wrangler dev`
- [ ] Validate: `GET /api/health`, upload, list endpoints
- [ ] `npx wrangler deploy --env production`
- [ ] Save Worker URL

## 4. Frontend Deployment (15 min)

- [ ] Set `.env.production` `VITE_API_URL` to Worker URL
- [ ] Build locally: `npm run build`
- [ ] Push to GitHub
- [ ] Deploy Pages via:
  - Cloudflare Git integration, or
  - `.github/workflows/deploy-pages.yml`
- [ ] Set Pages env var `VITE_API_URL`

## 5. Existing Data Migration (optional, 20-40 min)

- [ ] Ensure schema already exists in Supabase
- [ ] Set env vars: `LOCAL_DATABASE_URL`, `SUPABASE_DATABASE_URL`, `R2_BUCKET`, `R2_PUBLIC_URL`
- [ ] Run: `bash scripts/migrate_local_to_cloud.sh`
- [ ] Confirm 5 URL columns now contain `https://pub-...r2.dev/...`

## 6. Production Validation (15 min)

- [ ] Create order → project appears
- [ ] Upload image → object exists in R2 under `project-images/{projectId}/...`
- [ ] Save editor strip → thumbnail URL stored as R2 URL
- [ ] Template slot upsert works (`POST /api/template-slots/bulk`)
- [ ] Print/download flow updates statuses correctly
- [ ] Delivery and raffle workflows still function
- [ ] CORS works for `*.pages.dev` and `http://localhost:5173`
