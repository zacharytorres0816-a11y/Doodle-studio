# Part 8: Credentials and Secrets Checklist

## Supabase

Required:

1. Project URL (`https://xxxxx.supabase.co`)
2. Database connection string (direct Postgres URL)
3. Anon/public key
4. Service role key (optional; only for privileged server operations)

Where to get:

- Supabase Dashboard → Project Settings → Database → Connection string
- Supabase Dashboard → Project Settings → API → Project API keys

## Cloudflare

Required:

1. Account ID
2. API Token (Workers + R2 + Pages deployment permissions)
3. R2 bucket public URL (`https://pub-xxxxx.r2.dev`)
4. (Optional S3 compatibility) R2 Access Key ID + Secret Access Key

Where to get:

- Cloudflare Dashboard → Workers & Pages → Overview (Account ID)
- Cloudflare Dashboard → My Profile → API Tokens
- Cloudflare Dashboard → R2 → Bucket → Settings (public URL)
- Cloudflare Dashboard → R2 → Manage R2 API Tokens (S3 credentials)

## Set Worker Secrets

```bash
cd backend-workers
npx wrangler secret put DATABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put R2_PUBLIC_URL
# Optional
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## Set Worker Vars (`wrangler.toml`)

- `ALLOWED_ORIGINS`
- `ENVIRONMENT`

## Set Cloudflare Pages Variables

Cloudflare Pages → Project → Settings → Environment Variables

- `VITE_API_URL=https://my-worker.my-subdomain.workers.dev`

## GitHub Actions Secrets

Repository → Settings → Secrets and variables → Actions:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_PAGES_PROJECT`
