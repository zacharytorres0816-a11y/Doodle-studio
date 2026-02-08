import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '../uploads');

app.set('trust proxy', true);

// Demo-mode CORS: always answer preflight and allow browser requests from the active origin.
// This avoids intermittent tunnel/browser preflight failures during the 1-day simulation.
app.use((req, res, next) => {
  const origin = req.get('origin');
  const corsOrigin = origin || '*';
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(
  '/uploads',
  (_req, res, next) => {
    // Image files are intentionally public for the demo; allow cross-origin reads for canvas rendering.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(uploadsRoot),
);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

function resolvePublicBaseUrl(req) {
  const configured = String(process.env.PUBLIC_BASE_URL || '').trim();
  if (configured) {
    try {
      const url = new URL(configured);
      const host = url.hostname.toLowerCase();
      // Ignore localhost-style PUBLIC_BASE_URL because it breaks other devices.
      if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
        return configured.replace(/\/+$/, '');
      }
    } catch {
      // fall through to forwarded headers
    }
  }

  const forwardedProto = (req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const forwardedHost = (req.get('x-forwarded-host') || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get('host');
  return `${protocol}://${host}`;
}

const ORDERABLE_COLUMNS = {
  projects: new Set(['created_at', 'updated_at', 'photo_uploaded_at', 'last_edited_at']),
  orders: new Set(['created_at', 'updated_at', 'order_date', 'packed_date']),
  templates: new Set(['created_at']),
  print_templates: new Set(['created_at', 'downloaded_at', 'printed_at']),
  template_slots: new Set(['position', 'inserted_at']),
  raffle_entries: new Set(['created_at', 'raffle_number']),
  raffle_winners: new Set(['won_at']),
};

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizePayload(payload, allowedColumns) {
  const out = {};
  for (const key of Object.keys(payload || {})) {
    if (allowedColumns.has(key) && payload[key] !== undefined) {
      out[key] = payload[key];
    }
  }
  return out;
}

function buildInsert(table, payload) {
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

function buildUpdate(table, payload, whereColumn, whereValue) {
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

function parseNullableInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function parseRequiredInteger(value) {
  const parsed = parseNullableInteger(value);
  if (parsed === null) {
    throw new Error('Invalid integer value');
  }
  return parsed;
}

function isUuid(value) {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function normalizeNullableUuid(value) {
  if (!value) return null;
  const raw = String(value).trim();
  return isUuid(raw) ? raw : null;
}

function resolveOrderBy(table, requested, fallback) {
  const allowed = ORDERABLE_COLUMNS[table] || new Set();
  if (!requested || !allowed.has(requested)) return fallback;
  return requested;
}

function resolveOrderDir(requested) {
  return requested === 'asc' ? 'ASC' : 'DESC';
}

async function runQuery(res, fn) {
  try {
    const data = await fn();
    if (res.headersSent) return;
    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false });
  }
});

// Projects
const PROJECT_COLUMNS = new Set([
  'name', 'template_id', 'photo_url', 'canvas_data', 'frame_color', 'order_id', 'customer_name',
  'grade', 'section', 'package_type', 'design_type', 'status', 'thumbnail_url', 'photo_uploaded_at',
  'last_edited_at', 'completed_at', 'created_at', 'updated_at',
]);

app.get('/api/projects', (req, res) => runQuery(res, async () => {
  const orderBy = resolveOrderBy('projects', req.query.orderBy, 'created_at');
  const orderDir = resolveOrderDir(req.query.orderDir);
  const status = req.query.status ? String(req.query.status) : null;

  const where = [];
  const values = [];
  if (status) {
    values.push(status);
    where.push(`status = $${values.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM projects ${whereSql} ORDER BY ${orderBy} ${orderDir}`, values);
  return rows;
}));

app.get('/api/projects/:id', (req, res) => runQuery(res, async () => {
  const { rows } = await pool.query('SELECT * FROM projects WHERE id = $1 LIMIT 1', [req.params.id]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }
  return rows[0];
}));

app.post('/api/projects', (req, res) => runQuery(res, async () => {
  const payload = sanitizePayload(req.body, PROJECT_COLUMNS);
  const query = buildInsert('projects', payload);
  const { rows } = await pool.query(query);
  return rows[0];
}));

app.patch('/api/projects/:id', (req, res) => runQuery(res, async () => {
  const payload = sanitizePayload(req.body, PROJECT_COLUMNS);
  const query = buildUpdate('projects', payload, 'id', req.params.id);
  const { rows } = await pool.query(query);
  return rows[0] || null;
}));

app.delete('/api/projects/:id', (req, res) => runQuery(res, async () => {
  const { rows } = await pool.query(
    'DELETE FROM projects WHERE id = $1 RETURNING id',
    [req.params.id],
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }
  return { ok: true, id: rows[0].id };
}));

// Orders
const ORDER_COLUMNS = new Set([
  'customer_name', 'grade', 'section', 'package_type', 'design_type', 'standard_design_id', 'included_raffles',
  'additional_raffles', 'total_raffles', 'raffle_cost', 'package_base_cost', 'total_amount', 'payment_method',
  'gcash_reference', 'order_status', 'photo_status', 'order_date', 'photo_uploaded_date', 'project_completed_date',
  'packed_date', 'delivery_date', 'delivery_recipient', 'delivery_notes', 'created_at', 'updated_at',
]);

app.get('/api/orders', (req, res) => runQuery(res, async () => {
  const ids = parseList(req.query.ids);
  const status = req.query.status ? String(req.query.status) : null;
  const statuses = parseList(req.query.statuses);
  const orderBy = resolveOrderBy('orders', req.query.orderBy, 'order_date');
  const orderDir = resolveOrderDir(req.query.orderDir);

  const where = [];
  const values = [];

  if (ids.length > 0) {
    values.push(ids);
    where.push(`id = ANY($${values.length}::uuid[])`);
  }

  if (status) {
    values.push(status);
    where.push(`order_status = $${values.length}`);
  }

  if (statuses.length > 0) {
    values.push(statuses);
    where.push(`order_status = ANY($${values.length}::text[])`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM orders ${whereSql} ORDER BY ${orderBy} ${orderDir}`, values);
  return rows;
}));

app.post('/api/orders', (req, res) => runQuery(res, async () => {
  const payload = sanitizePayload(req.body, ORDER_COLUMNS);
  const query = buildInsert('orders', payload);
  const { rows } = await pool.query(query);
  return rows[0];
}));

app.patch('/api/orders/:id', (req, res) => runQuery(res, async () => {
  const payload = sanitizePayload(req.body, ORDER_COLUMNS);
  const query = buildUpdate('orders', payload, 'id', req.params.id);
  const { rows } = await pool.query(query);
  return rows[0] || null;
}));

app.post('/api/orders/bulk-update', (req, res) => runQuery(res, async () => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (ids.length === 0) {
    return { updated: 0 };
  }
  const payload = sanitizePayload(req.body?.patch || {}, ORDER_COLUMNS);
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    return { updated: 0 };
  }
  const setters = keys.map((key, idx) => `"${key}" = $${idx + 1}`);
  const values = keys.map((key) => payload[key]);
  values.push(ids);
  const { rowCount } = await pool.query(
    `UPDATE orders SET ${setters.join(', ')} WHERE id = ANY($${values.length}::uuid[])`,
    values,
  );
  return { updated: rowCount || 0 };
}));

// Templates
const TEMPLATE_COLUMNS = new Set(['name', 'preview_url', 'created_at']);
app.get('/api/templates', (req, res) => runQuery(res, async () => {
  const orderBy = resolveOrderBy('templates', req.query.orderBy, 'created_at');
  const orderDir = resolveOrderDir(req.query.orderDir);
  const { rows } = await pool.query(`SELECT * FROM templates ORDER BY ${orderBy} ${orderDir}`);
  return rows;
}));
app.post('/api/templates', (req, res) => runQuery(res, async () => {
  const payload = sanitizePayload(req.body, TEMPLATE_COLUMNS);
  const query = buildInsert('templates', payload);
  const { rows } = await pool.query(query);
  return rows[0];
}));

// Print Templates
const PRINT_TEMPLATE_COLUMNS = new Set([
  'template_number', 'status', 'slots_used', 'total_slots', 'final_image_url', 'created_at',
  'completed_at', 'downloaded_at', 'printed_at',
]);

app.get('/api/print-templates', (req, res) => runQuery(res, async () => {
  const status = req.query.status ? String(req.query.status) : null;
  const statuses = parseList(req.query.statuses);
  const orderBy = resolveOrderBy('print_templates', req.query.orderBy, 'created_at');
  const orderDir = resolveOrderDir(req.query.orderDir);

  const where = [];
  const values = [];

  if (status) {
    values.push(status);
    where.push(`status = $${values.length}`);
  }
  if (statuses.length > 0) {
    values.push(statuses);
    where.push(`status = ANY($${values.length}::text[])`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM print_templates ${whereSql} ORDER BY ${orderBy} ${orderDir}`, values);
  return rows;
}));

app.get('/api/print-templates/count', (req, res) => runQuery(res, async () => {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM print_templates');
  return rows[0];
}));

app.post('/api/print-templates', (req, res) => runQuery(res, async () => {
  const payload = sanitizePayload(req.body, PRINT_TEMPLATE_COLUMNS);
  const query = buildInsert('print_templates', payload);
  const { rows } = await pool.query(query);
  return rows[0];
}));

app.patch('/api/print-templates/:id', (req, res) => runQuery(res, async () => {
  const payload = sanitizePayload(req.body, PRINT_TEMPLATE_COLUMNS);
  const query = buildUpdate('print_templates', payload, 'id', req.params.id);
  const { rows } = await pool.query(query);
  return rows[0] || null;
}));

// Template Slots
const TEMPLATE_SLOT_COLUMNS = new Set([
  'template_id', 'position', 'order_id', 'project_id', 'photo_url', 'student_name', 'grade', 'section',
  'package_type', 'inserted_at',
]);

app.get('/api/template-slots', (req, res) => runQuery(res, async () => {
  const templateIds = parseList(req.query.templateIds);
  const orderIds = parseList(req.query.orderIds);
  const orderBy = resolveOrderBy('template_slots', req.query.orderBy, 'position');
  const orderDir = resolveOrderDir(req.query.orderDir);

  const where = [];
  const values = [];

  if (templateIds.length > 0) {
    values.push(templateIds);
    where.push(`template_id = ANY($${values.length}::uuid[])`);
  }
  if (orderIds.length > 0) {
    values.push(orderIds);
    where.push(`order_id = ANY($${values.length}::uuid[])`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM template_slots ${whereSql} ORDER BY ${orderBy} ${orderDir}`, values);
  return rows;
}));

app.get('/api/template-slots/printed-summary', (req, res) => runQuery(res, async () => {
  const orderIds = parseList(req.query.orderIds);
  if (orderIds.length === 0) {
    return [];
  }
  const { rows } = await pool.query(
    `SELECT
      ts.order_id,
      LEAST(
        COUNT(*)::int,
        COALESCE(MAX(o.package_type), COUNT(*))::int
      ) AS printed_count,
      COALESCE(ARRAY_AGG(DISTINCT pt.template_number), ARRAY[]::text[]) AS template_numbers,
      MAX(pt.printed_at) AS printed_at
     FROM template_slots ts
     JOIN print_templates pt ON pt.id = ts.template_id
     LEFT JOIN orders o ON o.id = ts.order_id
     WHERE pt.status = 'printed' AND ts.order_id = ANY($1::uuid[])
     GROUP BY ts.order_id`,
    [orderIds],
  );
  return rows;
}));

app.delete('/api/template-slots', (req, res) => runQuery(res, async () => {
  const ids = parseList(req.query.ids);
  if (ids.length === 0) {
    return { deleted: 0, rows: [] };
  }

  const { rows } = await pool.query(
    'DELETE FROM template_slots WHERE id = ANY($1::uuid[]) RETURNING id, template_id',
    [ids],
  );
  return { deleted: rows.length, rows };
}));

app.post('/api/template-slots/bulk', (req, res) => runQuery(res, async () => {
  const slots = Array.isArray(req.body?.slots) ? req.body.slots : [];
  if (slots.length === 0) {
    return [];
  }

  const normalizedByKey = new Map();
  slots.forEach((slot, index) => {
    const clean = sanitizePayload(slot, TEMPLATE_SLOT_COLUMNS);
    const templateId = normalizeNullableUuid(clean.template_id);
    if (!templateId) {
      throw new Error(`Invalid slot payload at index ${index}: template_id must be a UUID`);
    }

    const position = parseRequiredInteger(clean.position);
    if (position < 1 || position > 6) {
      throw new Error(`Invalid slot payload at index ${index}: position must be between 1 and 6`);
    }

    normalizedByKey.set(`${templateId}:${position}`, {
      template_id: templateId,
      position,
      order_id: normalizeNullableUuid(clean.order_id),
      project_id: normalizeNullableUuid(clean.project_id),
      photo_url: clean.photo_url ? String(clean.photo_url) : null,
      student_name: clean.student_name ? String(clean.student_name) : null,
      grade: clean.grade ? String(clean.grade) : null,
      section: clean.section ? String(clean.section) : null,
      package_type: parseNullableInteger(clean.package_type),
    });
  });

  const normalizedSlots = Array.from(normalizedByKey.values());
  if (normalizedSlots.length === 0) return [];

  const values = [];
  const rowsSql = [];
  normalizedSlots.forEach((clean, index) => {
    const base = index * 9;
    rowsSql.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`);
    values.push(
      clean.template_id,
      clean.position,
      clean.order_id,
      clean.project_id,
      clean.photo_url,
      clean.student_name,
      clean.grade,
      clean.section,
      clean.package_type,
    );
  });

  const query = `
    INSERT INTO template_slots
      (template_id, position, order_id, project_id, photo_url, student_name, grade, section, package_type)
    VALUES ${rowsSql.join(', ')}
    ON CONFLICT (template_id, position)
    DO UPDATE SET
      order_id = EXCLUDED.order_id,
      project_id = EXCLUDED.project_id,
      photo_url = EXCLUDED.photo_url,
      student_name = EXCLUDED.student_name,
      grade = EXCLUDED.grade,
      section = EXCLUDED.section,
      package_type = EXCLUDED.package_type,
      inserted_at = now()
    RETURNING *
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}));

// Raffle
const RAFFLE_ENTRY_COLUMNS = new Set([
  'order_id', 'customer_name', 'grade', 'section', 'raffle_number', 'is_winner', 'won_at', 'created_at',
]);
const RAFFLE_WINNER_COLUMNS = new Set([
  'entry_id', 'order_id', 'customer_name', 'grade', 'section', 'won_at', 'prize_details',
]);

app.get('/api/raffle-entries', (req, res) => runQuery(res, async () => {
  const isWinner = req.query.isWinner;
  const where = [];
  const values = [];
  if (isWinner !== undefined) {
    values.push(String(isWinner) === 'true');
    where.push(`is_winner = $${values.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await pool.query(`SELECT * FROM raffle_entries ${whereSql} ORDER BY created_at ASC`, values);
  return rows;
}));

app.post('/api/raffle-entries/bulk', (req, res) => runQuery(res, async () => {
  const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
  if (entries.length === 0) return [];

  const values = [];
  const rowsSql = [];
  entries.forEach((entry, index) => {
    const clean = sanitizePayload(entry, RAFFLE_ENTRY_COLUMNS);
    const base = index * 5;
    rowsSql.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
    values.push(
      clean.order_id,
      clean.customer_name,
      clean.grade,
      clean.section,
      clean.raffle_number,
    );
  });

  const query = `
    INSERT INTO raffle_entries
      (order_id, customer_name, grade, section, raffle_number)
    VALUES ${rowsSql.join(', ')}
    RETURNING *
  `;
  const { rows } = await pool.query(query, values);
  return rows;
}));

app.patch('/api/raffle-entries/:id', (req, res) => runQuery(res, async () => {
  const payload = sanitizePayload(req.body, RAFFLE_ENTRY_COLUMNS);
  const query = buildUpdate('raffle_entries', payload, 'id', req.params.id);
  const { rows } = await pool.query(query);
  return rows[0] || null;
}));

app.get('/api/raffle-winners', (req, res) => runQuery(res, async () => {
  const { rows } = await pool.query('SELECT * FROM raffle_winners ORDER BY won_at DESC');
  return rows;
}));

app.post('/api/raffle-winners', (req, res) => runQuery(res, async () => {
  const payload = sanitizePayload(req.body, RAFFLE_WINNER_COLUMNS);
  const query = buildInsert('raffle_winners', payload);
  const { rows } = await pool.query(query);
  return rows[0];
}));

// Uploads
app.post('/api/uploads/project-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'File is required' });
      return;
    }

    const projectId = String(req.body.projectId || '').trim();
    const kind = String(req.body.kind || 'image').trim();
    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }

    const extFromName = path.extname(req.file.originalname || '').replace('.', '').toLowerCase();
    const ext = extFromName || (req.file.mimetype.split('/')[1] || 'png');

    const dir = path.join(uploadsRoot, 'project-images', projectId);
    await mkdir(dir, { recursive: true });

    const fileName = `${kind}-${Date.now()}-${randomUUID()}.${ext}`;
    const fullPath = path.join(dir, fileName);
    await writeFile(fullPath, req.file.buffer);

    const storageKey = `project-images/${projectId}/${fileName}`;
    const baseUrl = resolvePublicBaseUrl(req);

    res.json({
      data: {
        storageKey,
        publicUrl: `${baseUrl}/uploads/${storageKey}`,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
