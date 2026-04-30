import { Injectable } from '@angular/core';
import { Product } from '../core/models/product.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class WishlistService {

  constructor(private auth: AuthService) {}

  // ✅ Unique key per user: "wishlist_user@email.com"
  private get KEY(): string {
    return `wishlist_${this.auth.getUserEmail()}`;
  }

  private load(): Product[] {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(wishlist: Product[]) {
    localStorage.setItem(this.KEY, JSON.stringify(wishlist));
  }

  add(product: Product) {
    const wishlist = this.load();
    if (!wishlist.find(p => p.id === product.id)) {
      wishlist.push(product);
      this.save(wishlist);
    }
  }

  getAll(): Product[] {
    return this.load();
  }

  remove(id: number) {
    this.save(this.load().filter(p => p.id !== id));
  }

  isWishlisted(id: number): boolean {
    return this.load().some(p => p.id === id);
  }

  toggle(product: Product): boolean {
    if (this.isWishlisted(product.id)) {
      this.remove(product.id);
      return false;
    } else {
      this.add(product);
      return true;
    }
  }
}