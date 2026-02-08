/**
 * @param {string | undefined} input
 */
function normalizeBaseUrl(input) {
  const trimmed = String(input || '').trim();
  return trimmed.replace(/\/+$/, '');
}

/**
 * @param {string} value
 */
function safePath(value) {
  return String(value || '').trim().replace(/^\/+/, '').replace(/\.{2,}/g, '.');
}

/**
 * @param {string} fileName
 * @param {string} mimeType
 */
export function inferExtension(fileName, mimeType) {
  const fromName = String(fileName || '').split('.').pop()?.toLowerCase() || '';
  if (fromName && fromName !== fileName.toLowerCase()) return fromName;

  const byMime = String(mimeType || '').split('/').pop()?.toLowerCase() || '';
  return byMime || 'bin';
}

/**
 * @param {Record<string, string>} env
 * @param {string} key
 * @param {string} requestOrigin
 */
export function buildPublicUrl(env, key, requestOrigin) {
  const explicit = normalizeBaseUrl(env.R2_PUBLIC_URL);
  if (explicit) return `${explicit}/${safePath(key)}`;
  const base = normalizeBaseUrl(requestOrigin);
  return `${base}/uploads/${safePath(key)}`;
}

/**
 * @param {R2Bucket} bucket
 * @param {string} key
 * @param {ArrayBuffer} body
 * @param {{ contentType?: string, customMetadata?: Record<string, string> }} [options]
 */
export async function putObject(bucket, key, body, options = {}) {
  const contentType = options.contentType || 'application/octet-stream';
  await bucket.put(safePath(key), body, {
    httpMetadata: {
      contentType,
    },
    customMetadata: options.customMetadata || {},
  });
}

/**
 * @param {R2Bucket} bucket
 * @param {string} key
 */
export async function deleteObject(bucket, key) {
  await bucket.delete(safePath(key));
}

/**
 * @param {R2Bucket} bucket
 * @param {string} key
 */
export async function getObject(bucket, key) {
  return await bucket.get(safePath(key));
}
