import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PoobooAccessory } from '../core/models/pooboo-accessory.model';

@Injectable({ providedIn: 'root' })
export class PoobooAccessoryService {

  private base = '/api/pooboo/accessories';

  constructor(private http: HttpClient) {}

  // storefront: only active accessories, optional accessory_type/search/sort/tag filters
  getAll(filters?: { type?: string; search?: string; sort?: string; tag?: string }): Observable<PoobooAccessory[]> {
    let params = new HttpParams();
    if (filters?.type)   params = params.set('type', filters.type);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.sort)   params = params.set('sort', filters.sort);
    if (filters?.tag)    params = params.set('tag', filters.tag);
    return this.http.get<PoobooAccessory[]>(this.base, { params });
  }

  getById(id: number): Observable<PoobooAccessory> {
    return this.http.get<PoobooAccessory>(`${this.base}/${id}`);
  }

  // optional ?type= narrows the tag list to one accessory subtype (baby-ornaments/bands/hair-clips)
  getTags(type?: string): Observable<string[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<string[]>(`${this.base}/tags/list`, { params });
  }
}
