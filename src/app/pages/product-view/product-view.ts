import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-product-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-view.html',
  styleUrl: './product-view.scss'
})
export class ProductView implements OnInit, OnDestroy {

  // ══════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════

  product: any = null;
  isWishlisted = false;

  readonly imageBase = 'http://localhost:4000/uploads/';

  private destroy$ = new Subject<void>();

  // ══════════════════════════════════════════════
  // CONSTRUCTOR
  // ══════════════════════════════════════════════

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  // ══════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════

  ngOnInit(): void {
    // Instant paint from router state (avoids blank screen on navigation)
    const nav = this.router.getCurrentNavigation();
    const stateProduct = nav?.extras?.state?.['product'];
    if (stateProduct) {
      this.product = stateProduct;
    }

    // Always fetch fresh data in the background
    const id = this.route.snapshot.params['id'];
    this.fetchProduct(id);

    // Restore wishlist state
    this.isWishlisted = this.getWishlistState(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ══════════════════════════════════════════════
  // DATA
  // ══════════════════════════════════════════════

  private fetchProduct(id: string): void {
    this.http
      .get(`http://localhost:4000/api/products/${id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.product = data; },
        error: (err)  => { console.error('Failed to load product:', err); }
      });
  }

  // ══════════════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════════════

  addToCart(): void {
    if (!this.product || this.product.stock === 0) return;
    // TODO: dispatch to CartService
    console.log('Added to cart:', this.product);
  }

  toggleWishlist(): void {
    if (!this.product) return;

    this.isWishlisted = !this.isWishlisted;

    const id = this.route.snapshot.params['id'];
    this.setWishlistState(id, this.isWishlisted);
  }

  // ══════════════════════════════════════════════
  // WISHLIST PERSISTENCE (localStorage)
  // ══════════════════════════════════════════════

  private getWishlistState(id: string): boolean {
    try {
      const saved = JSON.parse(localStorage.getItem('wishlist') ?? '[]') as string[];
      return saved.includes(id);
    } catch {
      return false;
    }
  }

  private setWishlistState(id: string, value: boolean): void {
    try {
      const saved = JSON.parse(localStorage.getItem('wishlist') ?? '[]') as string[];
      const updated = value
        ? [...new Set([...saved, id])]
        : saved.filter(x => x !== id);
      localStorage.setItem('wishlist', JSON.stringify(updated));
    } catch {
      // Storage unavailable — fail silently
    }
  }
}