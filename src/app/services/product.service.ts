import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Product } from '../core/models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private apiUrl = 'http://localhost:4000/api/products';

  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {

  return this.http.get<Product[]>(this.apiUrl).pipe(

    map(products =>
      products.map(p => ({
        ...p,
        image: p.image_url
          ? 'http://localhost:4000/uploads/' + p.image_url
          : 'assets/images/default.jpg'
      }))
    )

  );

}

}