import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';

import express from 'express';
import mysql from 'mysql2/promise';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

/* ==============================
   MySQL DATABASE CONNECTION
================================ */
const db = await mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Navilu@2003',
  database: 'zulu_db',
});

/* ==============================
   ANGULAR ENGINE
================================ */
const angularApp = new AngularNodeAppEngine();

/* ==============================
   API ROUTES
================================ */

// GET all categories
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET subcategories by category
app.get('/api/subcategories/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;

    const [rows] = await db.query(
      'SELECT * FROM subcategories WHERE category_id = ?',
      [categoryId]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

/* ==============================
   STATIC FILES
================================ */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/* ==============================
   ANGULAR SSR HANDLER
================================ */
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
================================ */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;

  app.listen(port, (error) => {
    if (error) throw error;

    console.log(`Server running at http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);