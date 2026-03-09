import { Component, Input } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { Product } from '../../core/models/product.model';
import { AuthService } from '../../services/auth.service';

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
    private auth: AuthService,
    private router: Router
  ) {}

 addToCart(product: Product) {

  if (!this.auth.isLoggedIn()) {

    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });

    return;
  }

  // existing add-to-cart logic
}

  addToWishlist(product: Product) {

  if (!this.auth.isLoggedIn()) {

    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });

    return;
  }

  // wishlist logic
}
}