-- 005_pooboo_multi_images.sql — Pooboo multi-image galleries (Option B)
-- Separate tables per type, 4 max enforced in app layer.

CREATE TABLE IF NOT EXISTS pooboo_product_images (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER     NOT NULL REFERENCES pooboo_products(id) ON DELETE CASCADE,
  image_url     VARCHAR(255) NOT NULL,
  display_order INTEGER     NOT NULL DEFAULT 1,
  label         VARCHAR(50) NOT NULL DEFAULT '',
  created_at    TIMESTAMP   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pooboo_product_images_product ON pooboo_product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_pooboo_product_images_order ON pooboo_product_images (product_id, display_order);

CREATE TABLE IF NOT EXISTS pooboo_fabric_images (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER     NOT NULL REFERENCES pooboo_fabrics(id) ON DELETE CASCADE,
  image_url     VARCHAR(255) NOT NULL,
  display_order INTEGER     NOT NULL DEFAULT 1,
  label         VARCHAR(50) NOT NULL DEFAULT '',
  created_at    TIMESTAMP   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pooboo_fabric_images_product ON pooboo_fabric_images (product_id);
CREATE INDEX IF NOT EXISTS idx_pooboo_fabric_images_order ON pooboo_fabric_images (product_id, display_order);

CREATE TABLE IF NOT EXISTS pooboo_accessory_images (
  id            SERIAL PRIMARY KEY,
  product_id    INTEGER     NOT NULL REFERENCES pooboo_accessories(id) ON DELETE CASCADE,
  image_url     VARCHAR(255) NOT NULL,
  display_order INTEGER     NOT NULL DEFAULT 1,
  label         VARCHAR(50) NOT NULL DEFAULT '',
  created_at    TIMESTAMP   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pooboo_accessory_images_product ON pooboo_accessory_images (product_id);
CREATE INDEX IF NOT EXISTS idx_pooboo_accessory_images_order ON pooboo_accessory_images (product_id, display_order);

-- Backfill existing single image_url as display_order=1 row (preserve current thumbnails)
INSERT INTO pooboo_product_images (product_id, image_url, display_order, label)
SELECT id, image_url, 1, '' FROM pooboo_products WHERE image_url IS NOT NULL AND image_url <> ''
ON CONFLICT DO NOTHING;

INSERT INTO pooboo_fabric_images (product_id, image_url, display_order, label)
SELECT id, image_url, 1, '' FROM pooboo_fabrics WHERE image_url IS NOT NULL AND image_url <> ''
ON CONFLICT DO NOTHING;

INSERT INTO pooboo_accessory_images (product_id, image_url, display_order, label)
SELECT id, image_url, 1, '' FROM pooboo_accessories WHERE image_url IS NOT NULL AND image_url <> ''
ON CONFLICT DO NOTHING;
