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

  // ✅ normalize brand so 'zulu' items (which historically had no brand) still match correctly
  private normBrand(brand?: string): string {
    return brand || 'zulu';
  }

  add(product: Product, size?: string, initialQty: number = 1) {
    const cart = this.load();
    const brand = this.normBrand((product as any).brand);
    // ✅ id + size is NOT enough — ZULU and Pooboo tables both auto-increment their own ids,
    // so a Pooboo fabric #5 and a ZULU product #5 must be treated as different cart rows
    const existing = cart.find(
      p => p.id === product.id && p.size === size && this.normBrand(p.brand) === brand
    );
    if (existing) {
      existing.qty = (existing.qty || 1) + initialQty;
    } else {
      cart.push({
        ...product,
        qty: initialQty,
        size,
        brand,
        product_type: product.product_type || 'apparel',
        product_code: product.product_code || ''
      });
    }
    this.save(cart);
  }

  updateQty(id: number, qty: number, size?: string, brand?: string) {
    const items = this.load();
    const b = this.normBrand(brand);
    const item = items.find(
      i => i.id === id && i.size === size && this.normBrand(i.brand) === b
    );
    if (item) {
      item.qty = qty;
      this.save(items);
    }
  }

  getAll(): CartItem[] {
    return this.load();
  }

  remove(id: number, size?: string, brand?: string) {
    const items = this.load();
    const b = this.normBrand(brand);
    const filtered = items.filter(
      p => !(p.id === id && p.size === size && this.normBrand(p.brand) === b)
    );
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

  removeItems(items: { id: number; size?: string; brand?: string }[]) {
    const keys = new Set(items.map(i => `${i.id}_${this.normBrand(i.brand)}_${i.size ?? ''}`));
    const remaining = this.load().filter(
      p => !keys.has(`${p.id}_${this.normBrand(p.brand)}_${p.size ?? ''}`)
    );
    this.save(remaining);
  }
}