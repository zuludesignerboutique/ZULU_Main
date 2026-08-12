import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
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
export class ProductCardComponent implements OnInit, OnDestroy {
  @Input() product!: Product;

  // ✅ Products from DB use filename only; assets use full path
  private readonly imageBase = '/uploads/';

  wishlisted = false;
  justToggled = false; // briefly true right after a click, drives the pop animation
  private wishlistSub?: Subscription;
  private popTimeout?: any;

  // Known tag → colour mapping (see .tag-badge modifiers in the scss).
  // Anything not in this list falls back to a neutral style — new tag
  // values won't break the badge, they just won't get a custom colour
  // until added here.
  private readonly tagStyles: Record<string, string> = {
    popular:    'tag-popular',
    new:        'tag-new',
    bestseller: 'tag-bestseller',
    sale:       'tag-sale',
    limited:    'tag-limited',
  };

  get tag(): string {
    return ((this.product as any)?.tag || '').trim();
  }

  get tagClass(): string {
    const key = this.tag.toLowerCase();
    return this.tagStyles[key] || 'tag-default';
  }

  constructor(
    private cartService: CartService,
    private wishlistService: WishlistService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.wishlistService.ensureLoaded();
    }
    this.wishlistSub = this.wishlistService.items$.subscribe(() => {
      if (this.product) {
        this.wishlisted = this.wishlistService.isWishlisted('zulu_product', this.product.id);
      }
    });
  }

  ngOnDestroy() {
    this.wishlistSub?.unsubscribe();
    if (this.popTimeout) clearTimeout(this.popTimeout);
  }

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

  toggleWishlist(product: Product) {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirect: '/wishlist' } });
      return;
    }

    // Trigger the pop animation immediately (optimistic — feels instant even
    // while the request is in flight)
    this.justToggled = true;
    if (this.popTimeout) clearTimeout(this.popTimeout);
    this.popTimeout = setTimeout(() => { this.justToggled = false; }, 550);

    this.wishlistService.toggle({
      item_type: 'zulu_product',
      item_id: product.id,
      brand: 'zulu',
      product_name: product.name,
      product_code: (product as any).product_code || '',
      image_url: product.image_url,
      price: product.price
    }, (nowWishlisted) => {
      this.wishlisted = nowWishlisted;
    });
  }
}