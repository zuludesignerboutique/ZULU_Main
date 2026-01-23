import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  products = [
    {
      id: 1,
      name: 'ZORA Dress',
      price: 2499,
      image: 'assets/images/product1.jpg',
      description: 'Elegant boutique wear'
    }
  ];

  getProducts() {
    return this.products;
  }

  getProductById(id: number) {
    return this.products.find(p => p.id === id);
  }
}
