import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PoobooFabric } from '../core/models/pooboo-fabric.model';

@Injectable({ providedIn: 'root' })
export class PoobooFabricService {

  private base = '/api/pooboo/fabrics';

  constructor(private http: HttpClient) {}

  // storefront: only active fabrics, optional fabric_type/search/sort/tag filters
  getAll(filters?: { type?: string; search?: string; sort?: string; tag?: string }): Observable<PoobooFabric[]> {
    let params = new HttpParams();
    if (filters?.type)   params = params.set('type', filters.type);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.sort)   params = params.set('sort', filters.sort);
    if (filters?.tag)    params = params.set('tag', filters.tag);
    return this.http.get<PoobooFabric[]>(this.base, { params });
  }

  getById(id: number): Observable<PoobooFabric> {
    return this.http.get<PoobooFabric>(`${this.base}/${id}`);
  }

  getTags(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/tags/list`);
  }

  private adminBase = '/api/admin/pooboo/fabrics';
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
