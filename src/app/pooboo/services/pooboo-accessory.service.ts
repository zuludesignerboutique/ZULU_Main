import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PoobooAccessory } from '../core/models/pooboo-accessory.model';

@Injectable({ providedIn: 'root' })
export class PoobooAccessoryService {

  private base = '/api/pooboo/accessories';

  constructor(private http: HttpClient) {}

  // storefront: only active accessories, optional accessory_type filter
  getAll(filters?: { type?: string }): Observable<PoobooAccessory[]> {
    let params = new HttpParams();
    if (filters?.type) params = params.set('type', filters.type);
    return this.http.get<PoobooAccessory[]>(this.base, { params });
  }

  getById(id: number): Observable<PoobooAccessory> {
    return this.http.get<PoobooAccessory>(`${this.base}/${id}`);
  }
}