# Part 2: Cloudflare R2 Setup Guide

## Recommended Bucket Configuration

- Bucket name: `my-app-media`
- Preview bucket: `my-app-media-preview`
- Location: `Automatic` unless you have legal residency requirements
- Specific jurisdiction choice: use only when you must pin data (for example EU-only residency)
- Storage class: `Standard` (your app actively reads uploaded strips and thumbnails)
- Public access model:
  - Preferred: serve through Worker route `/uploads/*` for full CORS control and API-domain consistency
  - Optional: enable `r2.dev` public URL for direct file URLs

## CORS Recommendation

Use bucket CORS when browser clients access R2 directly:

- Allowed origins: your Pages domains + localhost dev origin
- Allowed methods: `GET,HEAD,PUT,POST,DELETE`
- Allowed headers: `*`
- Exposed headers: `ETag,Content-Length,Content-Type`

File: `backend-workers/r2-cors.json`

## Bucket Key Layout

```text
my-app-media/
├── project-images/{projectId}/{filename}
├── template-previews/{templateId}/{filename}
├── print-templates/{printTemplateId}/{filename}
└── template-slots/{slotId}/{filename}
```

### Mapping to your current app

- `project-images/...`: current upload endpoint replacement for local `backend/uploads/project-images/...`
- `template-previews/...`: replacement for `templates.preview_url`
- `print-templates/...`: replacement for `print_templates.final_image_url`
- `template-slots/...`: replacement for `template_slots.photo_url` when slot-level assets are generated

## CLI Commands

```bash
cd backend-workers

# 1) Authenticate Wrangler once
npx wrangler login

# 2) Create buckets
npx wrangler r2 bucket create my-app-media
npx wrangler r2 bucket create my-app-media-preview

# 3) Apply bucket CORS (Wrangler 3.5x+)
npx wrangler r2 bucket cors put my-app-media --file r2-cors.json
npx wrangler r2 bucket cors put my-app-media-preview --file r2-cors.json
```

If your Wrangler version does not expose `bucket cors put`, set CORS in Cloudflare Dashboard:

- R2 → Bucket → Settings → CORS Policy

## Public URL

After enabling public access, capture your public base URL (example):

- `https://pub-xxxxx.r2.dev`

Set it as Worker secret:

```bash
cd backend-workers
npx wrangler secret put R2_PUBLIC_URL
```
