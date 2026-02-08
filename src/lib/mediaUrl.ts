import { API_URL } from '@/lib/api';

const API_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return API_URL.replace(/\/+$/, '');
  }
})();

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const NGROK_HOST_RE = /ngrok(-free)?\.dev$/i;

function withNgrokBypass(urlString: string) {
  try {
    const parsed = new URL(urlString);
    if (NGROK_HOST_RE.test(parsed.hostname) && !parsed.searchParams.has('ngrok-skip-browser-warning')) {
      parsed.searchParams.set('ngrok-skip-browser-warning', 'true');
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return urlString;
  }
}

export function normalizeMediaPath(storageKey: string) {
  const trimmed = String(storageKey || '').trim().replace(/^\/+/, '');
  if (!trimmed) return null;
  return `/uploads/${trimmed.replace(/^uploads\//, '')}`;
}

export function normalizeStoredMediaUrl(rawUrl: string | null | undefined) {
  const value = String(rawUrl || '').trim();
  if (!value) return null;

  if (value.startsWith('/uploads/')) return value;
  if (value.startsWith('uploads/')) return `/${value}`;

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith('/uploads/')) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return value;
  } catch {
    return value;
  }
}

export function resolveMediaUrl(rawUrl: string | null | undefined) {
  const value = String(rawUrl || '').trim();
  if (!value) return null;

  if (value.startsWith('/uploads/')) {
    return withNgrokBypass(`${API_ORIGIN}${value}`);
  }

  if (value.startsWith('uploads/')) {
    return withNgrokBypass(`${API_ORIGIN}/uploads/${value.replace(/^uploads\//, '')}`);
  }

  try {
    const parsed = new URL(value);
    if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase()) && parsed.pathname.startsWith('/uploads/')) {
      return withNgrokBypass(`${API_ORIGIN}${parsed.pathname}${parsed.search}`);
    }
    return withNgrokBypass(parsed.toString());
  } catch {
    return value;
  }
}
