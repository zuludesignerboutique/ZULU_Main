# ZULU Backend — Database Setup Guide

Reverse-engineered schema + instructions for getting the MySQL database up
so the Express API (port 4000) can serve the Angular storefront.

## 1. Prerequisites

- MySQL 8.x running locally on `localhost:3306`
- Node.js (the backend uses the `mysql` npm package, `bcrypt`, `jsonwebtoken`)

## 2. Create the database

The canonical schema lives in [`schema.sql`](./schema.sql) (16 tables). From
the `zulu-backend` folder:

```bash
mysql -u root -p < schema.sql
```

Notes:

- The file uses `CREATE TABLE IF NOT EXISTS` and `CREATE DATABASE IF NOT
  EXISTS`, so it is safe to re-run.
- The backend ALSO auto-creates several tables on boot
  (`pooboo_reviews`, `pooboo_enquiries`, `wishlist`, `pooboo_fabrics`,
  `pooboo_accessories`, `product_images`, `gallery_images`) and applies
  "column if missing" migrations with `ALTER TABLE`. `schema.sql` already
  includes all of those, so either path converges on the same shape.

## 3. Configure `zulu-backend/.env`

Copy the values from your current environment. Required keys:

```ini
DB_PASSWORD=your_mysql_root_password
JWT_SECRET=any_long_random_string
EMAIL_USER=your_smtp_user
EMAIL_PASS=your_smtp_password
RAZORPAY_KEY_ID=rzp_live_or_test_...
RAZORPAY_KEY_SECRET=...
```

Optional (have defaults in code):

```ini
PORT=4000
FRONTEND_URL=http://localhost:4200
```

> **Security:**
> An old DB password was previously committed in git history
> (`myapp/src/server.ts`). It has been stripped from the repo. **Rotate the
> MySQL password and update `DB_PASSWORD` in `.env`** before going live.
> `.env` is git-ignored — never commit it.

## 4. Install + run

```bash
npm install          # installs express, mysql, bcrypt, jsonwebtoken, multer, dotenv
npm run dev          # nodemon src/index.js  → http://localhost:4000
```

The server logs `✅ MySQL connected to Zulu DB` on success and prints each
auto-created/migrated table as it is prepared.

## 5. Seed data

There is no dedicated seed script. If you need a fresh catalog:

- The Angular app loads products from `/api/products` — the `products`
  table drives the storefront, so it needs rows (a `brand` column
  distinguishes `zulu` vs `pooboo` catalog entries).
- For POOBOO storefront tables (`pooboo_products`, `pooboo_fabrics`,
  `pooboo_accessories`), add rows via the POOBOO admin UI, which keeps the
  unified `products` table in sync automatically.
- A first admin user can be created through the signup flow (the default
  `role` is `customer`; promote a row to `admin` manually if needed).

## 6. Verify

```bash
curl http://localhost:4000/api/products | head -c 200
curl http://localhost:4000/api/reviews   | head -c 200
```

Each should return JSON (an empty array is fine if there is no data yet).

## Table map

| Table                    | Purpose                                             |
|--------------------------|-----------------------------------------------------|
| `users`                  | Customers + admins, dashboard profile fields        |
| `categories`/`subcategories` | Admin-managed catalog tree                       |
| `products`               | Unified catalog (ZULU + POOBOO rows)                |
| `product_images`         | ZULU multi-image gallery (up to 4 per product)      |
| `pooboo_products`        | POOBOO apparel storefront                           |
| `pooboo_fabrics`         | POOBOO fabric yardage                               |
| `pooboo_accessories`     | POOBOO accessories (hair clips, bands, ornaments)   |
| `orders` / `order_items` | Checkout + brand-aware order line items             |
| `reviews`                | Legacy ZULU reviews (old `/api/reviews` endpoints)  |
| `pooboo_reviews`         | Modern brand-scoped reviews (ZULU + POOBOO)         |
| `pooboo_enquiries`       | POOBOO "contact us" enquiries                       |
| `wishlist`               | Shared wishlist across all catalogs                 |
| `gallery_images`         | Admin-managed storefront gallery                    |
| `newsletter_subscribers` | Footer newsletter signups                           |
