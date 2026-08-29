// apply-migrations.js — run every SQL file in zulu-backend/migrations/ in order.
//
// Unlike apply-schema.js (which only runs schema.postgres.sql), this applies the
// incremental migrations, including the newsletter tables/columns and a backfill
// of unsubscribe tokens for any existing subscribers that lack one. Idempotent:
// applied files are tracked in schema_migrations, and the migration SQL itself is
// written with IF NOT EXISTS / ADD COLUMN IF NOT EXISTS guards.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

// Split a SQL file into individual statements. Unlike a naive `split(';')`, this
// respects dollar-quoted blocks ($$ ... $$) so PL/pgSQL bodies containing
// semicolons are kept intact as a single statement. `--` line comments are
// skipped outside of dollar-quoted regions.
function splitSqlStatements(sql) {
  const statements = [];
  let cur = '';
  let i = 0;
  let inDollar = false;
  let dollarTag = '';

  while (i < sql.length) {
    if (!inDollar && sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }

    if (!inDollar && sql[i] === '$') {
      let j = i + 1;
      let tag = '';
      while (j < sql.length && sql[j] !== '$') {
        tag += sql[j];
        j++;
      }
      if (j < sql.length && sql[j] === '$') {
        inDollar = true;
        dollarTag = '$' + tag + '$';
        cur += dollarTag;
        i = j + 1;
        continue;
      }
    }

    if (inDollar) {
      if (sql.startsWith(dollarTag, i)) {
        cur += dollarTag;
        i += dollarTag.length;
        inDollar = false;
        continue;
      }
      cur += sql[i];
      i++;
      continue;
    }

    if (sql[i] === ';') {
      const trimmed = cur.trim();
      if (trimmed) statements.push(trimmed);
      cur = '';
      i++;
      continue;
    }

    cur += sql[i];
    i++;
  }

  const trimmed = cur.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  await pool.query('SELECT 1');
  console.log('✅ Connected to', new URL(process.env.DATABASE_URL).host);

  // Tracking table so we never re-run an already-applied migration.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);

  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query('SELECT name FROM schema_migrations WHERE name = $1', [file]);
    if (rows.length) {
      console.log(`⏭  ${file} already applied`);
      continue;
    }

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const statements = splitSqlStatements(sql);

    let ok = 0;
    for (const stmt of statements) {
      try {
        await pool.query(stmt);
        ok += 1;
      } catch (e) {
        console.error(`❌ ${file}:`, e.message, '\n   →', stmt.slice(0, 120));
        process.exitCode = 1;
        await pool.end();
        return;
      }
    }
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
    console.log(`✅ Applied ${file} (${ok} statements)`);
  }

  // Backfill unsubscribe tokens for any existing subscribers missing one.
  const { rows: missing } = await pool.query(
    'SELECT id FROM newsletter_subscribers WHERE unsubscribe_token IS NULL'
  );
  if (missing.length) {
    for (const r of missing) {
      const token = crypto.randomBytes(24).toString('hex');
      await pool.query('UPDATE newsletter_subscribers SET unsubscribe_token = $1 WHERE id = $2', [
        token,
        r.id,
      ]);
    }
    console.log(`✅ Backfilled unsubscribe tokens for ${missing.length} subscriber(s)`);
  } else {
    console.log('✅ No unsubscribe-token backfill needed');
  }

  const { rows: tables } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`
  );
  console.log('Tables now:', tables.map((r) => r.tablename).join(', '));
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
