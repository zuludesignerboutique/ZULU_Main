import { Injectable } from '@angular/core';
import { Product, CartItem } from '../core/models/product.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CartService {

  private readonly CHECKOUT_KEY = 'checkout_items';

  constructor(private auth: AuthService) {}

  private get KEY(): string {
    return `cart_${this.auth.getUserEmail()}`;
  }

  private load(): CartItem[] {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(cart: CartItem[]) {
    localStorage.setItem(this.KEY, JSON.stringify(cart));
  }

  add(product: Product, size?: string, initialQty: number = 1) {
    const cart = this.load();
    const existing = cart.find(p => p.id === product.id && p.size === size);
    if (existing) {
      existing.qty = (existing.qty || 1) + initialQty;
    } else {
      cart.push({
        ...product,
        qty: initialQty,
        size,
        brand: product.brand || 'zulu',
        product_type: product.product_type || 'apparel',
        product_code: product.product_code || ''
      });
    }
    this.save(cart);
  }

  updateQty(id: number, qty: number, size?: string) {
    const items = this.load();
    const item = size !== undefined
      ? items.find(i => i.id === id && i.size === size)
      : items.find(i => i.id === id);
    if (item) {
      item.qty = qty;
      this.save(items);
    }
  }

  getAll(): CartItem[] {
    return this.load();
  }

  remove(id: number, size?: string) {
    const items = this.load();
    const filtered = size !== undefined
      ? items.filter(p => !(p.id === id && p.size === size))
      : items.filter(p => p.id !== id);
    this.save(filtered);
  }

  clear() {
    localStorage.removeItem(this.KEY);
  }

  getCount(): number {
    return this.load().reduce((sum, p) => sum + (p.qty || 1), 0);
  }

  setCheckoutItems(items: CartItem[]) {
    sessionStorage.setItem(this.CHECKOUT_KEY, JSON.stringify(items));
  }

  getCheckoutItems(): CartItem[] {
    try {
      return JSON.parse(sessionStorage.getItem(this.CHECKOUT_KEY) || '[]');
    } catch {
      return [];
    }
  }

  clearCheckoutItems() {
    sessionStorage.removeItem(this.CHECKOUT_KEY);
  }

  removeItems(items: { id: number; size?: string }[]) {
    const keys = new Set(items.map(i => `${i.id}_${i.size ?? ''}`));
    const remaining = this.load().filter(p => !keys.has(`${p.id}_${p.size ?? ''}`));
    this.save(remaining);
  }
}