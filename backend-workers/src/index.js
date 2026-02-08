import { Hono } from 'hono';
import { corsMiddleware } from './cors.js';
import { registerApiRoutes } from './routes/api.js';
import { registerUploadRoutes } from './routes/uploads.js';

/**
 * @typedef {Object} EnvBindings
 * @property {string} DATABASE_URL
 * @property {string} [ALLOWED_ORIGINS]
 * @property {string} [ENVIRONMENT]
 * @property {string} [R2_PUBLIC_URL]
 * @property {string} [SUPABASE_ANON_KEY]
 * @property {string} [SUPABASE_SERVICE_ROLE_KEY]
 * @property {R2Bucket} MEDIA_BUCKET
 * @property {R2Bucket} PREVIEW_BUCKET
 */

/** @type {import('hono').Hono<{ Bindings: EnvBindings }>} */
const app = new Hono();

app.use('*', corsMiddleware);

registerApiRoutes(app);
registerUploadRoutes(app);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
