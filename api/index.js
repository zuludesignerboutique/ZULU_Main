// Vercel serverless entry — the ENTIRE app in one function.
//
//   * /api/*        → ZULU Express backend (defined in zulu-backend/src/index.js)
//   * /uploads/*    → redirected to Supabase Storage by the backend
//   * other GET     → static Angular build (dist/myapp/browser), with SPA
//                     fallback to index.csr.html for any unhandled route
//
// This is the same-origin single app: frontend + API behind one domain, no CORS.
//
// Vercel invokes the module export with the Node bridge style: a standard
// (req, res). `serverless-http` cannot be used here — it only implements AWS
// and Azure providers, and its AWS handler misinterprets the bridge args and
// never writes a response (client hangs). Instead we forward each incoming
// (req, res) straight into the Express app through a shared http.Server's
// 'request' event (the server never actually listens).
const path = require('path');
const http = require('http');
const express = require('express');
const backendApp = require('../zulu-backend/src/index.js');

const browserDir = path.join(__dirname, '..', 'dist', 'myapp', 'browser');
const csrShell = path.join(browserDir, 'index.csr.html');

// Serve the static frontend (prerendered pages + JS/CSS chunks) AFTER the API
// routes. index:['index.html'] serves gallery/index.html etc.; redirect:true
// handles /gallery → /gallery/.
backendApp.use(
  express.static(browserDir, {
    maxAge: '1y',
    index: ['index.html'],
    redirect: true,
  })
);

// SPA fallback: any unhandled GET gets the CSR shell; the Angular router takes
// over client-side. /api and /uploads are left alone so they 404 normally.
backendApp.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads')) return next();
  res.sendFile(csrShell, (err) => {
    if (err) next(err);
  });
});

// Shared server that forwards bridge (req, res) calls into Express.
const server = http.createServer(backendApp);

// Vercel Node bridge entry point.
module.exports = (req, res) => {
  server.emit('request', req, res);
};

// Exposed for local testing of the composed app (boot via `require(...).app`).
module.exports.app = backendApp;

// Allow local testing: node api/index.js  → http://localhost:4000
if (require.main === module) {
  const port = process.env.PORT || 4000;
  backendApp.listen(port, () => console.log(`Combined app on http://localhost:${port}`));
}
