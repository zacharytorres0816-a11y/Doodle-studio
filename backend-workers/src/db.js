import postgres from 'postgres';

const clientsByUrl = new Map();

/**
 * Returns a cached postgres.js client for the active Worker isolate.
 * @param {Record<string, string>} env
 */
export function getDb(env) {
  const databaseUrl = String(env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  if (!clientsByUrl.has(databaseUrl)) {
    const sql = postgres(databaseUrl, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: 'require',
    });
    clientsByUrl.set(databaseUrl, sql);
  }

  return clientsByUrl.get(databaseUrl);
}
