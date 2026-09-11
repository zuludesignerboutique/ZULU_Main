import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PoobooProduct } from '../core/models/pooboo-product.model';

@Injectable({ providedIn: 'root' })
export class PoobooProductService {

  private base = '/api/pooboo/products';

  constructor(private http: HttpClient) {}

  getAll(filters?: { age_group?: string; age_groups?: string[]; gender?: string; category?: string; tag?: string }): Observable<PoobooProduct[]> {
    let params = new HttpParams();
    if (filters?.age_groups?.length) params = params.set('age_groups', JSON.stringify(filters.age_groups));
    else if (filters?.age_group) params = params.set('age_group', filters.age_group);
    if (filters?.gender)    params = params.set('gender', filters.gender);
    if (filters?.category)  params = params.set('category', filters.category);
    if (filters?.tag)       params = params.set('tag', filters.tag);
    return this.http.get<PoobooProduct[]>(this.base, { params });
  }

  getById(id: number): Observable<PoobooProduct> {
    return this.http.get<PoobooProduct>(`${this.base}/${id}`);
  }

  add(formData: FormData): Observable<any> {
    return this.http.post(this.base, formData);
  }

  update(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.base}/${id}`, formData);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }

  // ── Multi-image gallery (admin) ──
  private adminBase = '/api/admin/pooboo/products';
  addImages(productId: number, files: File[], labels: string[] = []): Observable<any> {
    const fd = new FormData();
    files.forEach(f => fd.append('images', f));
    fd.append('labels', JSON.stringify(labels));
    return this.http.post(`${this.adminBase}/${productId}/images`, fd);
  }
  deleteImage(productId: number, imageId: number): Observable<any> {
    return this.http.delete(`${this.adminBase}/${productId}/images/${imageId}`);
  }
  reorderImages(productId: number, orderedIds: number[], labels: Record<number, string> = {}): Observable<any> {
    return this.http.post(`${this.adminBase}/${productId}/images/reorder`, { orderedIds, labels });
  }
}
