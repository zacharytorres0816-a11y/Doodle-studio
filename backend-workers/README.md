# Backend Workers (Hono + R2 + Supabase Postgres)

This Worker preserves the existing Express API contract while moving runtime to Cloudflare Workers.

## Preserved API Behavior

- Same endpoints and payload shapes under `/api/*`
- Same CORS headers and wildcard origin matching (`*.pages.dev` supported)
- Same bulk SQL behaviors:
  - `POST /api/orders/bulk-update`
  - `POST /api/template-slots/bulk` with `ON CONFLICT (template_id, position)`
  - `GET /api/template-slots/printed-summary` aggregate query
- Same template number allocation logic with transaction + `pg_advisory_xact_lock`

## Local Dev

```bash
cd backend-workers
npm install
npx wrangler dev
```

Local API base URL:

- `http://localhost:8787`

## Required Secrets

```bash
cd backend-workers
npx wrangler secret put DATABASE_URL
npx wrangler secret put R2_PUBLIC_URL
npx wrangler secret put SUPABASE_ANON_KEY
```

Optional:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Deploy

```bash
cd backend-workers
npx wrangler deploy --env production
```
