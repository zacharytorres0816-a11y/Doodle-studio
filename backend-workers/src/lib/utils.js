import { ORDERABLE_COLUMNS, PRINT_TEMPLATE_STATUS_VALUES } from './constants.js';

export function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function sanitizePayload(payload, allowedColumns) {
  const out = {};
  for (const key of Object.keys(payload || {})) {
    if (allowedColumns.has(key) && payload[key] !== undefined) {
      out[key] = payload[key];
    }
  }
  return out;
}

export function buildInsert(table, payload) {
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw new Error('No fields to insert');
  }
  const values = keys.map((key) => payload[key]);
  const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
  const columns = keys.map((key) => `"${key}"`).join(', ');
  return {
    text: `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
    values,
  };
}

export function buildUpdate(table, payload, whereColumn, whereValue) {
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    throw new Error('No fields to update');
  }
  const setters = keys.map((key, idx) => `"${key}" = $${idx + 1}`);
  const values = keys.map((key) => payload[key]);
  values.push(whereValue);
  return {
    text: `UPDATE ${table} SET ${setters.join(', ')} WHERE "${whereColumn}" = $${keys.length + 1} RETURNING *`,
    values,
  };
}

export function parseNullableInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function parseRequiredInteger(value) {
  const parsed = parseNullableInteger(value);
  if (parsed === null) {
    throw new Error('Invalid integer value');
  }
  return parsed;
}

export function isUuid(value) {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

export function normalizeNullableUuid(value) {
  if (!value) return null;
  const raw = String(value).trim();
  return isUuid(raw) ? raw : null;
}

export function resolveOrderBy(table, requested, fallback) {
  const allowed = ORDERABLE_COLUMNS[table] || new Set();
  if (!requested || !allowed.has(requested)) return fallback;
  return requested;
}

export function resolveOrderDir(requested) {
  return requested === 'asc' ? 'ASC' : 'DESC';
}

export function normalizePrintTemplateStatus(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return PRINT_TEMPLATE_STATUS_VALUES.has(normalized) ? normalized : null;
}

export function normalizePrintTemplatePayload(payload) {
  const normalized = { ...(payload || {}) };

  if (typeof normalized.status === 'string') {
    const nextStatus = normalizePrintTemplateStatus(normalized.status);
    if (!nextStatus) {
      throw new Error('Invalid print template status');
    }
    normalized.status = nextStatus;
  }

  if (typeof normalized.template_number === 'string') {
    normalized.template_number = normalized.template_number.trim();
  }

  return normalized;
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
