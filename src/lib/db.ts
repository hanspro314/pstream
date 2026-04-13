/* PStream Database — lightweight libsql client
 *
 * Replaces Prisma entirely for Vercel deployment.
 * Turbopack was baking "undefined" into @prisma/client's runtime,
 * making Prisma unusable. @libsql/client handles its own env vars
 * correctly at runtime, no bundler interference.
 *
 * Tables: AdminConfig, AccessCode, Device (same schema as before)
 */

import { createClient, type Client } from '@libsql/client';

const globalForDb = globalThis as unknown as { _db?: Client };

function createDb(): Client {
  const env = (globalThis as Record<string, Record<string, string | undefined>>)
    ['process']?.['env'];

  const url = env?.['DATABASE_URL'];
  const authToken = env?.['TURSO_AUTH_TOKEN'];

  if (!url || !url.startsWith('libsql://')) {
    // Fallback to local file for dev
    return createClient({
      url: url || 'file:./prisma/dev.db',
    });
  }

  return createClient({ url, authToken });
}

/* Lazy singleton — never connects at build time */
let _db: Client | null = null;
function getDb(): Client {
  if (!_db) {
    _db = globalForDb._db || createDb();
    if (!globalForDb._db) globalForDb._db = _db;
  }
  return _db;
}

/* ─── AdminConfig ─── */

export async function getAdminConfig() {
  const row = await getDb().execute({
    sql: 'SELECT * FROM AdminConfig WHERE id = ?',
    args: ['main'],
  });
  return row.rows[0] || null;
}

export async function createDefaultConfig() {
  await getDb().execute({
    sql: `INSERT INTO AdminConfig (id, siteName, whatsapp, currency, streamPrice, downloadPrice,
        planDurationDays, trialEnabled, trialDurationHours, maxDownloadsPerPeriod,
        tokenPrefix, tokenLength, defaultRefundPolicy, defaultRefundPercent,
        allowDeviceTransfer, maxDevicesPerToken)
      VALUES ('main', 'PStream', '0742337382', 'UGX', 2000, 3500, 14, 1, 1, 0, 'PS-', 6, 'none', 0, 0, 1)`,
    args: [],
  });
  return getAdminConfig();
}

export async function upsertAdminConfig(data: Record<string, unknown>) {
  const existing = await getAdminConfig();
  if (!existing) {
    // Create with defaults + overrides
    const defaults = {
      id: 'main', siteName: 'PStream', whatsapp: '0742337382', currency: 'UGX',
      streamPrice: 2000, downloadPrice: 3500, planDurationDays: 14,
      trialEnabled: 1, trialDurationHours: 1, maxDownloadsPerPeriod: 0,
      tokenPrefix: 'PS-', tokenLength: 6, defaultRefundPolicy: 'none',
      defaultRefundPercent: 0, allowDeviceTransfer: 0, maxDevicesPerToken: 1,
    };
    const merged = { ...defaults, ...data };
    const keys = Object.keys(merged).filter(k => k !== 'id' && k !== 'updatedAt');
    const sets = keys.map(k => `"${k}" = ?`).join(', ');
    const vals = keys.map(k => merged[k]);
    await getDb().execute({
      sql: `INSERT INTO AdminConfig (${keys.map(k => `"${k}"`).join(', ')}, id)
            VALUES (${keys.map(() => '?').join(', ')}, 'main')`,
      args: vals,
    });
  } else {
    const keys = Object.keys(data);
    if (keys.length === 0) return getAdminConfig();
    const sets = keys.map(k => `"${k}" = ?`).join(', ');
    const vals = keys.map(k => data[k]);
    await getDb().execute({
      sql: `UPDATE AdminConfig SET ${sets}, updatedAt = datetime('now') WHERE id = 'main'`,
      args: vals,
    });
  }
  return getAdminConfig();
}

/* ─── AccessCode ─── */

export async function findAccessCode(where: { id?: string; code?: string }) {
  if (where.id) {
    const r = await getDb().execute({ sql: 'SELECT * FROM AccessCode WHERE id = ?', args: [where.id] });
    return r.rows[0] || null;
  }
  if (where.code) {
    const normalized = where.code.trim().toUpperCase();
    // Try exact match first
    let r = await getDb().execute({ sql: 'SELECT * FROM AccessCode WHERE code = ?', args: [normalized] });
    if (r.rows[0]) return r.rows[0];
    // Fallback: match by alphanumeric part (handles stripped dashes like PS2YJ3AM vs PS-2YJ3AM)
    const alphaOnly = normalized.replace(/[^A-Z0-9]/g, '');
    r = await getDb().execute({ sql: 'SELECT * FROM AccessCode WHERE REPLACE(code, "-", "") = ?', args: [alphaOnly] });
    return r.rows[0] || null;
  }
  return null;
}

