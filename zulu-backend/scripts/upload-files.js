// =====================================================================
// upload-files.js — upload every file in zulu-backend/uploads/ to the
// Supabase Storage bucket (keeping the same filenames, since the DB stores
// `/uploads/<name>` and the backend redirects those to the public bucket).
//
// Usage (from zulu-backend/):  node scripts/upload-files.js
// Requires in zulu-backend/.env:
//   * SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET (default zulu-uploads)
// =====================================================================
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BUCKET = process.env.SUPABASE_BUCKET || 'zulu-uploads';
const DIR = path.join(__dirname, '..', 'uploads');

if (!SUPABASE_URL || !KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY are required in zulu-backend/.env');
  process.exit(1);
}

async function main() {
  const files = fs.readdirSync(DIR).filter((f) => fs.statSync(path.join(DIR, f)).isFile());
  if (!files.length) {
    console.log('No files found in uploads/');
    return;
  }
  console.log(`Uploading ${files.length} files to ${BUCKET} …`);

  let ok = 0;
  for (const name of files) {
    const buf = fs.readFileSync(path.join(DIR, name));
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: buf,
    });
    if (res.ok) {
      ok += 1;
      console.log(`  ✅ ${name} (${(buf.length / 1024).toFixed(0)} KB)`);
    } else {
      console.error(`  ❌ ${name}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
  }
  console.log(`\nDone: ${ok}/${files.length} uploaded to ${BUCKET}.`);
}

main().catch((err) => {
  console.error('❌ Upload failed:', err.message);
  process.exit(1);
});