// Orphan image cleanup — lists storage objects vs DB references and
// optionally deletes unreferenced files.
//
// Usage:
//   node zulu-backend/scripts/cleanup-orphans.js                # dry-run (lists orphans)
//   node zulu-backend/scripts/cleanup-orphans.js --delete --yes # actually delete
//
// Safety:
//   - Dry-run by default; must pass --delete --yes to mutate.
//   - Caps deletions at --limit (default 1000) to avoid accidental mass delete.
//   - Compares storage filenames against ALL image columns in DB.
//   - Handles both Supabase bucket and local ./uploads fallback.
//   - Run ONLY after the 4 PUT auto-delete patches are deployed for a few days.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs = require('fs');
const { db, pool } = require('../src/db');
const storageApi = require('../src/storage');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BUCKET = process.env.SUPABASE_BUCKET || 'zulu-uploads';

const args = process.argv.slice(2);
const isDelete = args.includes('--delete');
const isYes = args.includes('--yes');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 1000;
const isDryRun = !isDelete;

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function normalizeToFilename(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // strip /uploads/ prefix if present, else take last segment
  if (trimmed.startsWith('/uploads/')) return trimmed.replace(/^\/uploads\//, '').split('/').pop().trim();
  if (trimmed.includes('/')) {
    // could be full https URL — take last part
    const last = trimmed.split('/').pop().trim();
    // ignore if it looks like a data: URL or http without filename
    if (!last || last.includes('?') && last.length > 200) return null;
    return last.split('?')[0].split('#')[0];
  }
  return trimmed;
}

async function collectReferenced() {
  const referenced = new Set();
  const tables = [
    { sql: 'SELECT image_url FROM products WHERE image_url IS NOT NULL AND image_url <> \'\'', col: 'image_url' },
    { sql: 'SELECT image_url FROM product_images WHERE image_url IS NOT NULL AND image_url <> \'\'', col: 'image_url' },
    { sql: 'SELECT image_url FROM pooboo_products WHERE image_url IS NOT NULL AND image_url <> \'\'', col: 'image_url' },
    { sql: 'SELECT image_url FROM pooboo_product_images WHERE image_url IS NOT NULL AND image_url <> \'\'', col: 'image_url' },
    { sql: 'SELECT image_url FROM pooboo_fabrics WHERE image_url IS NOT NULL AND image_url <> \'\'', col: 'image_url' },
    { sql: 'SELECT image_url FROM pooboo_fabric_images WHERE image_url IS NOT NULL AND image_url <> \'\'', col: 'image_url' },
    { sql: 'SELECT image_url FROM pooboo_accessories WHERE image_url IS NOT NULL AND image_url <> \'\'', col: 'image_url' },
    { sql: 'SELECT image_url FROM pooboo_accessory_images WHERE image_url IS NOT NULL AND image_url <> \'\'', col: 'image_url' },
    { sql: 'SELECT image_url FROM gallery_images WHERE image_url IS NOT NULL AND image_url <> \'\'', col: 'image_url' },
    { sql: 'SELECT image_url FROM category_landing_images WHERE image_url IS NOT NULL AND image_url <> \'\'', col: 'image_url' },
    // reviews — schema uses `image`, app uses `photo_url` depending on variant; query both safely
    { sql: 'SELECT image FROM reviews WHERE image IS NOT NULL AND image <> \'\'', col: 'image' },
    { sql: 'SELECT photo_url FROM pooboo_reviews WHERE photo_url IS NOT NULL AND photo_url <> \'\'', col: 'photo_url' },
    // some deployments have a zulu reviews photo_url as well
    { sql: 'SELECT photo_url FROM reviews WHERE photo_url IS NOT NULL AND photo_url <> \'\'', col: 'photo_url' },
  ];

  for (const { sql, col } of tables) {
    try {
      const rows = await query(sql);
      for (const r of rows) {
        const fname = normalizeToFilename(r[col]);
        if (fname) referenced.add(fname);
      }
      console.log(`  DB ${col}: ${rows.length} rows scanned`);
    } catch (err) {
      // Table or column may not exist on older schemas — non-fatal
      console.warn(`  Skip ${sql.slice(0, 60)} — ${err.message}`);
    }
  }
  return referenced;
}

async function listSupabaseObjects() {
  const all = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const url = `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prefix: '',
        limit: pageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase list failed (${res.status}): ${body}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    for (const obj of data) {
      if (obj.name) all.push(obj.name);
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

async function listStorageFiles() {
  if (storageApi.isCloud()) {
    console.log(`Listing Supabase bucket "${BUCKET}" @ ${SUPABASE_URL} ...`);
    return await listSupabaseObjects();
  }
  console.log(`Listing local dir ${storageApi.LOCAL_DIR} ...`);
  try {
    const files = await fs.promises.readdir(storageApi.LOCAL_DIR);
    // filter out .gitkeep / hidden
    return files.filter((f) => !f.startsWith('.') && f !== '.gitkeep');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn('  Local uploads dir does not exist — 0 files');
      return [];
    }
    throw err;
  }
}

async function main() {
  console.log('=== Orphan image cleanup ===');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (no deletes)' : 'DELETE'}`);
  console.log(`Storage: ${storageApi.isCloud() ? `Supabase cloud (${BUCKET})` : 'local filesystem'}`);
  console.log('');

  console.log('Scanning DB for referenced filenames...');
  const referenced = await collectReferenced();
  console.log(`Total unique referenced filenames: ${referenced.size}\n`);

  console.log('Scanning storage...');
  const stored = await listStorageFiles();
  console.log(`Total files in storage: ${stored.length}\n`);

  const orphanNames = stored.filter((name) => !referenced.has(name));
  console.log(`Orphans (in storage but not referenced in DB): ${orphanNames.length}`);
  if (orphanNames.length) {
    const preview = orphanNames.slice(0, 50);
    console.log('  ' + preview.join('\n  ') + (orphanNames.length > 50 ? `\n  ... and ${orphanNames.length - 50} more` : ''));
  }
  console.log('');

  if (isDryRun) {
    console.log('Dry-run complete. No files deleted.');
    console.log('To delete, re-run with: node zulu-backend/scripts/cleanup-orphans.js --delete --yes');
    if (orphanNames.length > LIMIT) {
      console.log(`Note: --limit=${LIMIT} would cap deletions; ${orphanNames.length} orphans exceeds limit. Use --limit=${orphanNames.length} to allow all.`);
    }
    await pool.end();
    return;
  }

  if (!isYes) {
    console.error('Refusing to delete without --yes flag. Aborting.');
    await pool.end();
    process.exit(1);
  }

  if (orphanNames.length === 0) {
    console.log('No orphans to delete.');
    await pool.end();
    return;
  }

  const toDelete = orphanNames.slice(0, LIMIT);
  if (orphanNames.length > LIMIT) {
    console.warn(`Capped at --limit=${LIMIT}; ${orphanNames.length - LIMIT} orphans will remain. Re-run to continue.`);
  }

  console.log(`Deleting ${toDelete.length} orphan files...`);
  let deleted = 0;
  let failed = 0;
  // Sequential with small concurrency to avoid hammering Supabase
  const concurrency = 5;
  for (let i = 0; i < toDelete.length; i += concurrency) {
    const batch = toDelete.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (name) => {
        try {
          await storageApi.deleteFile(name);
          deleted++;
          if (deleted % 50 === 0) console.log(`  ${deleted}/${toDelete.length} deleted...`);
        } catch (err) {
          failed++;
          console.error(`  failed to delete ${name}: ${err.message}`);
        }
      })
    );
  }
  console.log(`\nDone. Deleted: ${deleted}, Failed: ${failed}, Skipped (over limit): ${Math.max(0, orphanNames.length - LIMIT)}`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  try { await pool.end(); } catch {}
  process.exit(1);
});
