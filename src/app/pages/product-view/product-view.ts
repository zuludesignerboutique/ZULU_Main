import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';
import { AuthService } from '../../services/auth.service';

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

  // ── Size & Quantity ──────────────────────────────
  selectedSize: string | null = null;
  sizeError: boolean = false;
  quantity: number = 1;

  // ── Detail accordion ─────────────────────────────
  openDetail: string | null = null;

  // ── Share ─────────────────────────────────────────
  shareMenuOpen: boolean = false;
  linkCopied: boolean = false;

  imageBase: string = 'http://localhost:4000/uploads/';

  private navStateProduct: any = null;
  private destroy$ = new Subject<void>();
  private popupTimer: any;
  private shareCloseTimer: any;

  private readonly CACHE_PREFIX = 'product_cache_';
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cartService: CartService,
    private wishlistService: WishlistService,
    private auth: AuthService,
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

  // ── Close share menu on outside click ────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.share-btn') && !target.closest('.share-menu')) {
      this.shareMenuOpen = false;
    }
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
          this.error = 'Failed to load product.';
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
    if (!this.product) return;

    // Must be logged in to add to cart — send to login, remember where to come back to
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { redirect: this.router.url }
      });
      return;
    }

    // Require a size selection only if this product actually has sizes
    const availableSizes = this.getAvailableSizes();
    if (availableSizes.length > 0 && !this.selectedSize) {
      this.sizeError = true;
      return;
    }

    // Add the product with the selected quantity and size
    const cart = this.cartService.getAll();
    const existing = cart.find(p => p.id === this.product.id && p.size === this.selectedSize);

    if (existing) {
      // Same product + same size already in cart — bump qty
      this.cartService.updateQty(this.product.id, (existing.qty || 1) + this.quantity, this.selectedSize ?? undefined);
    } else {
      // New item (or same product in a different size) — add with size
      this.cartService.add(this.product, this.selectedSize ?? undefined, this.quantity);
    }

    this.cartAdded = true;

    const allItems = this.cartService.getAll();
    this.cartCount = allItems.reduce((sum, p) => sum + (p.qty || 1), 0);
    this.cartTotal = allItems.reduce((sum, p) => sum + (p.price * (p.qty || 1)), 0);

    this.showCartPopup = true;

    setTimeout(() => (this.cartAdded = false), 2200);

    clearTimeout(this.popupTimer);
    this.popupTimer = setTimeout(() => (this.showCartPopup = false), 4000);
  }

  // ── Size ─────────────────────────────────────────

  getAvailableSizes(): string[] {
    // Array form from DB (e.g. sizes: ["S", "M", "L"])
    if (this.product?.sizes?.length) return this.product.sizes;

    // String form from DB (e.g. size: "S,M,L" or size: "M")
    if (this.product?.size) {
      const parts = (this.product.size as string)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      return parts;
    }

    // No size data — skip size gate entirely
    return [];
  }

  selectSize(size: string) {
    this.selectedSize = size;
    this.sizeError = false;
  }

  isSizeAvailable(size: string): boolean {
    return true;
  }

  toggleSizeChart() {
    // Implement size chart modal if needed
  }

  // ── Quantity ─────────────────────────────────────

  increaseQty() {
    this.quantity++;
  }

  decreaseQty() {
    if (this.quantity > 1) this.quantity--;
  }

  // ── Share ─────────────────────────────────────────

  toggleShareMenu() {
    this.shareMenuOpen = !this.shareMenuOpen;
    if (!this.shareMenuOpen) this.linkCopied = false;
  }

  shareVia(platform: string) {
    const url = isPlatformBrowser(this.platformId) ? window.location.href : '';
    const name = this.product?.name || 'this product';
    const text = `Check out ${name} — ${url}`;

    switch (platform) {
      case 'copy':
        if (isPlatformBrowser(this.platformId)) {
          navigator.clipboard.writeText(url).then(() => {
            this.linkCopied = true;
            clearTimeout(this.shareCloseTimer);
            this.shareCloseTimer = setTimeout(() => {
              this.linkCopied = false;
              this.shareMenuOpen = false;
            }, 1800);
          });
        }
        break;

      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        this.shareMenuOpen = false;
        break;

      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        this.shareMenuOpen = false;
        break;

      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
        this.shareMenuOpen = false;
        break;
    }
  }

  // ── WhatsApp Enquiry ─────────────────────────────

  getWhatsappLink(): string {
    const name = this.product?.name || 'this product';
    const price = this.product?.price ? `₹${this.product.price}` : '';
    const code = this.product?.product_code ? ` (${this.product.product_code})` : '';
    const size = this.selectedSize ? ` | Size: ${this.selectedSize}` : '';
    const msg = `Hi! I'm interested in ${name}${code} ${price}${size}. Please share more details.`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  // ── Colour helper ─────────────────────────────────
  getColourHex(colour: string): string {
    if (!colour) return '#ccc';
    const map: Record<string, string> = {
      red: '#e05c5c', blue: '#5c7ee0', green: '#5cae6f', yellow: '#e0c45c',
      pink: '#e07caa', purple: '#9b5ce0', orange: '#e0895c', white: '#f5f3f0',
      black: '#1a1814', grey: '#9a9080', gray: '#9a9080', navy: '#2c3e6b',
      maroon: '#7b2c2c', beige: '#d4c5a9', gold: '#c8a96e', silver: '#aaa',
      brown: '#7b5c3c', teal: '#3c8c8c', cream: '#f5ede0', ivory: '#f5f0e0',
      rose: '#d4a0b0', peach: '#e0b48c', lavender: '#b0a0d4', coral: '#e07868',
    };
    return map[colour.toLowerCase().trim()] || '#c8a96e';
  }

  // ── Detail accordion ─────────────────────────────

  toggleDetail(key: string) {
    this.openDetail = this.openDetail === key ? null : key;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    clearTimeout(this.popupTimer);
    clearTimeout(this.shareCloseTimer);
  }
}