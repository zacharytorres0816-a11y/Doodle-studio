/**
 * Standard data wrapper used by the existing frontend contract.
 * @param {import('hono').Context} c
 * @param {unknown} data
 */
export function data(c, data) {
  return c.json({ data });
}

/**
 * @param {import('hono').Context} c
 * @param {number} status
 * @param {string} message
 */
export function error(c, status, message) {
  return c.json({ error: message }, status);
}

/**
 * Wraps route handlers with shared 500 handling.
 * @param {import('hono').Context} c
 * @param {() => Promise<unknown | Response>} fn
 */
export async function runQuery(c, fn) {
  try {
    const result = await fn();
    if (result instanceof Response) return result;
    return data(c, result);
  } catch (err) {
    console.error(err);
    return error(c, 500, 'Internal server error');
  }
}
