// src/app/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../core/models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = '/api/products';  // ✅ Proxy routes this to port 4000

  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    // The `products` table is unified across brands (brand/product_type
    // columns). Without a brand filter, the backend returns everything —
    // Pooboo apparel/fabrics/accessories included. Scope this to ZULU.
    return this.http.get<Product[]>(this.apiUrl, {
      params: { brand: 'zulu' }
    });
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }
}