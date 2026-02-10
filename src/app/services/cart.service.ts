import { Injectable } from '@angular/core';
import { Product } from '../core/models/product.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private cart: Product[] = [];

  add(product: Product) {
    this.cart.push(product);
  }

  getAll() {
    return this.cart;
  }

  remove(id: number) {
    this.cart = this.cart.filter(p => p.id !== id);
  }

  clear() {
    this.cart = [];
  }
}
