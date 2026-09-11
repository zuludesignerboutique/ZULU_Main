# Plan: Pooboo Multi-Image (Option B — Separate Tables) — 4 images, shared labels

## Context
- ZULU apparel already supports 4 images via `product_images` (display_order + label Front/Back/Side/Full) — frontend `src/app/admin/add-product`/`edit-product` and backend `zulu-backend/src/index.js:1955` gallery routes. Verified max 4 enforced both sides.
- Pooboo catalogs (products/apparel, fabrics, accessories) are single-image today: `upload.single('image')` (`zulu-backend/src/index.js:3086,3302,3508`), `selectedFile: File | null` (`src/app/pooboo/admin/pooboo-add-product/pooboo-add-product.ts:45`), `<input>` without `multiple`. DB `pooboo_products`/`pooboo_fabrics`/`pooboo_accessories` each have single `image_url VARCHAR(255)` (`zulu-backend/schema.postgres.sql:108,130,147`).
- User confirmed: **Option B** separate tables per type, **4 images uniform** for all three, **labels = Front/Back/Side/Full** shared, **keep unified `products` write-through mirror** (`brand='pooboo'`).
- Previous patches already fixed auto-delete on replace (`zulu-backend/src/index.js:249` `deleteStoredImages` now handles bare filenames) and added orphan scanner (`zulu-backend/scripts/cleanup-orphans.js`) — reuse for new tables.

## Goals
- Bring Pooboo to parity with ZULU multi-image without touching `product_images` (avoids `pooboo_products.id` vs `products.id` collision).
- Keep thumbnail contract: `*_*.image_url` and `products.image_url` = first gallery image (`display_order ASC`).
- No change to `gallery_images` / `category_landing_images` / ZULU flows.

## Scope / Approach
**DB (Option B):** 3 new tables `pooboo_product_images`, `pooboo_fabric_images`, `pooboo_accessory_images` cloned from `product_images` schema (`zulu-backend/schema.postgres.sql:85`). Backfill existing `image_url` as `display_order=1, label=''`. Migrations via `zulu-backend/migrations/005_pooboo_multi_images.sql` + apply script. Also update `zulu-backend/schema.postgres.sql` as source of truth.

**Backend:** Clone ZULU helpers (`fetchProductImages` `zulu-backend/src/index.js:922`, `attachImagesToProducts`, `parseImageLabels` `zulu-backend/src/index.js:964`, `collectUploadedFiles` `zulu-backend/src/index.js:993`, `refreshThumbnail` `zulu-backend/src/index.js:1003`) parameterized for 3 tables (helper functions fetchPooboo*Images / refreshThumbnailFor*). Update 6 existing routes: `POST/PUT /api/pooboo/products|fabrics|accessories` from `upload.single('image')` + `req.file.filename` to `upload.fields([{image,1},{images,4}])` + `collectUploadedFiles` + `parseImageLabels` + `INSERT ... product_images` + cap checks (`SELECT COUNT(*)`, `SELECT MAX(display_order)`). Patch `DELETE /api/pooboo/*/:id` to also `SELECT ... FROM <images>`, `deleteStoredImages(all)`, `DELETE FROM <images>`. Wrap all GETs (`GET /api/pooboo/products` `zulu-backend/src/index.js:3028`, `.../all`, `.../:id`, fabrics `zulu-backend/src/index.js:3210`, accessories `zulu-backend/src/index.js:3432`) with `attachImages` so frontend gets `images[]`. Add 9 gallery admin routes mirroring `zulu-backend/src/index.js:1955`: `POST /api/admin/pooboo/products/:id/images`, `DELETE .../images/:imageId`, `POST .../images/reorder` ×3 (upload.array('images',4), cap 4, `insert display_order = MAX+1`, `deleteStoredImages`, `refreshThumbnail`).

**Frontend (6 components):** Convert `selectedFile` (singular) to `selectedImages: SelectedImage[]` with `maxImages=4`, `imageLabels=['Front','Back','Side','Full']`, `onFilesChange` remaining guard + `FileReader` loop + `input multiple` + `*ngFor` grid (clone `src/app/admin/add-product/add-product.ts:31,453` and `.html:140`). For edit: add `existingImages` + `newImages`, `totalImageCount`/`canAddMoreImages`, `addPendingImages()`, `deleteImage()`, `moveImage()`+`saveOrderAndLabels()` with auto-upload in `update*()` after PUT (clone `src/app/admin/edit-product/edit-product.ts:28,135,207,235`). Files: `pooboo-add-product`, `pooboo-edit-product`, `pooboo-admin-fabrics`, `pooboo-edit-fabric`, `pooboo-admin-accessories`, `pooboo-edit-accessory` (.ts + .html each).

**Shared:** Extend models (`src/app/pooboo/core/models/pooboo-*.model.ts:11` add `images[]`), add gallery methods to services (`src/app/pooboo/services/pooboo-product.service.ts` add `addImages/deleteImage/reorderImages` cloning `src/app/services/product.service.ts:45`, and flesh out `pooboo-fabric.service.ts`/`pooboo-accessory.service.ts` currently read-only). Keep `products` mirror sync: after any gallery insert/delete/reorder, also `refreshThumbnail` on unified `products` row matched by `product_code`.

### Workflow Diagram
```
[DB] migration 005 creates 3 tables + backfills
  -> [Backend] helpers + 6 route swaps (single->multi) + 9 gallery routes + GET wrappers
  -> [Frontend] 6 components: add (multi pick) + edit (existing+new+delete+reorder)
  -> [Models/Services] add images[] + gallery methods
  -> [Migration] keep thumbnail sync (products.image_url = first gallery)
  -> [Verification] lint/build, manual add/edit/reorder/delete, Supabase dir diff, orphan scanner extension
```

