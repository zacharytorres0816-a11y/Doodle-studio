/**
 * @param {string} requestOrigin
 * @param {string} allowedOrigin
 */
function matchesAllowedOrigin(requestOrigin, allowedOrigin) {
  if (!allowedOrigin) return false;
  if (allowedOrigin === '*') return true;
  if (allowedOrigin === requestOrigin) return true;

  if (allowedOrigin.startsWith('*.')) {
    try {
      const requestHost = new URL(requestOrigin).hostname.toLowerCase();
      const suffix = allowedOrigin.slice(2).toLowerCase();
      return requestHost === suffix || requestHost.endsWith(`.${suffix}`);
    } catch {
      return false;
    }
  }

  if (allowedOrigin.startsWith('http://*.') || allowedOrigin.startsWith('https://*.')) {
    try {
      const allowed = new URL(allowedOrigin.replace('*.', 'placeholder.'));
      const request = new URL(requestOrigin);
      if (allowed.protocol !== request.protocol) return false;
      const suffix = allowed.hostname.replace(/^placeholder\./, '').toLowerCase();
      const requestHost = request.hostname.toLowerCase();
      return requestHost === suffix || requestHost.endsWith(`.${suffix}`);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * @param {string} origin
 * @param {string[]} configuredOrigins
 */
function isAllowedCorsOrigin(origin, configuredOrigins) {
  if (!origin) return true;
  if (configuredOrigins.length === 0) return true;
  return configuredOrigins.some((allowed) => matchesAllowedOrigin(origin, allowed));
}

/**
 * @param {Record<string, string>} env
 */
function getConfiguredOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Custom CORS middleware that mirrors the existing Express behavior.
 */
export async function corsMiddleware(c, next) {
  const origin = c.req.header('origin') || '';
  const configuredOrigins = getConfiguredOrigins(c.env);
  const allowedOrigin = isAllowedCorsOrigin(origin, configuredOrigins) ? origin : null;

  if (origin && !allowedOrigin) {
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 403);
    }
    return c.json({ error: 'Origin not allowed by CORS policy' }, 403);
  }

  const corsOrigin = allowedOrigin || '*';
  c.header('Access-Control-Allow-Origin', corsOrigin);
  c.header('Vary', 'Origin');
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  c.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
}
