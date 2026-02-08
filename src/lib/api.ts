const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
const IS_NGROK = /ngrok(-free)?\.dev$/i.test(new URL(API_URL).hostname);

type QueryValue = string | number | boolean | null | undefined;

function withQuery(path: string, query?: Record<string, QueryValue | QueryValue[]>) {
  if (!query) return `${API_URL}${path}`;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      const normalized = value
        .filter((item) => item !== undefined && item !== null && item !== '')
        .map((item) => String(item));
      if (normalized.length > 0) params.set(key, normalized.join(','));
      return;
    }
    params.set(key, String(value));
  });
  const q = params.toString();
  return q ? `${API_URL}${path}?${q}` : `${API_URL}${path}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  // ngrok free sometimes serves a browser warning page unless this header is present.
  if (IS_NGROK) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`);
  }

  if (!payload) {
    const preview = text.slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(
      `API returned non-JSON response${preview ? `: ${preview}` : ''}. ` +
      'Check that backend is running, ngrok is active, and VITE_API_URL matches current tunnel URL.'
    );
  }

  return (payload?.data ?? payload) as T;
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export const api = {
  health: () => request<{ ok: boolean }>('/api/health'),

  projects: {
    list: async (query?: { status?: string; orderBy?: string; orderDir?: 'asc' | 'desc' }) =>
      ensureArray(await request<any[]>(withPath('/api/projects', query))),
    get: (id: string) => request<any>(`/api/projects/${id}`),
    create: (payload: Record<string, unknown>) =>
      request<any>('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<any>(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: (id: string) => request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
  },

  orders: {
    list: async (query?: {
      ids?: string[];
      status?: string;
      statuses?: string[];
      orderBy?: string;
      orderDir?: 'asc' | 'desc';
    }) => ensureArray(await request<any[]>(withPath('/api/orders', query))),
    create: (payload: Record<string, unknown>) =>
      request<any>('/api/orders', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<any>(`/api/orders/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    bulkUpdate: (ids: string[], patch: Record<string, unknown>) =>
      request<{ updated: number }>('/api/orders/bulk-update', {
        method: 'POST',
        body: JSON.stringify({ ids, patch }),
      }),
  },

  templates: {
    list: async (query?: { orderBy?: string; orderDir?: 'asc' | 'desc' }) =>
      ensureArray(await request<any[]>(withPath('/api/templates', query))),
    create: (payload: Record<string, unknown>) =>
      request<any>('/api/templates', { method: 'POST', body: JSON.stringify(payload) }),
  },

  printTemplates: {
    list: async (query?: {
      status?: string;
      statuses?: string[];
      orderBy?: string;
      orderDir?: 'asc' | 'desc';
    }) => ensureArray(await request<any[]>(withPath('/api/print-templates', query))),
    count: () => request<{ count: number }>('/api/print-templates/count'),
    create: (payload: Record<string, unknown>) =>
      request<any>('/api/print-templates', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<any>(`/api/print-templates/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  },

  templateSlots: {
    list: async (query?: {
      templateIds?: string[];
      orderIds?: string[];
      orderBy?: string;
      orderDir?: 'asc' | 'desc';
    }) => ensureArray(await request<any[]>(withPath('/api/template-slots', query))),
    bulkCreate: (slots: Record<string, unknown>[]) =>
      request<any[]>('/api/template-slots/bulk', { method: 'POST', body: JSON.stringify({ slots }) }),
    printedSummary: async (orderIds: string[]) =>
      ensureArray(await request<any[]>(withPath('/api/template-slots/printed-summary', { orderIds }))),
  },

  raffleEntries: {
    list: async (query?: { isWinner?: boolean }) =>
      ensureArray(await request<any[]>(withPath('/api/raffle-entries', query))),
    bulkCreate: (entries: Record<string, unknown>[]) =>
      request<any[]>('/api/raffle-entries/bulk', { method: 'POST', body: JSON.stringify({ entries }) }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<any>(`/api/raffle-entries/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  },

  raffleWinners: {
    list: async () => ensureArray(await request<any[]>('/api/raffle-winners')),
    create: (payload: Record<string, unknown>) =>
      request<any>('/api/raffle-winners', { method: 'POST', body: JSON.stringify(payload) }),
  },

  uploads: {
    projectImage: async (file: File | Blob, projectId: string, kind: string) => {
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('kind', kind);
      const fileName = file instanceof File ? file.name : `${kind}.png`;
      formData.append('file', file, fileName);

      const response = await fetch(`${API_URL}/api/uploads/project-image`, {
        method: 'POST',
        headers: IS_NGROK ? { 'ngrok-skip-browser-warning': 'true' } : undefined,
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Upload failed');
      }
      return payload.data as { storageKey: string; publicUrl: string };
    },
  },
};

function withPath(path: string, query?: Record<string, QueryValue | QueryValue[]>) {
  return withQuery(path, query).replace(API_URL, '');
}

export { API_URL };
