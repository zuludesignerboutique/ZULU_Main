# ZULU Boutique

E-commerce web app for two storefronts:

- **ZULU** — luxury boutique (apparel, jewellery & accessories) with a dark + gold theme.
- **POOBOO** — kids' boutique (apparel, fabrics & accessories) with its own playful theme.

The frontend is an [Angular](https://angular.dev/) (v21) single-page application; the backend is a Node.js/Express API that serves both storefronts from one unified database.

## Tech stack

- **Frontend:** Angular 21 (standalone components), TypeScript, SCSS, Bootstrap 5, SSR (`@angular/ssr`)
- **Backend:** Node.js + Express 5, `pg` (PostgreSQL)
- **Auth:** JWT (`jsonwebtoken`) + bcrypt
- **Payments:** Razorpay (order creation + webhook verification)
- **Email:** Nodemailer (order confirmations, cancellations, enquiries, newsletter, contact)
- **Uploads:** Supabase Storage when configured, local `./uploads` fallback for development
- **Deployment:** Vercel (`vercel.json` rewires `/api` and `/uploads` to the backend)

## Project structure

```
.
├── src/                          # Angular frontend
│   ├── app/
│   │   ├── admin/                # ZULU admin (products, orders, gallery, stock, …)
│   │   ├── components/toast/     # Global toast + confirm-dialog system
│   │   ├── layout/               # Header / footer
│   │   ├── pages/                # Storefront pages (shop, cart, checkout, order history, …)
│   │   ├── pooboo/               # POOBOO storefront + admin
│   │   ├── services/             # Toast, auth, product, etc.
│   │   ├── app.ts                # Root component (mounts <app-toast>)
│   │   └── app.routes.ts
│   ├── main.ts / main.server.ts
│   └── styles.scss               # Global ZULU theme (CSS vars)
├── zulu-backend/
│   ├── src/
│   │   ├── index.js              # Express API (all endpoints)
│   │   ├── db.js                 # PostgreSQL pool adapter
│   │   └── storage.js            # Upload abstraction (Supabase | local)
│   └── scripts/
│       ├── apply-schema.js       # Apply the DB schema from SQL
│       ├── migrate-data.js       # One-off migration from a MySQL source
│       └── upload-files.js       # One-off upload migration helper
├── angular.json
├── proxy.conf.json               # Dev proxy → backend (localhost:4000)
└── vercel.json                   # Vercel build + rewrite config
```

## Getting started

### Prerequisites

- Node.js 20+
- npm
- A PostgreSQL database (local or hosted, e.g. Supabase)
- Optionally: Razorpay and SMTP credentials for live payments/email

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the backend

The backend reads its configuration from `zulu-backend/.env` (not committed). Copy it from the environment template or create it with the variables below.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (or use the individual `DB_*` vars) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | dev | Individual connection fields used when `DATABASE_URL` is unset |
| `DB_SSL` | no | Set to `false` to disable SSL (local Postgres) |
| `JWT_SECRET` | yes | Secret used to sign auth tokens |
| `PORT` | no | API port (default `4000`) |
| `FRONTEND_URL` | yes (prod) | Allowed CORS origin(s), comma-separated; used for order-history email links |
| `ADMIN_EMAIL` | no | Recipient for admin notifications (defaults to `EMAIL_USER`) |
| `EMAIL_USER` / `EMAIL_PASS` | yes (email) | SMTP credentials for Nodemailer |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | yes (payments) | Razorpay API keys |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` / `SUPABASE_BUCKET` | no | Enables cloud uploads; when unset, files are stored in `zulu-backend/uploads/` |

### 3. Set up the database

```bash
cd zulu-backend
node scripts/apply-schema.js
```

### 4. Run in development

From the project root — this starts the Angular dev server **and** the API together:

```bash
npm run dev
```

- Frontend: http://localhost:4200 (proxies `/api`, `/uploads`, `/login`, `/signup` to the backend via `proxy.conf.json`)
- API: http://localhost:4000

Or run them separately:

```bash
npm start          # ng serve only
npm run start:api  # node zulu-backend/src/index.js
```

## Building

```bash
npm run build
```

The production build is output to `dist/myapp/browser`. The API is served as a Vercel serverless function (`/api/index.js`).

## Toast system

`alert()`/`confirm()` are replaced by a store-themed toast component mounted globally in `src/app/app.html`:

```ts
this.toast.success('Saved!');            // auto-dismisses after 4s
this.toast.error('Something went wrong');
this.toast.info('Heads up');

const ok = await this.toast.confirm({
  title: 'Delete product?',
  message: 'This cannot be undone.',
  confirmLabel: 'Delete',
});
if (!ok) return;
```

Methods that call `confirm()` must be `async` and `await` the result. See `src/app/services/toast.service.ts` and `src/app/components/toast/`.

## Key scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run frontend + backend with hot reload |
| `npm run build` | Production build of the Angular app |
| `npm start` | `ng serve` |
| `npm run start:api` | Run only the Express API |
| `npm test` | Run unit tests (Vitest) |