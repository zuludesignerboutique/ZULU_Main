// ─────────────────────────────────────────────────────────────────────────────
// Supabase (PostgreSQL) adapter with a mysql2-compatible `db.query` surface.
//
// The rest of index.js was written against mysql2's callback API, so this file
// keeps that shape while running against Postgres via `pg`:
//
//   * `?` placeholders  → `$1, $2, …` (pg does not use `?`)
//   * array params      → expanded for `IN (?)` (mysql2 expands arrays, pg doesn't)
//   * `VALUES ?` batch  → multi-row `(…),(…)` with flattened params
//   * INSERT … VALUES   → gains `RETURNING id` so `result.insertId` still works
//   * result shape      → mysql2-style: SELECTs return a rows array; writes return
//                         an object exposing `insertId` and `affectedRows`
// ─────────────────────────────────────────────────────────────────────────────
const { Pool } = require('pg');
const path = require('path');

// Load zulu-backend/.env before reading any DB vars (idempotent — dotenv never
// overrides vars that are already present in process.env).
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(
    process.env.DB_PASSWORD || ''
  )}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${
    process.env.DB_NAME || 'zulu_db'
  }`;

const pool = new Pool({
  connectionString,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: parseInt(process.env.PG_POOL_MAX || '5', 10),
  connectionTimeoutMillis: 10000,
});

// Split on `?` and rebuild the statement with `$n` placeholders, expanding any
// array params (IN lists or `VALUES ?` batches) as needed.
function translate(sql, params) {
  const parts = sql.split('?');
  if (parts.length - 1 !== params.length) {
    const err = new Error(
      `Placeholder count mismatch (${parts.length - 1} '?' vs ${params.length} params): ${sql.slice(0, 120)}`
    );
    return { error: err };
  }

  const out = [];
  const flat = [];
  let n = 0;

  for (let i = 0; i < parts.length; i++) {
    out.push(parts[i]);
    if (i === parts.length - 1) break;

    const param = params[i];
    const isValues = /VALUES\s*$/i.test(parts[i]);

    // Batch insert: `VALUES ?` where the param is an array of row-arrays.
    if (isValues && Array.isArray(param) && param.length && Array.isArray(param[0])) {
      const rowGroups = param.map((row) => {
        const cells = row.map(() => `$${++n}`);
        flat.push(...row);
        return `(${cells.join(',')})`;
      });
      out.push(rowGroups.join(','));
      continue;
    }

    // IN-list expansion: array of scalars → `$1,$2,…` (caller writes the parens).
    // Only when the `?` sits inside an IN ( … ) clause — elsewhere (JSONB
    // columns) an array is a single value and must stay one parameter.
    if (Array.isArray(param)) {
      if (/IN\s*\(\s*$/i.test(parts[i])) {
        const cells = param.map(() => `$${++n}`);
        flat.push(...param);
        out.push(cells.join(','));
        continue;
      }
      out.push(`$${++n}`);
      flat.push(param);
      continue;
    }

    out.push(`$${++n}`);
    flat.push(param);
  }

  return { sql: out.join(''), params: flat };
}

// Appends `RETURNING id` to INSERT statements so `result.insertId` (mysql2
// convention) can be recovered from `result.rows[0].id`.
function ensureReturning(sql) {
  const trimmed = sql.trim();
  if (/^\s*INSERT/i.test(trimmed) && !/\bRETURNING\b/i.test(trimmed)) {
    return trimmed.replace(/;\s*$/, '') + ' RETURNING id';
  }
  return trimmed;
}

function isReadQuery(sql) {
  return /^\s*(SELECT|SHOW|WITH)\b/i.test(sql.trim());
}

// Core query runner: `db.query(sql, params?, callback?)`.
function run(sql, params, cb) {
  if (typeof params === 'function') {
    cb = params;
    params = [];
  }
  params = params || [];

  const t = translate(sql, params);
  if (t.error) {
    if (cb) setImmediate(() => cb(t.error));
    else return Promise.reject(t.error);
    return;
  }

  const finalSql = ensureReturning(t.sql);

  // JSONB params are passed as JS arrays; pg would encode those as Postgres
  // array literals ({"a","b"}), which is not valid JSON. Stringify them so the
  // jsonb column gets real JSON. (IN-lists/batches are already flattened.)
  const flatParams = t.params.map((v) => (Array.isArray(v) ? JSON.stringify(v) : v));

  const done = (err, result) => {
    if (!cb) return;
    if (err) return cb(err);

    // SELECTs return the row array (like mysql2); writes return a result object.
    if (isReadQuery(finalSql)) {
      cb(null, result.rows);
    } else {
      result.rows = result.rows || [];
      result.insertId = result.rows.length ? result.rows[0].id : undefined;
      result.affectedRows = result.rowCount || 0;
      cb(null, result);
    }
  };

  pool.query(finalSql, flatParams, (err, result) => {
    if (err) return done(err);
    done(null, result);
  });
}

// mysql2-style connect callback — used once at boot to verify the DB is reachable.
function connect(cb) {
  pool.query('SELECT 1', (err) => {
    if (err && cb) return cb(err);
    if (cb) cb(null);
  });
}

function end() {
  return pool.end();
}

module.exports = { db: { query: run, connect }, pool, translate, end };