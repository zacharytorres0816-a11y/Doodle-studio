import type { SupabaseClient } from '@supabase/supabase-js';

interface UploadWithRetryOptions {
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
  duplex?: 'half';
  maxAttempts?: number;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function uploadWithRetry(
  client: SupabaseClient,
  bucket: string,
  path: string,
  file: File | Blob,
  options: UploadWithRetryOptions = {},
) {
  const {
    maxAttempts = 3,
    ...uploadOptions
  } = options;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { error } = await client.storage.from(bucket).upload(path, file, uploadOptions);
    if (!error) return;

    lastError = error;
    const backoff = Math.min(2000, 300 * Math.pow(2, attempt - 1));
    const jitter = Math.random() * 200;
    await wait(backoff + jitter);
  }

  throw lastError;
}
