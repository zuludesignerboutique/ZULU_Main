// apply-schema.js — apply zulu-backend/schema.postgres.sql to the DATABASE_URL
// in zulu-backend/.env. Idempotent (all statements are IF NOT EXISTS).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  await pool.query('SELECT 1');
  console.log('✅ Connected to', new URL(process.env.DATABASE_URL).host);

  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.postgres.sql'), 'utf8');
  const statements = sql
    .split('\n')
    .filter((l) => !/^\s*--/.test(l))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  let ok = 0;
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      ok += 1;
    } catch (e) {
      console.error('❌', e.message, '\n   →', stmt.slice(0, 100));
      process.exitCode = 1;
    }
  }
  console.log(`✅ Applied ${ok}/${statements.length} statements`);

  const { rows } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
  );
  console.log('Tables now:', rows.map((r) => r.tablename).join(', '));
  await pool.end();
}

main().catch((e) => { console.error('❌ Failed:', e.message); process.exit(1); });