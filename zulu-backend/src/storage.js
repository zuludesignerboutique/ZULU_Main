// Storage abstraction — uploads go to Supabase Storage when configured,
// otherwise fall back to the local ./uploads directory (dev mode).
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BUCKET = process.env.SUPABASE_BUCKET || 'zulu-uploads';
const LOCAL_DIR = path.join(__dirname, '..', 'uploads');

const isCloud = () => Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY);

function uniqueName(originalName) {
  const ext = path.extname(originalName || '') || '.jpg';
  return Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
}

function uploadToSupabase(buffer, name) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`;
  return fetch(url, {
    method: 'PUT',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: buffer
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase upload failed (${res.status}): ${body}`);
    }
  });
}

function saveBuffer(buffer, originalName) {
  const name = uniqueName(originalName);
  if (isCloud()) {
    return uploadToSupabase(buffer, name).then(() => name);
  }
  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(LOCAL_DIR, name), buffer, (err) => (err ? reject(err) : resolve(name)));
  });
}

function deleteFile(name) {
  if (!name) return Promise.resolve();
  if (isCloud()) {
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`;
    return fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }).then((res) => {
        if (!res.ok && res.status !== 404) {
          return res.text().then((t) => { throw new Error(`Supabase delete failed (${res.status}): ${t}`); });
        }
      });
  }
  return new Promise((resolve) => {
    fs.unlink(path.join(LOCAL_DIR, name), (err) => {
      if (err && err.code !== 'ENOENT') console.error('Delete warning:', err.message);
      resolve();
    });
  });
}

// Public base URL for <domain>/uploads/<name> redirects (cloud mode).
const PUBLIC_URL = () => (isCloud() ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/` : null);

module.exports = { isCloud, saveBuffer, deleteFile, uniqueName, LOCAL_DIR, PUBLIC_URL };