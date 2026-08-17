-- =====================================================================
-- ZULU e-commerce — MySQL schema (canonical snapshot)
--
-- Reverse-engineered from zulu-backend/src/index.js (CREATE TABLE /
-- INSERT / ALTER statements) — the backend is the source of truth.
--
-- Notes:
--  * The server auto-creates some tables on boot (CREATE TABLE IF NOT
--    EXISTS): pooboo_reviews, pooboo_enquiries, wishlist, pooboo_fabrics,
--    pooboo_accessories, product_images, gallery_images. Running this file
--    is still recommended so the whole DB is present up front.
--  * Columns marked "migration" are added by ALTER TABLE blocks in
--    index.js; they are inlined here so this file reflects the FINAL
--    table shape, not the original CREATE.
--  * The unified `products` table is shared by the ZULU storefront AND
--    the POOBOO admin (apparel/fabric/accessory rows all land here via a
--    "sync" INSERT). pooboo_products/fabrics/accessories are the
--    storefront-facing tables.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS zulu_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE zulu_db;

-- =====================================================================
-- USERS  (signup/login + customer dashboard profile)
-- profile columns (phone1…state) are migration-added.
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
  id         INT           NOT NULL AUTO_INCREMENT,
  name       VARCHAR(150)  NOT NULL,
  email      VARCHAR(255)  NOT NULL,
  password   VARCHAR(255)  NOT NULL,
  role       VARCHAR(20)   NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  phone1     VARCHAR(15)   NULL,                        -- migration
  phone2     VARCHAR(15)   NULL,                        -- migration
  address1   VARCHAR(500)  NULL,                        -- migration
  address2   VARCHAR(500)  NULL,                        -- migration
  pincode    VARCHAR(10)   NULL,                        -- migration
  district   VARCHAR(150)  NULL,                        -- migration
  state      VARCHAR(150)  NULL,                        -- migration
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- CATEGORIES / SUBCATEGORIES  (admin-managed catalog tree)
-- =====================================================================
CREATE TABLE IF NOT EXISTS categories (
  id         INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(150) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subcategories (
  id          INT          NOT NULL AUTO_INCREMENT,
  category_id INT          NOT NULL,
  name        VARCHAR(150) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_category_id (category_id),
  CONSTRAINT fk_subcategory_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- PRODUCTS  (unified catalog: ZULU apparel + POOBOO apparel/fabric/
-- accessory rows synced here by the admin endpoints)
-- Many columns are migration-added; kept in one table as-is.
-- =====================================================================
CREATE TABLE IF NOT EXISTS products (
  id              INT           NOT NULL AUTO_INCREMENT,
  brand           VARCHAR(50)   NOT NULL DEFAULT 'zulu',
  product_type    VARCHAR(50)   NOT NULL DEFAULT 'apparel',   -- migration
  name            VARCHAR(255)  NOT NULL,
  description     TEXT          NULL,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  category        VARCHAR(150)  NULL,
  subcategory     VARCHAR(150)  NULL,
  image_url       VARCHAR(255)  NULL,
  stock           INT           NOT NULL DEFAULT 0,
  balance_stock   INT           NOT NULL DEFAULT 0,           -- migration
  product_code    VARCHAR(100)  NOT NULL DEFAULT '',
  size            VARCHAR(50)   NULL,
  tag             VARCHAR(30)   NULL,                          -- migration
  colour          VARCHAR(100)  NULL,
  fit             VARCHAR(50)   NULL,
  care            VARCHAR(255)  NULL,
  details         JSON          NULL,
  sizes           JSON          NULL,
  tags            JSON          NULL,                          -- migration
  age_group       VARCHAR(50)   NOT NULL DEFAULT '',           -- migration
  gender          VARCHAR(50)   NOT NULL DEFAULT '',           -- migration
  colours         JSON          NULL,                          -- migration
  is_customizable TINYINT(1)    NOT NULL DEFAULT 0,            -- migration
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,            -- migration
  fabric_type     VARCHAR(100)  NOT NULL DEFAULT '',           -- migration
  price_per_meter DECIMAL(10,2) NOT NULL DEFAULT 0,            -- migration
  total_meters    INT           NOT NULL DEFAULT 0,            -- migration
  accessory_type  VARCHAR(100)  NOT NULL DEFAULT '',           -- migration
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_brand          (brand),
  INDEX idx_category       (category),
  INDEX idx_is_active      (is_active),
  INDEX idx_product_type   (product_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- PRODUCT_IMAGES  (ZULU multi-image gallery, max 4 per product;
-- products.image_url stays as the thumbnail)
-- =====================================================================
CREATE TABLE IF NOT EXISTS product_images (
  id            INT          NOT NULL AUTO_INCREMENT,
  product_id    INT          NOT NULL,
  image_url     VARCHAR(255) NOT NULL,
  display_order INT          NOT NULL DEFAULT 1,
  label         VARCHAR(50)  NOT NULL DEFAULT '',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_product_id (product_id),
  INDEX idx_display_order (product_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- POOBOO_PRODUCTS  (POOBOO apparel storefront table)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pooboo_products (
  id              INT           NOT NULL AUTO_INCREMENT,
  name            VARCHAR(255)  NOT NULL,
  description     TEXT          NULL,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  category        VARCHAR(150)  NULL,
  age_group       VARCHAR(50)   NOT NULL DEFAULT '',
  gender          VARCHAR(50)   NOT NULL DEFAULT 'unisex',
  sizes           JSON          NULL,
  colours         JSON          NULL,
  details         JSON          NULL,
  tags            JSON          NULL,
  image_url       VARCHAR(255)  NULL,
  stock           INT           NOT NULL DEFAULT 0,
  balance_stock   INT           NOT NULL DEFAULT 0,
  product_code    VARCHAR(100)  NOT NULL DEFAULT '',
  is_customizable TINYINT(1)    NOT NULL DEFAULT 0,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_category  (category),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- POOBOO_FABRICS  (POOBOO fabric yardage)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pooboo_fabrics (
  id              INT           NOT NULL AUTO_INCREMENT,
  name            VARCHAR(255)  NOT NULL,
  fabric_type     VARCHAR(100)  NOT NULL DEFAULT '',  -- migration
  product_code    VARCHAR(100)  NOT NULL DEFAULT '',
  price_per_meter DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  colour          VARCHAR(100)  NOT NULL DEFAULT '',
  total_meters    INT           NOT NULL DEFAULT 0,
  balance_stock   INT           NOT NULL DEFAULT 0,
  description     TEXT          NULL,
  tags            JSON          NULL,                  -- migration
  image_url       VARCHAR(255)  NULL,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_fabric_type (fabric_type)                  -- migration
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- POOBOO_ACCESSORIES  (POOBOO accessories: hair clips, bands, ornaments…)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pooboo_accessories (
  id              INT           NOT NULL AUTO_INCREMENT,
  accessory_type  VARCHAR(100)  NOT NULL DEFAULT '',
  product_code    VARCHAR(100)  NOT NULL DEFAULT '',  -- migration
  name            VARCHAR(255)  NOT NULL,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  colour          VARCHAR(100)  NOT NULL DEFAULT '',
  stock           INT           NOT NULL DEFAULT 0,
  balance_stock   INT           NOT NULL DEFAULT 0,   -- migration
  description     TEXT          NULL,
  tags            JSON          NULL,                  -- migration
  image_url       VARCHAR(255)  NULL,
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_accessory_type (accessory_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- ORDERS  (brand-aware checkout; status extended over time to include
-- 'cancellation_requested'; refund/cancellation columns are migrations)
-- =====================================================================
CREATE TABLE IF NOT EXISTS orders (
  id                       INT           NOT NULL AUTO_INCREMENT,
  user_name                VARCHAR(150)  NOT NULL,
  phone                    VARCHAR(20)   NOT NULL,
  email                    VARCHAR(255)  NOT NULL DEFAULT '',
  address                  VARCHAR(500)  NOT NULL,
  total_amount             DECIMAL(10,2) NOT NULL,
  payment_id               VARCHAR(100)  NULL,
  status                   ENUM('pending','confirmed','shipped','delivered','cancelled','cancellation_requested') NOT NULL DEFAULT 'pending',
  refund_amount            DECIMAL(10,2) NULL,  -- migration
  penalty_amount           DECIMAL(10,2) NULL,  -- migration
  cancellation_requested_at DATETIME      NULL,  -- migration
  pre_cancel_status        VARCHAR(20)   NULL,  -- migration
  refund_completed_at      DATETIME      NULL,  -- migration
  created_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email   (email),
  INDEX idx_status  (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- ORDER_ITEMS  (brand/product_type/product_code are migrations)
-- =====================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id           INT           NOT NULL AUTO_INCREMENT,
  order_id     INT           NOT NULL,
  product_id   INT           NOT NULL,
  brand        VARCHAR(50)   NOT NULL DEFAULT 'zulu',      -- migration
  product_type VARCHAR(50)   NOT NULL DEFAULT 'apparel',   -- migration
  product_code VARCHAR(100)  NOT NULL DEFAULT '',          -- migration
  quantity     INT           NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  size         VARCHAR(50)   NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_order_id (order_id),
  CONSTRAINT fk_order_item_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- REVIEWS  (LEGACY ZULU reviews table — keep for old endpoints)
-- /api/reviews and /reviews still read/write this table.
-- Newer brand-scoped reviews live in pooboo_reviews instead.
-- =====================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id         INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(150) NOT NULL,
  rating     TINYINT      NOT NULL DEFAULT 5,
  comment    TEXT         NULL,
  image      VARCHAR(255) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- POOBOO_REVIEWS  (modern, brand-scoped reviews shared by ZULU +
-- POOBOO; scoped via `brand` = 'pooboo' | 'zulu')
-- =====================================================================
CREATE TABLE IF NOT EXISTS pooboo_reviews (
  id             INT           NOT NULL AUTO_INCREMENT,
  product_id     INT           NULL,
  product_name   VARCHAR(255)  NULL,
  customer_id    INT           NOT NULL,
  customer_name  VARCHAR(150)  NOT NULL,
  customer_email VARCHAR(255)  NOT NULL,
  rating         TINYINT       NOT NULL,
  title          VARCHAR(100)  NOT NULL,
  body           TEXT          NOT NULL,
  photo_url      VARCHAR(500)  NULL,
  brand          VARCHAR(50)   NOT NULL DEFAULT 'pooboo',
  is_visible     TINYINT(1)    NOT NULL DEFAULT 1,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_brand       (brand),
  INDEX idx_product_id  (product_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_rating      (rating),
  INDEX idx_created_at  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- POOBOO_ENQUIRIES  (POOBOO "contact us" enquiries; product_link is a
-- migration)
-- =====================================================================
CREATE TABLE IF NOT EXISTS pooboo_enquiries (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120) NOT NULL,
  phone        VARCHAR(20)  NOT NULL,
  email        VARCHAR(180) NOT NULL DEFAULT '',
  place        VARCHAR(150) NOT NULL DEFAULT '',
  product_link VARCHAR(255) NOT NULL DEFAULT '',  -- migration
  status       ENUM('new','contacted','completed') NOT NULL DEFAULT 'new',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_status     (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- WISHLIST  (shared across ZULU + all POOBOO catalogs; denormalized
-- snapshot of the item at add-time)
-- =====================================================================
CREATE TABLE IF NOT EXISTS wishlist (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id      INT           NOT NULL,
  user_name    VARCHAR(150)  NOT NULL DEFAULT '',
  user_email   VARCHAR(255)  NOT NULL,
  item_type    ENUM('zulu_product','pooboo_product','pooboo_fabric','pooboo_accessory') NOT NULL,
  item_id      INT           NOT NULL,
  brand        VARCHAR(20)   NOT NULL,
  category     VARCHAR(100)  NULL,
  product_name VARCHAR(255)  NOT NULL,
  product_code VARCHAR(100)  NULL,
  image_url    VARCHAR(500)  NULL,
  price        DECIMAL(10,2) NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_user_item (user_id, item_type, item_id),
  INDEX idx_user_email (user_email),
  INDEX idx_item       (item_type, item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- GALLERY_IMAGES  (admin-managed ZULU storefront Gallery page)
-- =====================================================================
CREATE TABLE IF NOT EXISTS gallery_images (
  id            INT           NOT NULL AUTO_INCREMENT,
  title         VARCHAR(150)  NOT NULL DEFAULT '',
  description   VARCHAR(500)  NOT NULL DEFAULT '',
  image_url     VARCHAR(255)  NOT NULL,
  display_order INT           NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- NEWSLETTER_SUBSCRIBERS  (footer newsletter signups)
-- =====================================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         INT          NOT NULL AUTO_INCREMENT,
  email      VARCHAR(255) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
