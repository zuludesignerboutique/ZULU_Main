import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-product-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-view.html',
  styleUrl: './product-view.scss'
})
export class ProductView implements OnInit, OnDestroy {

  product: any;
  isLoading: boolean = true;
  isWishlisted: boolean = false;
  cartAdded: boolean = false;
  error: string | null = null;

  imageBase: string = 'http://localhost:4000/uploads/';

  // ✅ Captured in constructor while navigation is still active
  private navStateProduct: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // ✅ Must be read here — getCurrentNavigation() returns null after navigation completes
    this.navStateProduct =
      this.router.getCurrentNavigation()?.extras?.state?.['product'] ?? null;
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];

    // ✅ history.state is only read in browser (SSR safe)
    const historyStateProduct = isPlatformBrowser(this.platformId)
      ? (history.state?.product ?? null)
      : null;

    const stateProduct = this.navStateProduct ?? historyStateProduct;

    if (stateProduct && String(stateProduct.id) === String(id)) {
      this.product = stateProduct;
      this.isLoading = false;
      this.loadWishlistState();
      // Silently refresh in background to get latest stock/price
      this.fetchProductSilently(id);
      return;
    }

    // No state — fetch from API
    this.fetchProduct(id);
  }

  private fetchProduct(id: string | number) {
    this.isLoading = true;
    this.error = null;
    this.http.get<any[]>('http://localhost:4000/api/products')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const found = data.find(p => p.id == id);
          if (found) {
            this.product = found;
          } else {
            this.error = `Product with id "${id}" not found.`;
            console.error('Product not found for id:', id);
          }
          this.isLoading = false;
          this.loadWishlistState();
        },
        error: (err) => {
          console.error('API error:', err);
          this.error = 'Failed to load product. Is the backend running on port 4000?';
          this.isLoading = false;
        }
      });
  }

  private fetchProductSilently(id: string | number) {
    this.http.get<any[]>('http://localhost:4000/api/products')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const found = data.find(p => p.id == id);
          if (found) {
            this.product = found;
          }
        },
        error: () => {}
      });
  }

  private loadWishlistState() {
    if (!isPlatformBrowser(this.platformId) || !this.product) return;
    try {
      const wishlist: number[] = JSON.parse(localStorage.getItem('wishlist') || '[]');
      this.isWishlisted = wishlist.includes(this.product.id);
    } catch {
      this.isWishlisted = false;
    }
  }

  addToCart() {
    if (!this.product || (this.product.stock || 0) === 0) return;

    if (isPlatformBrowser(this.platformId)) {
      try {
        const cart: any[] = JSON.parse(localStorage.getItem('cart') || '[]');
        const existing = cart.find(c => c.id === this.product.id);
        if (existing) {
          existing.qty = (existing.qty || 1) + 1;
        } else {
          cart.push({ ...this.product, qty: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
      } catch (e) {
        console.error('Cart storage error:', e);
      }
    }

    this.cartAdded = true;
    setTimeout(() => (this.cartAdded = false), 2200);
  }

  toggleWishlist() {
    this.isWishlisted = !this.isWishlisted;

    if (!isPlatformBrowser(this.platformId) || !this.product) return;
    try {
      const wishlist: number[] = JSON.parse(localStorage.getItem('wishlist') || '[]');
      if (this.isWishlisted) {
        if (!wishlist.includes(this.product.id)) wishlist.push(this.product.id);
      } else {
        const idx = wishlist.indexOf(this.product.id);
        if (idx > -1) wishlist.splice(idx, 1);
      }
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    } catch (e) {
      console.error('Wishlist storage error:', e);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}