import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.scss']
})
export class CartComponent {
  cart: Product[] = [];

  constructor(private cartService: CartService) {
    this.cart = this.cartService.getAll();
  }

  remove(id: number) {
    this.cartService.remove(id);
    this.cart = this.cartService.getAll();
  }
}
