import { Injectable } from '@angular/core';
import { Product } from '../core/models/product.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CartService {

  constructor(private auth: AuthService) {}

  // ✅ Unique key per user: "cart_user@email.com"
  private get KEY(): string {
    return `cart_${this.auth.getUserEmail()}`;
  }

  private load(): (Product & { qty: number })[] {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(cart: (Product & { qty: number })[]) {
    localStorage.setItem(this.KEY, JSON.stringify(cart));
  }

  add(product: Product) {
    const cart = this.load();
    const existing = cart.find(p => p.id === product.id);
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      cart.push({ ...product, qty: 1 });
    }
    this.save(cart);
  }
updateQty(id: number, qty: number) {
  const items = this.load();           // 👈 use load() not getAll()
  const item = items.find(i => i.id === id);
  if (item) {
    item.qty = qty;
    this.save(items);                  // 👈 use this.save() not localStorage.setItem('cart',...)
  }
}
  getAll(): (Product & { qty: number })[] {
    return this.load();
  }

  remove(id: number) {
    this.save(this.load().filter(p => p.id !== id));
  }

  clear() {
    localStorage.removeItem(this.KEY);
  }

  getCount(): number {
    return this.load().reduce((sum, p) => sum + (p.qty || 1), 0);
  }
}