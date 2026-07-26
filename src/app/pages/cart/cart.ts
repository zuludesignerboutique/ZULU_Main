import { Component, OnInit } from '@angular/core';
import { CartService } from '../../services/cart.service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss'],
  imports: [CommonModule, RouterLink],
  standalone: true
})
export class CartComponent implements OnInit {
  cartItems: any[] = [];

  // ✅ tracks which rows are checked, keyed by id+size
  selectedKeys = new Set<string>();

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cartItems = this.cartService.getAll();
    // ✅ everything starts checked, like Amazon's cart
    this.cartItems.forEach(item => this.selectedKeys.add(this.itemKey(item)));
  }

  // ✅ same product in different sizes = different rows, so key on both
  itemKey(item: any): string {
    return `${item.id}_${item.size ?? ''}`;
  }

  isSelected(item: any): boolean {
    return this.selectedKeys.has(this.itemKey(item));
  }

  toggleItem(item: any, checked: boolean) {
    const key = this.itemKey(item);
    if (checked) {
      this.selectedKeys.add(key);
    } else {
      this.selectedKeys.delete(key);
    }
  }

  get allSelected(): boolean {
    return this.cartItems.length > 0 && this.cartItems.every(item => this.isSelected(item));
  }

  toggleAll(checked: boolean) {
    if (checked) {
      this.cartItems.forEach(item => this.selectedKeys.add(this.itemKey(item)));
    } else {
      this.selectedKeys.clear();
    }
  }

  get selectedItems(): any[] {
    return this.cartItems.filter(item => this.isSelected(item));
  }

  get selectedCount(): number {
    return this.selectedItems.length;
  }

  // ✅ total now reflects only the checked items, not the whole cart
  get total(): number {
    return this.selectedItems.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
  }

  updateQty(id: number, change: number, size?: string) {
    const item = this.cartItems.find(i => i.id === id && i.size === size);
    if (!item) return;
    const newQty = (item.qty || 1) + change;
    if (newQty < 1) return;
    this.cartService.updateQty(id, newQty, size);
    this.cartItems = this.cartService.getAll();
  }

  removeFromCart(id: number, size?: string) {
    const key = `${id}_${size ?? ''}`;
    this.cartService.remove(id, size);
    this.cartItems = this.cartService.getAll();
    this.selectedKeys.delete(key);
  }

  clearCart() {
    this.cartService.clear();
    this.cartItems = [];
    this.selectedKeys.clear();
  }

  // ✅ only the checked items get handed off to checkout
  goToCheckout() {
    if (this.selectedItems.length === 0) return;
    this.cartService.setCheckoutItems(this.selectedItems);
    this.router.navigate(['/checkout']);
  }
}