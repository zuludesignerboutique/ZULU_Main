import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PoobooProduct } from '../core/models/pooboo-product.model';

@Injectable({ providedIn: 'root' })
export class PoobooProductService {

  private base = '/api/pooboo/products';

  constructor(private http: HttpClient) {}

  getAll(filters?: { age_group?: string; gender?: string; category?: string; tag?: string }): Observable<PoobooProduct[]> {
    let params = new HttpParams();
    if (filters?.age_group) params = params.set('age_group', filters.age_group);
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
}
