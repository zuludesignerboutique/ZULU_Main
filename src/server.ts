import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';

import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

/* ==============================
   ANGULAR ENGINE
=============================== */
const angularApp = new AngularNodeAppEngine();
app.use(express.json());

/* ==============================
   STATIC FILES
=============================== */
// Serve uploaded images (uploaded files live in zulu-backend/uploads)
app.use('/uploads', express.static(join(import.meta.dirname, '../uploads')));

// Serve Angular browser files
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/* ==============================
   ANGULAR SSR HANDLER
=============================== */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/* ==============================
   SERVER START
=============================== */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;

  app.listen(port, (error) => {
    if (error) throw error;

    console.log(`Server running at http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
