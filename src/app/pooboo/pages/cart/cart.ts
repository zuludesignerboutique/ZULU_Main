import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoobooCart, PoobooCartItem } from '../../services/pooboo-cart';

@Component({
  selector: 'app-pooboo-cart',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart {
  items: PoobooCartItem[] = [];

  constructor(private poobooCart: PoobooCart) {
    this.items = this.poobooCart.getAll();
  }

  get total(): number {
    return this.items.reduce((sum, i) => sum + (i.product.price || 0) * i.qty, 0);
  }

  remove(productId: number, size?: string) {
    this.poobooCart.remove(productId, size);
    this.items = this.poobooCart.getAll();
  }

  updateQty(productId: number, qty: number, size?: string) {
    this.poobooCart.updateQty(productId, qty, size);
    this.items = this.poobooCart.getAll();
  }
}
