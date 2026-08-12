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
}
