// =====================================================================
// migrate-data.js — copy all ZULU data from the legacy MySQL database to
// Supabase (PostgreSQL).
//
// Usage (from zulu-backend/):  node scripts/migrate-data.js
//
// Requires in zulu-backend/.env:
//   * MySQL source:  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
//   * Postgres dest: DATABASE_URL
//
// Strategy: for each table it computes the intersection of the live MySQL
// columns with the Postgres schema columns (by name), SELECTs those rows in
// id order, and INSERTs them with `ON CONFLICT (id) DO NOTHING` (safe to
// re-run). After every table it resyncs the SERIAL sequences. Existing
// rows / auto-generated data are preserved.
//
// Robustness:
//   * JSONB columns get forced into valid JSON (arrays/objects stringified,
//     strings parsed first, unparseable strings stored as JSON strings).
//   * Values that are NULL in MySQL but land on a Postgres NOT NULL column
//     are replaced with a type-appropriate default ('' / 0 / [] / now),
//     mirroring the defaults the app itself uses when inserting.
// =====================================================================
// Load zulu-backend/.env (in-repo run) or a ./.env sitting next to this file
// (standalone run on another machine). dotenv never overrides real env vars.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
require('dotenv').config();

const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const TABLES = [
  'users',
  'categories',
  'subcategories',
  'products',
  'product_images',
  'pooboo_products',
  'pooboo_fabrics',
  'pooboo_accessories',
  'orders',
  'order_items',
  'reviews',
  'pooboo_reviews',
  'pooboo_enquiries',
  'wishlist',
  'gallery_images',
  'newsletter_subscribers',
];

// Force a value into a form Postgres can store as jsonb.
function toJson(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    try { v = JSON.parse(v); } catch { /* keep raw string */ }
  }
  if (typeof v === 'object') return JSON.stringify(v);   // array or object -> valid JSON
  if (typeof v === 'string') return JSON.stringify(v);   // unparseable raw string -> JSON string literal
  return v;                                              // number / boolean
}

// Substitute a type-appropriate default when a NULL lands on a NOT NULL column.
function fallbackFor(row, c, colInfo) {
  const v = row[c];
  if (v !== null && v !== undefined) return v;
  const info = colInfo.get(c);
  if (!info || info.is_nullable === 'YES') return null;
  const t = info.data_type;
  if (t === 'jsonb' || t === 'json') return [];
  if (/timestamp|date/.test(t)) return new Date();
  if (/int|smallint|bigint|numeric|decimal|real|double/.test(t)) return 0;
  if (t === 'boolean') return false;
  return ''; // character varying / text / everything else
}

async function main() {
  const m = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zulu_db',
    dateStrings: false,
  });

  const pg = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  try {
    for (const table of TABLES) {
      // Postgres column metadata for this table.
      const pgCols = await pg.query(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns
         WHERE table_name = $1 ORDER BY ordinal_position`,
        [table]
      );
      const colInfo = new Map(pgCols.rows.map((r) => [r.column_name, r]));
      const jsonCols = new Set(
        pgCols.rows.filter((r) => r.data_type === 'jsonb' || r.data_type === 'json').map((r) => r.column_name)
      );

      // MySQL columns, in live order, intersected with Postgres column names.
      const [myCols] = await m.query('SHOW COLUMNS FROM `' + table + '`');
      const cols = myCols.map((c) => c.Field).filter((c) => colInfo.has(c));

      if (!cols.includes('id')) {
        console.log(`⏭  ${table}: no id column, skipping`);
        continue;
      }

      const [rows] = await m.query(`SELECT ${cols.map((c) => '`' + c + '`').join(', ')} FROM \`${table}\` ORDER BY id`);
      const total = rows.length;
      if (total === 0) {
        console.log(`⏭  ${table}: 0 rows`);
        continue;
      }

      const CHUNK = 500;
      let inserted = 0;
      for (let i = 0; i < total; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const placeholders = chunk
          .map((_, r) => `(${cols.map((__, c) => `$${r * cols.length + c + 1}`).join(',')})`)
          .join(',');
        const flat = chunk.flatMap((row) =>
          cols.map((c) => {
            const v = fallbackFor(row, c, colInfo);
            return jsonCols.has(c) ? toJson(v) : v;
          })
        );
        const sql = `INSERT INTO "${table}" (${cols.map((c) => '"' + c + '"').join(',')}) VALUES ${placeholders} ON CONFLICT (id) DO NOTHING`;
        const res = await pg.query(sql, flat);
        inserted += res.rowCount;
      }

      // Resync sequence so future inserts don't collide with migrated ids.
      await pg.query(
        `SELECT setval(pg_get_serial_sequence($1, 'id'), (SELECT COALESCE(MAX(id), 1) FROM "${table}"))`,
        [table]
      );

      console.log(`✅ ${table}: ${inserted}/${total} rows migrated`);
    }
    console.log('\nDone. Run the /uploads file migration next (scripts/upload-files.js).');
  } finally {
    await m.end();
    await pg.end();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});