-- 006_pooboo_age_groups.sql — Pooboo age_group single -> age_groups multi (tick-box)

-- Add JSONB array column for multi age groups (preset 8, no custom)
ALTER TABLE pooboo_products ADD COLUMN IF NOT EXISTS age_groups JSONB NOT NULL DEFAULT '[]';

-- Backfill existing single age_group into array (one-element)
UPDATE pooboo_products
SET age_groups = to_jsonb(ARRAY[age_group])
WHERE age_group IS NOT NULL AND age_group <> '' AND (age_groups IS NULL OR age_groups = '[]'::jsonb);

-- GIN index for containment queries (age_groups @> to_jsonb('X'))
CREATE INDEX IF NOT EXISTS idx_pooboo_products_age_groups ON pooboo_products USING GIN (age_groups);

-- Unified products table already has age_group VARCHAR for ZULU compat — keep as-is.
-- Optionally add age_groups JSONB there too for future Pooboo multi sync, but per plan we keep single mirror only.
-- If you want unified multi in future, uncomment:
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS age_groups JSONB NOT NULL DEFAULT '[]';
-- CREATE INDEX IF NOT EXISTS idx_products_age_groups ON products USING GIN (age_groups);
