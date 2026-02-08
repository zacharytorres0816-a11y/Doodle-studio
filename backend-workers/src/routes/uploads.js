import { buildPublicUrl, getObject, inferExtension, putObject } from '../r2.js';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * @param {unknown} value
 */
function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * @param {import('hono').Context} c
 * @param {boolean} [headOnly]
 */
async function serveUploadObject(c, headOnly = false) {
  const pathname = new URL(c.req.url).pathname;
  const key = decodeURIComponent(pathname.replace(/^\/uploads\//, '').trim());

  if (!key) {
    return c.json({ error: 'Object key is required' }, 400);
  }

  const object = await getObject(c.env.MEDIA_BUCKET, key);
  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

  if (headOnly) {
    return new Response(null, { status: 200, headers });
  }

  return new Response(object.body, { status: 200, headers });
}

/**
 * @param {import('hono').Hono} app
 */
export function registerUploadRoutes(app) {
  app.post('/api/uploads/project-image', async (c) => {
    try {
      const body = await c.req.parseBody();

      const rawFile = firstValue(body.file);
      const rawProjectId = firstValue(body.projectId);
      const rawKind = firstValue(body.kind);

      if (!(rawFile instanceof File)) {
        return c.json({ error: 'File is required' }, 400);
      }

      const projectId = String(rawProjectId || '').trim();
      const kind = String(rawKind || 'image').trim();

      if (!projectId) {
        return c.json({ error: 'projectId is required' }, 400);
      }

      if (rawFile.size > MAX_UPLOAD_BYTES) {
        return c.json({ error: 'File exceeds max size of 25MB' }, 400);
      }

      const ext = inferExtension(rawFile.name, rawFile.type);
      const fileName = `${kind}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const storageKey = `project-images/${projectId}/${fileName}`;

      const bytes = await rawFile.arrayBuffer();
      await putObject(c.env.MEDIA_BUCKET, storageKey, bytes, {
        contentType: rawFile.type || 'application/octet-stream',
        customMetadata: {
          projectId,
          kind,
        },
      });

      const origin = new URL(c.req.url).origin;
      const publicUrl = buildPublicUrl(c.env, storageKey, origin);

      return c.json({
        data: {
          storageKey,
          publicUrl,
        },
      });
    } catch (err) {
      console.error(err);
      return c.json({ error: 'Upload failed' }, 500);
    }
  });

  app.options('/uploads/*', (c) => {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
    return c.body(null, 204);
  });

  app.get('/uploads/*', (c) => serveUploadObject(c, false));
  app.head('/uploads/*', (c) => serveUploadObject(c, true));
}
