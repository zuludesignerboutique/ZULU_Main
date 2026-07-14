import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PoobooFabric } from '../core/models/pooboo-fabric.model';

@Injectable({ providedIn: 'root' })
export class PoobooFabricService {

  private base = 'http://localhost:4000/api/pooboo/fabrics';

  constructor(private http: HttpClient) {}

  // storefront: only active fabrics, optional fabric_type filter
  getAll(filters?: { type?: string }): Observable<PoobooFabric[]> {
    let params = new HttpParams();
    if (filters?.type) params = params.set('type', filters.type);
    return this.http.get<PoobooFabric[]>(this.base, { params });
  }

  getById(id: number): Observable<PoobooFabric> {
    return this.http.get<PoobooFabric>(`${this.base}/${id}`);
  }
}