import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';

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

  // ── Popup state ──────────────────────────────────
  showCartPopup: boolean = false;
  cartTotal: number = 0;
  cartCount: number = 0;

  imageBase: string = 'http://localhost:4000/uploads/';

  private navStateProduct: any = null;
  private destroy$ = new Subject<void>();
  private popupTimer: any;

  private readonly CACHE_PREFIX = 'product_cache_';
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cartService: CartService,
    private wishlistService: WishlistService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.navStateProduct =
      this.router.getCurrentNavigation()?.extras?.state?.['product'] ?? null;
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];

    const historyStateProduct = isPlatformBrowser(this.platformId)
      ? (history.state?.product ?? null)
      : null;

    const stateProduct = this.navStateProduct ?? historyStateProduct;

    if (stateProduct && String(stateProduct.id) === String(id)) {
      this.product = stateProduct;
      this.isLoading = false;
      this.saveProductToCache(stateProduct);
      this.loadWishlistState();
      this.fetchProductSilently(id);
      return;
    }

    const cached = this.getProductFromCache(id);
    if (cached) {
      this.product = cached;
      this.isLoading = false;
      this.loadWishlistState();
      this.fetchProductSilently(id);
      return;
    }

    this.fetchProduct(id);
  }

  // ── Cache ────────────────────────────────────────

  private saveProductToCache(product: any) {
    if (!isPlatformBrowser(this.platformId) || !product?.id) return;
    try {
      localStorage.setItem(
        this.CACHE_PREFIX + product.id,
        JSON.stringify({ data: product, savedAt: Date.now() })
      );
    } catch {}
  }

  private getProductFromCache(id: string | number): any | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(this.CACHE_PREFIX + id);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (Date.now() - entry.savedAt > this.CACHE_TTL) {
        localStorage.removeItem(this.CACHE_PREFIX + id);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  // ── API ──────────────────────────────────────────

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
            this.saveProductToCache(found);
          } else {
            this.error = `Product with id "${id}" not found.`;
          }
          this.isLoading = false;
          this.loadWishlistState();
        },
        error: () => {
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
            this.saveProductToCache(found);
          }
        },
        error: () => {}
      });
  }

  // ── Wishlist ─────────────────────────────────────

  private loadWishlistState() {
    if (!this.product) return;
    this.isWishlisted = this.wishlistService.isWishlisted(this.product.id);
  }

  toggleWishlist() {
    if (!this.product) return;
    this.isWishlisted = this.wishlistService.toggle(this.product);
  }

  // ── Cart + Popup ─────────────────────────────────

  addToCart() {
    if (!this.product || (this.product.stock || 0) === 0) return;

    this.cartService.add(this.product);
    this.cartAdded = true;

    // Compute totals for popup
    const allItems = this.cartService.getAll();
    this.cartCount = allItems.reduce((sum, p) => sum + (p.qty || 1), 0);
    this.cartTotal = allItems.reduce((sum, p) => sum + (p.price * (p.qty || 1)), 0);

    // Show popup
    this.showCartPopup = true;

    // Reset button label after 2.2s
    setTimeout(() => (this.cartAdded = false), 2200);

    // Auto-close popup after 4s
    clearTimeout(this.popupTimer);
    this.popupTimer = setTimeout(() => (this.showCartPopup = false), 4000);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.popupTimer);
  }
}