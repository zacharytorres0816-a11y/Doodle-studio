# Doodle Studio API (Local Postgres)

## 1) Setup

```bash
cd backend
cp .env.example .env
npm install
```

Edit `backend/.env`:

- `DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/DB_NAME`
- `FRONTEND_ORIGIN=http://localhost:8080` (comma-separated for multiple origins)
- `PUBLIC_BASE_URL=http://localhost:8787` (or tunnel URL)

## 2) Run

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:8787/api/health
```

## 3) Expose API publicly (for Cloudflare Pages frontend)

### Option A: Cloudflare Tunnel

```bash
cloudflared tunnel --url http://localhost:8787
```

### Option B: ngrok

```bash
ngrok http 8787
```

Use the generated HTTPS URL as frontend `VITE_API_URL`.

## 4) Frontend wiring

Set frontend env:

```env
VITE_API_URL=https://<your-tunnel-url>
```

For Cloudflare Pages, add `VITE_API_URL` in Pages project Environment Variables and redeploy.

## Notes

- API serves uploaded files from `backend/uploads` at `/uploads/*`.
- Postgres is never exposed publicly; only the API port is tunneled.
