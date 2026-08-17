-- =====================================================================
-- ZULU e-commerce — PostgreSQL schema for Supabase
--
-- Port of zulu-backend/schema.sql (MySQL) + the boot-time migrations in
-- index.js into a single Postgres schema. Idempotent — safe to run in the
-- Supabase SQL editor (or via `psql`) any number of times.
--
-- Conventions:
--   * id columns use SERIAL (explicit ids may be inserted during migration;
--     run the setval block at the end of a data import to resync sequences)
--   * TINYINT(1) 0/1 flags became SMALLINT so existing `=== 1` checks keep working
--   * JSON columns became JSONB
--   * MySQL ENUM columns became TEXT + CHECK constraints
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(20)  NOT NULL DEFAULT 'customer',
  phone1     VARCHAR(15)  NULL,
  phone2     VARCHAR(15)  NULL,
  address1   VARCHAR(500) NULL,
  address2   VARCHAR(500) NULL,
  pincode    VARCHAR(10)  NULL,
  district   VARCHAR(150) NULL,
  state      VARCHAR(150) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT now(),
  CONSTRAINT uniq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT now(),
  CONSTRAINT uniq_categories_name UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS subcategories (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER     NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories (category_id);

CREATE TABLE IF NOT EXISTS products (
  id              SERIAL PRIMARY KEY,
  brand           VARCHAR(50)   NOT NULL DEFAULT 'zulu',
  product_type    VARCHAR(50)   NOT NULL DEFAULT 'apparel',
  name            VARCHAR(255)  NOT NULL,
  description     TEXT          NULL,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  category        VARCHAR(150)  NULL,
  subcategory     VARCHAR(150)  NULL,
  image_url       VARCHAR(255)  NULL,
  stock           INTEGER       NOT NULL DEFAULT 0,
  balance_stock   INTEGER       NOT NULL DEFAULT 0,
  product_code    VARCHAR(100)  NOT NULL DEFAULT '',
  size            VARCHAR(50)   NULL,
  tag             VARCHAR(30)   NULL,
  colour          VARCHAR(100)  NULL,
  fit             VARCHAR(50)   NULL,
  care            VARCHAR(255)  NULL,
  details         JSONB         NULL,
  sizes           JSONB         NULL,
  tags            JSONB         NULL,
  age_group       VARCHAR(50)   NOT NULL DEFAULT '',
  gender          VARCHAR(50)   NOT NULL DEFAULT '',
  colours         JSONB         NULL,
  is_customizable SMALLINT      NOT NULL DEFAULT 0,
  is_active       SMALLINT      NOT NULL DEFAULT 1,
  fabric_type     VARCHAR(100)  NOT NULL DEFAULT '',
  price_per_meter DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_meters    INTEGER       NOT NULL DEFAULT 0,
  accessory_type  VARCHAR(100)  NOT NULL DEFAULT '',
  created_at      TIMESTAMP     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products (product_type);

CREATE TABLE IF NOT EXISTS product_images (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER     NOT NULL,
  image_url     VARCHAR(255) NOT NULL,
  display_order INTEGER     NOT NULL DEFAULT 1,
  label         VARCHAR(50) NOT NULL DEFAULT '',
  created_at    TIMESTAMP   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON product_images (product_id, display_order);

CREATE TABLE IF NOT EXISTS pooboo_products (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255)  NOT NULL,
  description     TEXT          NULL,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  category        VARCHAR(150)  NULL,
  age_group       VARCHAR(50)   NOT NULL DEFAULT '',
  gender          VARCHAR(50)   NOT NULL DEFAULT 'unisex',
  sizes           JSONB         NULL,
  colours         JSONB         NULL,
  details         JSONB         NULL,
  tags            JSONB         NULL,
  image_url       VARCHAR(255)  NULL,
  stock           INTEGER       NOT NULL DEFAULT 0,
  balance_stock   INTEGER       NOT NULL DEFAULT 0,
  product_code    VARCHAR(100)  NOT NULL DEFAULT '',
  is_customizable SMALLINT      NOT NULL DEFAULT 0,
  is_active       SMALLINT      NOT NULL DEFAULT 1,
  created_at      TIMESTAMP     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pooboo_products_category ON pooboo_products (category);
CREATE INDEX IF NOT EXISTS idx_pooboo_products_is_active ON pooboo_products (is_active);

CREATE TABLE IF NOT EXISTS pooboo_fabrics (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255)  NOT NULL,
  fabric_type     VARCHAR(100)  NOT NULL DEFAULT '',
  product_code    VARCHAR(100)  NOT NULL DEFAULT '',
  price_per_meter DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  colour          VARCHAR(100)  NOT NULL DEFAULT '',
  total_meters    INTEGER       NOT NULL DEFAULT 0,
  balance_stock   INTEGER       NOT NULL DEFAULT 0,
  description     TEXT          NULL,
  tags            JSONB         NULL,
  image_url       VARCHAR(255)  NULL,
  is_active       SMALLINT      NOT NULL DEFAULT 1,
  created_at      TIMESTAMP     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pooboo_fabrics_type ON pooboo_fabrics (fabric_type);

CREATE TABLE IF NOT EXISTS pooboo_accessories (
  id              SERIAL PRIMARY KEY,
  accessory_type  VARCHAR(100)  NOT NULL DEFAULT '',
  product_code    VARCHAR(100)  NOT NULL DEFAULT '',
  name            VARCHAR(255)  NOT NULL,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  colour          VARCHAR(100)  NOT NULL DEFAULT '',
  stock           INTEGER       NOT NULL DEFAULT 0,
  balance_stock   INTEGER       NOT NULL DEFAULT 0,
  description     TEXT          NULL,
  tags            JSONB         NULL,
  image_url       VARCHAR(255)  NULL,
  is_active       SMALLINT      NOT NULL DEFAULT 1,
  created_at      TIMESTAMP     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pooboo_accessories_type ON pooboo_accessories (accessory_type);

CREATE TABLE IF NOT EXISTS orders (
  id                        SERIAL PRIMARY KEY,
  user_name                 VARCHAR(150)  NOT NULL,
  phone                     VARCHAR(20)   NOT NULL,
  email                     VARCHAR(255)  NOT NULL DEFAULT '',
  address                   VARCHAR(500)  NOT NULL,
  total_amount              DECIMAL(10,2) NOT NULL,
  payment_id                VARCHAR(100)  NULL,
  status                    TEXT          NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled','cancellation_requested')),
  refund_amount             DECIMAL(10,2) NULL,
  penalty_amount            DECIMAL(10,2) NULL,
  cancellation_requested_at TIMESTAMP     NULL,
  pre_cancel_status         VARCHAR(20)   NULL,
  refund_completed_at       TIMESTAMP     NULL,
  created_at                TIMESTAMP     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders (email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER       NOT NULL,
  brand        VARCHAR(50)   NOT NULL DEFAULT 'zulu',
  product_type VARCHAR(50)   NOT NULL DEFAULT 'apparel',
  product_code VARCHAR(100)  NOT NULL DEFAULT '',
  quantity     INTEGER       NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  size         VARCHAR(50)   NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

CREATE TABLE IF NOT EXISTS reviews (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  rating     SMALLINT     NOT NULL DEFAULT 5,
  comment    TEXT         NULL,
  image      VARCHAR(255) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews (created_at);

CREATE TABLE IF NOT EXISTS pooboo_reviews (
  id             SERIAL PRIMARY KEY,
  product_id     INTEGER      NULL,
  product_name   VARCHAR(255) NULL,
  customer_id    INTEGER      NOT NULL,
  customer_name  VARCHAR(150) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  rating         SMALLINT     NOT NULL,
  title          VARCHAR(100) NOT NULL,
  body           TEXT         NOT NULL,
  photo_url      VARCHAR(500) NULL,
  brand          VARCHAR(50)  NOT NULL DEFAULT 'pooboo',
  is_visible     SMALLINT     NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pooboo_reviews_brand ON pooboo_reviews (brand);
CREATE INDEX IF NOT EXISTS idx_pooboo_reviews_product_id ON pooboo_reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_pooboo_reviews_customer_id ON pooboo_reviews (customer_id);
CREATE INDEX IF NOT EXISTS idx_pooboo_reviews_rating ON pooboo_reviews (rating);
CREATE INDEX IF NOT EXISTS idx_pooboo_reviews_created_at ON pooboo_reviews (created_at);

CREATE TABLE IF NOT EXISTS pooboo_enquiries (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  phone        VARCHAR(20)  NOT NULL,
  email        VARCHAR(180) NOT NULL DEFAULT '',
  place        VARCHAR(150) NOT NULL DEFAULT '',
  product_link VARCHAR(255) NOT NULL DEFAULT '',
  status       TEXT         NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','completed')),
  created_at   TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pooboo_enquiries_status ON pooboo_enquiries (status);
CREATE INDEX IF NOT EXISTS idx_pooboo_enquiries_created_at ON pooboo_enquiries (created_at);

CREATE TABLE IF NOT EXISTS wishlist (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER       NOT NULL,
  user_name    VARCHAR(150)  NOT NULL DEFAULT '',
  user_email   VARCHAR(255)  NOT NULL,
  item_type    TEXT          NOT NULL
    CHECK (item_type IN ('zulu_product','pooboo_product','pooboo_fabric','pooboo_accessory')),
  item_id      INTEGER       NOT NULL,
  brand        VARCHAR(20)   NOT NULL,
  category     VARCHAR(100)  NULL,
  product_name VARCHAR(255)  NOT NULL,
  product_code VARCHAR(100)  NULL,
  image_url    VARCHAR(500)  NULL,
  price        DECIMAL(10,2) NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT now(),
  CONSTRAINT uniq_wishlist_user_item UNIQUE (user_id, item_type, item_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_email ON wishlist (user_email);
CREATE INDEX IF NOT EXISTS idx_wishlist_item ON wishlist (item_type, item_id);

CREATE TABLE IF NOT EXISTS gallery_images (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(150) NOT NULL DEFAULT '',
  description   VARCHAR(500) NOT NULL DEFAULT '',
  image_url     VARCHAR(255) NOT NULL,
  display_order INTEGER      NOT NULL DEFAULT 1,
  created_at    TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_images_order ON gallery_images (display_order);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255) NOT NULL,
  subscribed_at TIMESTAMP   NOT NULL DEFAULT now(),
  is_active    SMALLINT     NOT NULL DEFAULT 1,
  created_at   TIMESTAMP    NOT NULL DEFAULT now(),
  CONSTRAINT uniq_newsletter_email UNIQUE (email)
);

-- Resync sequences after a data import (explicit ids do not advance SERIAL).
-- SELECT setval(pg_get_serial_sequence('users','id'),        (SELECT COALESCE(MAX(id),1) FROM users));
-- SELECT setval(pg_get_serial_sequence('categories','id'),   (SELECT COALESCE(MAX(id),1) FROM categories));
-- SELECT setval(pg_get_serial_sequence('subcategories','id'),(SELECT COALESCE(MAX(id),1) FROM subcategories));
-- SELECT setval(pg_get_serial_sequence('products','id'),     (SELECT COALESCE(MAX(id),1) FROM products));
-- SELECT setval(pg_get_serial_sequence('product_images','id'),(SELECT COALESCE(MAX(id),1) FROM product_images));
-- SELECT setval(pg_get_serial_sequence('pooboo_products','id'),(SELECT COALESCE(MAX(id),1) FROM pooboo_products));
-- SELECT setval(pg_get_serial_sequence('pooboo_fabrics','id'),(SELECT COALESCE(MAX(id),1) FROM pooboo_fabrics));
-- SELECT setval(pg_get_serial_sequence('pooboo_accessories','id'),(SELECT COALESCE(MAX(id),1) FROM pooboo_accessories));
-- SELECT setval(pg_get_serial_sequence('orders','id'),       (SELECT COALESCE(MAX(id),1) FROM orders));
-- SELECT setval(pg_get_serial_sequence('order_items','id'),  (SELECT COALESCE(MAX(id),1) FROM order_items));
-- SELECT setval(pg_get_serial_sequence('reviews','id'),      (SELECT COALESCE(MAX(id),1) FROM reviews));
-- SELECT setval(pg_get_serial_sequence('pooboo_reviews','id'),(SELECT COALESCE(MAX(id),1) FROM pooboo_reviews));
-- SELECT setval(pg_get_serial_sequence('pooboo_enquiries','id'),(SELECT COALESCE(MAX(id),1) FROM pooboo_enquiries));
-- SELECT setval(pg_get_serial_sequence('wishlist','id'),     (SELECT COALESCE(MAX(id),1) FROM wishlist));
-- SELECT setval(pg_get_serial_sequence('gallery_images','id'),(SELECT COALESCE(MAX(id),1) FROM gallery_images));
-- SELECT setval(pg_get_serial_sequence('newsletter_subscribers','id'),(SELECT COALESCE(MAX(id),1) FROM newsletter_subscribers));