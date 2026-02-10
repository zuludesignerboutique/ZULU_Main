import { Injectable } from '@angular/core';
import { Product } from '../core/models/product.model';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private wishlist: Product[] = [];

  add(product: Product) {
    this.wishlist.push(product);
  }

  getAll() {
    return this.wishlist;
  }

  remove(id: number) {
    this.wishlist = this.wishlist.filter(p => p.id !== id);
  }
}