export async function findManyAccessCodes(opts: { where?: Record<string, unknown>; orderBy?: string; skip?: number; take?: number; select?: string[] }) {
  let sql = 'SELECT * FROM AccessCode';
  const args: unknown[] = [];
  const conditions: string[] = [];

  if (opts.where) {
    for (const [key, val] of Object.entries(opts.where)) {
      if (key === 'code' && typeof val === 'object' && val !== null && 'in' in val) {
        const inVals = (val as { in: string[] }).in;
        const placeholders = inVals.map(() => '?').join(', ');
        conditions.push(`code IN (${placeholders})`);
        args.push(...inVals);
      } else if (key === 'status' && val && val !== 'all') {
        conditions.push(`status = ?`);
        args.push(val);
      } else if (key === 'tier') {
        conditions.push(`tier = ?`);
        args.push(val);
      } else if (key === 'pricePaid' && typeof val === 'object' && val !== null && 'gt' in val) {
        conditions.push(`pricePaid > ?`);
        args.push((val as { gt: number }).gt);
      } else if (key === 'status' && val === 'active') {
        conditions.push(`status = ?`);
        args.push(val);
      }
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  if (opts.orderBy) {
    sql += ' ORDER BY ' + opts.orderBy;
  }

  if (opts.skip) {
    sql += ` LIMIT ? OFFSET ?`;
    args.push(opts.take || 20, opts.skip);
  } else if (opts.take) {
    sql += ` LIMIT ?`;
    args.push(opts.take);
  }

  const r = await getDb().execute({ sql, args });
  return r.rows;
}

export async function countAccessCodes(where?: Record<string, unknown>) {
  let sql = 'SELECT COUNT(*) as count FROM AccessCode';
  const args: unknown[] = [];
  const conditions: string[] = [];

  if (where) {
    for (const [key, val] of Object.entries(where)) {
      if (val !== undefined && val !== null) {
        conditions.push(`${key} = ?`);
        args.push(val);
      }
    }
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  const r = await getDb().execute({ sql, args });
  return Number(r.rows[0]?.count || 0);
}

export async function createAccessCode(data: Record<string, unknown>) {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const vals = keys.map(k => data[k]);
  await getDb().execute({
    sql: `INSERT INTO AccessCode (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`,
    args: vals,
  });
  // Return the created row
  const code = data.code;
  if (code) return findAccessCode({ code: code as string });
  return null;
}

export async function createManyAccessCodes(codes: Record<string, unknown>[]) {
  if (codes.length === 0) return { count: 0 };
  // libsql supports batch via transactions
  await getDb().batch(
    codes.map(data => ({
      sql: `INSERT INTO AccessCode (code, tier, status, planDurationDays, maxDownloads, pricePaid, note)
            VALUES (?, ?, 'available', ?, ?, ?, ?)`,
      args: [data.code, data.tier, data.planDurationDays, data.maxDownloads, data.pricePaid, data.note || null],
    }))
  );
  return { count: codes.length };
}

export async function updateAccessCode(where: { id?: string; code?: string }, data: Record<string, unknown>) {
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return findAccessCode(where);
  }
  const sets = keys.map(k => `"${k}" = ?`).join(', ');
  const vals = keys.map(k => data[k]);
  if (where.code) {
    await getDb().execute({
      sql: `UPDATE AccessCode SET ${sets} WHERE code = ?`,
      args: [...vals, where.code],
    });
    return findAccessCode({ code: where.code });
  }
  if (where.id) {
    await getDb().execute({
      sql: `UPDATE AccessCode SET ${sets} WHERE id = ?`,
      args: [...vals, where.id],
    });
    return findAccessCode({ id: where.id });
  }
  return null;
}

/* ─── Device ─── */

export async function findDevice(where: { fingerprint: string }) {
  const r = await getDb().execute({ sql: 'SELECT * FROM Device WHERE fingerprint = ?', args: [where.fingerprint] });
  return r.rows[0] || null;
}

export async function countDevices() {
  const r = await getDb().execute({ sql: 'SELECT COUNT(*) as count FROM Device' });
  return Number(r.rows[0]?.count || 0);
}

export async function upsertDevice(fingerprint: string, updateData: Record<string, unknown>, createData: Record<string, unknown>) {
  // Check if exists
  const existing = await findDevice({ fingerprint });
  if (existing) {
    const keys = Object.keys(updateData);
    if (keys.length === 0) return existing;
    const sets = keys.map(k => `"${k}" = ?`).join(', ');
    const vals = keys.map(k => updateData[k]);
    await getDb().execute({
      sql: `UPDATE Device SET ${sets} WHERE fingerprint = ?`,
      args: [...vals, fingerprint],
    });
    return findDevice({ fingerprint });
  } else {
    const keys = Object.keys(createData);
    const placeholders = keys.map(() => '?').join(', ');
    const vals = keys.map(k => createData[k]);
    await getDb().execute({
      sql: `INSERT INTO Device (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${placeholders})`,
      args: vals,
    });
    return findDevice({ fingerprint });
  }
}
