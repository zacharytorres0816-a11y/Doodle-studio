import { API_URL } from '@/lib/api';

const API_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return API_URL.replace(/\/+$/, '');
  }
})();

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function normalizeMediaPath(storageKey: string) {
  const trimmed = String(storageKey || '').trim().replace(/^\/+/, '');
  if (!trimmed) return null;
  return `/uploads/${trimmed.replace(/^uploads\//, '')}`;
}

export function resolveMediaUrl(rawUrl: string | null | undefined) {
  const value = String(rawUrl || '').trim();
  if (!value) return null;

  if (value.startsWith('/uploads/')) {
    return `${API_ORIGIN}${value}`;
  }

  if (value.startsWith('uploads/')) {
    return `${API_ORIGIN}/uploads/${value.replace(/^uploads\//, '')}`;
  }

  try {
    const parsed = new URL(value);
    if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase()) && parsed.pathname.startsWith('/uploads/')) {
      return `${API_ORIGIN}${parsed.pathname}${parsed.search}`;
    }
    return parsed.toString();
  } catch {
    return value;
  }
}
