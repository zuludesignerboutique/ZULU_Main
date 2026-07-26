import { Injectable } from '@angular/core';
import { Product } from '../core/models/product.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CartService {

  private readonly CHECKOUT_KEY = 'checkout_items';

  constructor(private auth: AuthService) {}

  // ✅ Unique key per user: "cart_user@email.com"
  private get KEY(): string {
    return `cart_${this.auth.getUserEmail()}`;
  }

  private load(): (Product & { qty: number; size?: string })[] {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(cart: (Product & { qty: number; size?: string })[]) {
    localStorage.setItem(this.KEY, JSON.stringify(cart));
  }

  // ✅ size and initialQty are now optional params
  add(product: Product, size?: string, initialQty: number = 1) {
    const cart = this.load();
    // Match on both id AND size so the same product in different sizes = separate rows
    const existing = cart.find(p => p.id === product.id && p.size === size);
    if (existing) {
      existing.qty = (existing.qty || 1) + initialQty;
    } else {
      cart.push({ ...product, qty: initialQty, size });
    }
    this.save(cart);
  }

  // ✅ size param lets us update the right row when same product has multiple sizes
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

  getAll(): (Product & { qty: number; size?: string })[] {
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

  // ✅ Cart page calls this with only the checked items right before navigating to /checkout
  setCheckoutItems(items: (Product & { qty: number; size?: string })[]) {
    sessionStorage.setItem(this.CHECKOUT_KEY, JSON.stringify(items));
  }

  // ✅ Checkout page should read from here instead of getAll(), so it only charges for what was checked
  getCheckoutItems(): (Product & { qty: number; size?: string })[] {
    try {
      return JSON.parse(sessionStorage.getItem(this.CHECKOUT_KEY) || '[]');
    } catch {
      return [];
    }
  }

  clearCheckoutItems() {
    sessionStorage.removeItem(this.CHECKOUT_KEY);
  }

  // ✅ Removes only the given rows (id+size) — used after a successful order,
  // so items the user left unchecked stay in the cart instead of being wiped by clear()
  removeItems(items: { id: number; size?: string }[]) {
    const keys = new Set(items.map(i => `${i.id}_${i.size ?? ''}`));
    const remaining = this.load().filter(p => !keys.has(`${p.id}_${p.size ?? ''}`));
    this.save(remaining);
  }
}