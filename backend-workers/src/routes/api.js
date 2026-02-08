import { getDb } from '../db.js';
import {
  ORDER_COLUMNS,
  PRINT_TEMPLATE_COLUMNS,
  PROJECT_COLUMNS,
  RAFFLE_ENTRY_COLUMNS,
  RAFFLE_WINNER_COLUMNS,
  TEMPLATE_COLUMNS,
  TEMPLATE_NUMBER_LOCK_KEY,
  TEMPLATE_SLOT_COLUMNS,
} from '../lib/constants.js';
import { error, runQuery } from '../lib/http.js';
import {
  buildInsert,
  buildUpdate,
  normalizeNullableUuid,
  normalizePrintTemplatePayload,
  normalizePrintTemplateStatus,
  parseList,
  parseNullableInteger,
  parseRequiredInteger,
  readJsonBody,
  resolveOrderBy,
  resolveOrderDir,
  sanitizePayload,
} from '../lib/utils.js';

/**
 * @param {import('hono').Hono} app
 */
export function registerApiRoutes(app) {
  app.get('/api/health', async (c) => {
    try {
      const db = getDb(c.env);
      await db`SELECT 1`;
      return c.json({ ok: true });
    } catch (err) {
      console.error(err);
      return c.json({ ok: false }, 500);
    }
  });

  app.get('/api/projects', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const orderBy = resolveOrderBy('projects', c.req.query('orderBy'), 'created_at');
    const orderDir = resolveOrderDir(c.req.query('orderDir'));
    const status = c.req.query('status') ? String(c.req.query('status')) : null;

    const where = [];
    const values = [];
    if (status) {
      values.push(status);
      where.push(`status = $${values.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await db.unsafe(`SELECT * FROM projects ${whereSql} ORDER BY ${orderBy} ${orderDir}`, values);
    return rows;
  }));

  app.get('/api/projects/:id', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const rows = await db.unsafe('SELECT * FROM projects WHERE id = $1 LIMIT 1', [c.req.param('id')]);
    if (rows.length === 0) {
      return error(c, 404, 'Project not found');
    }
    return rows[0];
  }));

  app.post('/api/projects', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const payload = sanitizePayload(body, PROJECT_COLUMNS);
    const query = buildInsert('projects', payload);
    const rows = await db.unsafe(query.text, query.values);
    return rows[0];
  }));

  app.patch('/api/projects/:id', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const payload = sanitizePayload(body, PROJECT_COLUMNS);
    const query = buildUpdate('projects', payload, 'id', c.req.param('id'));
    const rows = await db.unsafe(query.text, query.values);
    return rows[0] || null;
  }));

  app.delete('/api/projects/:id', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const rows = await db.unsafe('DELETE FROM projects WHERE id = $1 RETURNING id', [c.req.param('id')]);
    if (rows.length === 0) {
      return error(c, 404, 'Project not found');
    }
    return { ok: true, id: rows[0].id };
  }));

  app.get('/api/orders', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const ids = parseList(c.req.query('ids'));
    const status = c.req.query('status') ? String(c.req.query('status')) : null;
    const statuses = parseList(c.req.query('statuses'));
    const orderBy = resolveOrderBy('orders', c.req.query('orderBy'), 'order_date');
    const orderDir = resolveOrderDir(c.req.query('orderDir'));

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
    const rows = await db.unsafe(`SELECT * FROM orders ${whereSql} ORDER BY ${orderBy} ${orderDir}`, values);
    return rows;
  }));

  app.post('/api/orders', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const payload = sanitizePayload(body, ORDER_COLUMNS);
    const query = buildInsert('orders', payload);
    const rows = await db.unsafe(query.text, query.values);
    return rows[0];
  }));

  app.patch('/api/orders/:id', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const payload = sanitizePayload(body, ORDER_COLUMNS);
    const query = buildUpdate('orders', payload, 'id', c.req.param('id'));
    const rows = await db.unsafe(query.text, query.values);
    return rows[0] || null;
  }));

  app.post('/api/orders/bulk-update', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    if (ids.length === 0) {
      return { updated: 0 };
    }

    const payload = sanitizePayload(body?.patch || {}, ORDER_COLUMNS);
    const keys = Object.keys(payload);
    if (keys.length === 0) {
      return { updated: 0 };
    }

    const setters = keys.map((key, idx) => `"${key}" = $${idx + 1}`);
    const values = keys.map((key) => payload[key]);
    values.push(ids);

    const result = await db.unsafe(
      `UPDATE orders SET ${setters.join(', ')} WHERE id = ANY($${values.length}::uuid[])`,
      values,
    );
    return { updated: result.count || 0 };
  }));

  app.get('/api/templates', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const orderBy = resolveOrderBy('templates', c.req.query('orderBy'), 'created_at');
    const orderDir = resolveOrderDir(c.req.query('orderDir'));
    const rows = await db.unsafe(`SELECT * FROM templates ORDER BY ${orderBy} ${orderDir}`);
    return rows;
  }));

  app.post('/api/templates', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const payload = sanitizePayload(body, TEMPLATE_COLUMNS);
    const query = buildInsert('templates', payload);
    const rows = await db.unsafe(query.text, query.values);
    return rows[0];
  }));

  app.get('/api/print-templates', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const status = normalizePrintTemplateStatus(c.req.query('status') ? String(c.req.query('status')) : '');
    const statuses = parseList(c.req.query('statuses'))
      .map((value) => normalizePrintTemplateStatus(value))
      .filter(Boolean);
    const orderBy = resolveOrderBy('print_templates', c.req.query('orderBy'), 'created_at');
    const orderDir = resolveOrderDir(c.req.query('orderDir'));

    const where = [];
    const values = [];

    if (status) {
      values.push(status);
      where.push(`LOWER(status) = $${values.length}`);
    }
    if (statuses.length > 0) {
      values.push(statuses);
      where.push(`LOWER(status) = ANY($${values.length}::text[])`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await db.unsafe(`SELECT * FROM print_templates ${whereSql} ORDER BY ${orderBy} ${orderDir}`, values);
    return rows;
  }));

  app.get('/api/print-templates/count', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const rows = await db.unsafe('SELECT COUNT(*)::int AS count FROM print_templates');
    return rows[0] || { count: 0 };
  }));

  app.post('/api/print-templates', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const payload = normalizePrintTemplatePayload(sanitizePayload(body, PRINT_TEMPLATE_COLUMNS));

    if (payload.template_number) {
      const query = buildInsert('print_templates', payload);
      const rows = await db.unsafe(query.text, query.values);
      return rows[0];
    }

    const inserted = await db.begin(async (tx) => {
      const year = new Date().getFullYear();
      await tx`SELECT pg_advisory_xact_lock(${TEMPLATE_NUMBER_LOCK_KEY})`;

      const likePattern = `TMPL-${year}-%`;
      const regexPattern = `^TMPL-${year}-(\\d+)$`;

      const sequenceRows = await tx.unsafe(
        `SELECT COALESCE(MAX((regexp_match(template_number, $2))[1]::int), 0) AS max_seq
         FROM print_templates
         WHERE template_number LIKE $1`,
        [likePattern, regexPattern],
      );

      const nextSequence = Number(sequenceRows[0]?.max_seq || 0) + 1;
      payload.template_number = `TMPL-${year}-${String(nextSequence).padStart(4, '0')}`;

      const query = buildInsert('print_templates', payload);
      const rows = await tx.unsafe(query.text, query.values);
      return rows[0];
    });

    return inserted;
  }));

  app.patch('/api/print-templates/:id', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const payload = normalizePrintTemplatePayload(sanitizePayload(body, PRINT_TEMPLATE_COLUMNS));
    const query = buildUpdate('print_templates', payload, 'id', c.req.param('id'));
    const rows = await db.unsafe(query.text, query.values);
    return rows[0] || null;
  }));

  app.get('/api/template-slots', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const templateIds = parseList(c.req.query('templateIds'));
    const orderIds = parseList(c.req.query('orderIds'));
    const orderBy = resolveOrderBy('template_slots', c.req.query('orderBy'), 'position');
    const orderDir = resolveOrderDir(c.req.query('orderDir'));

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
    const rows = await db.unsafe(`SELECT * FROM template_slots ${whereSql} ORDER BY ${orderBy} ${orderDir}`, values);
    return rows;
  }));

  app.get('/api/template-slots/printed-summary', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const orderIds = parseList(c.req.query('orderIds'));
    if (orderIds.length === 0) {
      return [];
    }

    const rows = await db.unsafe(
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
       WHERE LOWER(pt.status) = 'printed' AND ts.order_id = ANY($1::uuid[])
       GROUP BY ts.order_id`,
      [orderIds],
    );
    return rows;
  }));

  app.delete('/api/template-slots', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const ids = parseList(c.req.query('ids'));
    if (ids.length === 0) {
      return { deleted: 0, rows: [] };
    }

    const rows = await db.unsafe(
      'DELETE FROM template_slots WHERE id = ANY($1::uuid[]) RETURNING id, template_id',
      [ids],
    );
    return { deleted: rows.length, rows };
  }));

  app.post('/api/template-slots/bulk', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const slots = Array.isArray(body?.slots) ? body.slots : [];
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

    const rows = await db.unsafe(
      `INSERT INTO template_slots
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
      RETURNING *`,
      values,
    );

    return rows;
  }));

  app.get('/api/raffle-entries', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const isWinner = c.req.query('isWinner');
    const where = [];
    const values = [];

    if (isWinner !== undefined) {
      values.push(String(isWinner) === 'true');
      where.push(`is_winner = $${values.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await db.unsafe(`SELECT * FROM raffle_entries ${whereSql} ORDER BY created_at ASC`, values);
    return rows;
  }));

  app.post('/api/raffle-entries/bulk', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const entries = Array.isArray(body?.entries) ? body.entries : [];
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

    const rows = await db.unsafe(
      `INSERT INTO raffle_entries
        (order_id, customer_name, grade, section, raffle_number)
      VALUES ${rowsSql.join(', ')}
      RETURNING *`,
      values,
    );
    return rows;
  }));

  app.patch('/api/raffle-entries/:id', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const payload = sanitizePayload(body, RAFFLE_ENTRY_COLUMNS);
    const query = buildUpdate('raffle_entries', payload, 'id', c.req.param('id'));
    const rows = await db.unsafe(query.text, query.values);
    return rows[0] || null;
  }));

  app.get('/api/raffle-winners', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const rows = await db.unsafe('SELECT * FROM raffle_winners ORDER BY won_at DESC');
    return rows;
  }));

  app.post('/api/raffle-winners', (c) => runQuery(c, async () => {
    const db = getDb(c.env);
    const body = await readJsonBody(c.req.raw);
    const payload = sanitizePayload(body, RAFFLE_WINNER_COLUMNS);
    const query = buildInsert('raffle_winners', payload);
    const rows = await db.unsafe(query.text, query.values);
    return rows[0];
  }));
}
