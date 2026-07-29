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

  // ✅ Products from DB use filename only; assets use full path
  private readonly imageBase = '/uploads/';

  constructor(
    private cartService: CartService,
    private wishlistService: WishlistService,
    private auth: AuthService,
    private router: Router
  ) {}

  // ✅ Smart image resolver — handles both DB filenames and asset paths
  getImageUrl(imageUrl: string): string {
    if (!imageUrl) return 'assets/images/placeholder.jpg';
    // If it's already a full URL or asset path, use as-is
    if (imageUrl.startsWith('http') || imageUrl.startsWith('assets/')) {
      return imageUrl;
    }
    // Otherwise it's a DB filename — prepend the backend URL
    return this.imageBase + imageUrl;
  }

  // ✅ Navigate to product detail page with state (instant load)
  goToProduct(product: Product) {
    this.router.navigate(['/product', product.id], {
      state: { product }
    });
  }

  addToCart(product: Product) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/cart' } });
      return;
    }
    this.cartService.add(product);
  }

  addToWishlist(product: Product) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/wishlist' } });
      return;
    }
    this.wishlistService.toggle(product);
  }
}