## Implementation Steps
1. **DB migration** — create `zulu-backend/migrations/005_pooboo_multi_images.sql` with 3 `CREATE TABLE IF NOT EXISTS` + indexes + backfill `INSERT SELECT image_url` + keep `image_url` as thumbnail. Update `zulu-backend/schema.postgres.sql` to include new tables (so fresh Supabase setups get them). Run locally via `zulu-backend/scripts/apply-migrations.js` or `psql`.
2. **Backend helpers** — add `fetchPoobooProductImages`/`fetchPoobooFabricImages`/`fetchPoobooAccessoryImages`, `attachImagesToPooboo*`, `refreshThumbnailForPooboo*` (parameterized from `zulu-backend/src/index.js:1003`). Ensure `parseImageLabels`/`collectUploadedFiles` reuse (already generic).
3. **Backend POST/PUT** — patch `POST /api/pooboo/products` (`zulu-backend/src/index.js:3086`), `PUT /api/pooboo/products/:id` (`:3141`), `POST/PUT /api/pooboo/fabrics` (`:3302`, `:3353`), `POST/PUT /api/pooboo/accessories` (`:3507`, `:3559`) to use `upload.fields([{image,1},{images,4}])` + gallery insert + cap 4 + thumbnail sync + auto-delete old on single-replace (reuse recent `oldImage` pattern).
4. **Backend DELETE + GETs** — update `DELETE /api/pooboo/*/:id` (`:3207`, `:3400`, `:3605`) to delete gallery rows + `deleteStoredImages(all)`; wrap `GET /api/pooboo/products|fabrics|accessories` and `/all`/`/:id` with `attachImages`.
5. **Backend gallery admin routes** — add 9 routes `POST /api/admin/pooboo/(products|fabrics|accessories)/:id/images` `upload.array('images',4)` + `DELETE .../images/:imageId` + `POST .../images/reorder` cloning `zulu-backend/src/index.js:1955` logic (existingCount+files.length>4 →400, `MAX(display_order)`, `deleteStoredImages`, `refreshThumbnail` + unified sync).
6. **Frontend models/services** — extend `src/app/pooboo/core/models/pooboo-product.model.ts:11` etc. with `images[]`; add `addImages/deleteImage/reorderImages` to `src/app/pooboo/services/pooboo-product.service.ts` and create write methods in `pooboo-fabric.service.ts`/`pooboo-accessory.service.ts` (currently only `getAll/getById`).
7. **Frontend add components** — rewrite `pooboo-add-product/pooboo-add-product.ts:45,70,155` + `.html:130,140`, `pooboo-admin-fabrics/pooboo-admin-fabrics.ts:48,147,201` + `.html:115,138`, `pooboo-admin-accessories/pooboo-admin-accessories.ts:50,172,250` + `.html:129,152` to Zulu multi pattern (`SelectedImage`, `maxImages=4`, `multiple`, `labels` JSON).
8. **Frontend edit components** — rewrite `pooboo-edit-product/pooboo-edit-product.ts:40,129,213` + `.html:156,173`, `pooboo-edit-fabric/pooboo-edit-fabric.ts:32,131,169` + `.html:108,128`, `pooboo-edit-accessory/pooboo-edit-accessory.ts:40,112,174` + `.html:120,140` to dual `existingImages`/`newImages` + `totalImageCount` + `deleteImage`/`moveImage`/`addPendingImages` + auto-upload in save.
9. **Unified mirror sync** — after any gallery mutation, `UPDATE products SET image_url = first gallery` where `brand='pooboo'` and `product_code` matches (keep existing write-through pattern).
10. **Cleanup scanner extension** — update `zulu-backend/scripts/cleanup-orphans.js` to also scan new tables for orphans (add queries for new image tables).

## Risks & Mitigations
- **ID collision** — mitigated by separate tables per Option B (no `product_images` reuse).
- **Existing rows with single image** — backfill ensures no data loss; `image_url` kept as thumbnail until gallery used, `refreshThumbnail` corrects drift.
- **Cap enforcement** — consistent 4 enforced in both frontend (`totalImageCount`) and backend (`COUNT(*) + files.length >4 →400`), same as ZULU.
- **Storage leaky deletes** — reuse fixed `deleteStoredImages` (`zulu-backend/src/index.js:249` now handles bare names) and non-blocking `.catch(()=>{})`.
- **Unified sync drift** — wrap with `if (product_code)` guard; log `errU` but don't fail gallery operation.
- **Supabase vs local** — `persistUploads()` + `storageApi.saveBuffer` already handles both; no storage.js change needed.

## Testing & Verification
- `npm run build` + `node --check zulu-backend/src/index.js` + no TS errors in 6 touched components.
- Manual: add product/fabric/accessory with 1-4 images + labels; edit: add more up to 4 (verify 5th blocked), delete middle, reorder, save order; verify `products.image_url` thumbnail = first gallery; verify Supabase/local dir file count matches DB; run `cleanup-orphans.js` dry-run shows 0 orphans after delete.
- Edge: replace single legacy `image` vs multi `images` both still accepted (`upload.fields`); test `canAddMoreImages` guard when `existing=4`.
- Regression: ZULU 4-image flows unchanged; fabric/accessory inline add forms still work.

## Open Questions (resolved per user, recorded)
- Max 4 uniform — confirmed.
- Labels Front/Back/Side/Full shared — confirmed.
- Separate tables Option B — confirmed.
- Keep unified write-through — confirmed.
- No additional asks (price/size-specific images not in scope).
