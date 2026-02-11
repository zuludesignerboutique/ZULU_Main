import { Component, Input } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-product-card',
   imports: [CommonModule, RouterModule],
  standalone: true,
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.scss'],
})
export class ProductCardComponent {
  @Input() product!: Product;

  constructor(
    private cartService: CartService,
    private wishlistService: WishlistService,
    private router: Router
  ) {}

  addToCart(event: Event) {
    event.stopPropagation(); // 🔥 stops routerLink click
    this.cartService.add(this.product);
    this.router.navigate(['/cart']); // optional redirect
  }

  addToWishlist(event: Event) {
    event.stopPropagation(); // 🔥 stops routerLink click
    this.wishlistService.add(this.product);
    this.router.navigate(['/wishlist']); // optional redirect
  }
}
