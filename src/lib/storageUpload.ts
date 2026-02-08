import { api } from '@/lib/api';

interface UploadWithRetryOptions {
  maxAttempts?: number;
  kind?: string;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function uploadWithRetry(
  projectId: string,
  file: File | Blob,
  options: UploadWithRetryOptions = {},
) {
  const { maxAttempts = 3, kind = 'image' } = options;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await api.uploads.projectImage(file, projectId, kind);
    } catch (error) {
      lastError = error;
      const backoff = Math.min(2000, 300 * Math.pow(2, attempt - 1));
      const jitter = Math.random() * 200;
      await wait(backoff + jitter);
    }
  }

  throw lastError;
}
