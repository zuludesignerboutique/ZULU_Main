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

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cartItems = this.cartService.getAll();
  }

  get total(): number {
    return this.cartItems.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
  }

  updateQty(id: number, change: number) {
    const item = this.cartItems.find(i => i.id === id);
    if (!item) return;
    const newQty = (item.qty || 1) + change;
    if (newQty < 1) return;           // prevent going below 1
    this.cartService.updateQty(id, newQty);
    this.cartItems = this.cartService.getAll();
  }

  removeFromCart(id: number) {
    this.cartService.remove(id);
    this.cartItems = this.cartService.getAll();
  }

  clearCart() {
    this.cartService.clear();
    this.cartItems = [];
  }

  goToCheckout() {
    this.router.navigate(['/checkout']);
  }
}