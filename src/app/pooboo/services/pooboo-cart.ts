import { Injectable } from '@angular/core';

export interface PoobooCartItem {
  product: any;
  qty: number;
  size?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PoobooCart {
  private storageKey = 'pooboo_cart';
  private items: PoobooCartItem[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      this.items = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch {
      this.items = [];
    }
  }

  private save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
  }

  add(product: any, size?: string, qty: number = 1) {
    const existing = this.items.find(i => i.product.id === product.id && i.size === size);
    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({ product, qty, size });
    }
    this.save();
  }

  updateQty(id: number, qty: number, size?: string) {
    const item = this.items.find(i => i.product.id === id && i.size === size);
    if (item) {
      item.qty = qty;
      this.save();
    }
  }

  remove(id: number, size?: string) {
    this.items = this.items.filter(i => !(i.product.id === id && i.size === size));
    this.save();
  }

  getAll(): PoobooCartItem[] {
    return this.items;
  }

  clear() {
    this.items = [];
    localStorage.removeItem(this.storageKey);
  }

  getCount(): number {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  }
}
