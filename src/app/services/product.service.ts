// src/app/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../core/models/product.model';

export interface ProductQueryOptions {
  search?: string;
  sort?: string; // 'newest' | 'price_asc' | 'price_desc'
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = '/api/products';  // ✅ Proxy routes this to port 4000

  // Gallery management lives under the admin-only route prefix in index.js
  // (POST/DELETE .../api/admin/products/:id/images...) — separate from the
  // public /api/products base above.
  private adminApiUrl = '/api/admin/products';

  constructor(private http: HttpClient) {}

  getProducts(options: ProductQueryOptions = {}): Observable<Product[]> {
    // The `products` table is unified across brands (brand/product_type
    // columns). Without a brand filter, the backend returns everything —
    // Pooboo apparel/fabrics/accessories included. Scope this to ZULU.
    const params: Record<string, string> = { brand: 'zulu' };
    if (options.search) params['search'] = options.search;
    if (options.sort) params['sort'] = options.sort;

    return this.http.get<Product[]>(this.apiUrl, { params });
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  // ── Multi-image gallery management (Zulu admin) ──────────────────
  // Reusable by the other stores when they adopt the same product_images table.

  // Add new image(s) to a product. `labels` is an optional string array aligned
  // with the uploaded files (e.g. ['Front', 'Back']).
  addImages(productId: number, files: File[], labels: string[] = []): Observable<any> {
    const formData = new FormData();
    files.forEach((file, i) => {
      formData.append('images', file);
    });
    formData.append('labels', JSON.stringify(labels));
    return this.http.post<any>(`${this.adminApiUrl}/${productId}/images`, formData);
  }

  // Delete one gallery image.
  deleteImage(productId: number, imageId: number): Observable<any> {
    return this.http.delete<any>(`${this.adminApiUrl}/${productId}/images/${imageId}`);
  }

  // Reorder the gallery. `orderedIds` is the image ids in their new order
  // (first id becomes the listing thumbnail). Optional `labels` map lets the
  // caller persist label changes at the same time.
  reorderImages(productId: number, orderedIds: number[], labels: Record<number, string> = {}): Observable<any> {
    return this.http.post<any>(`${this.adminApiUrl}/${productId}/images/reorder`, { orderedIds, labels });
  }
}