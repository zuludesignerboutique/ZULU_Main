import { Component, OnInit } from '@angular/core';
import { CartService } from '../../services/cart.service';
import { Product } from '../../core/models/product.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss'],
  imports: [CommonModule],
  standalone: true
})
export class CartComponent implements OnInit {
  cartItems: Product[] = [];

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
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
}
