import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { PoobooHeader } from '../../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../../layout/pooboo-footer/pooboo-footer';
import { PoobooAccessoryService } from '../../../services/pooboo-accessory.service';
import { PoobooAccessory } from '../../../core/models/pooboo-accessory.model';
import { WishlistService } from '../../../../services/wishlist.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-hair-clips',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PoobooHeader, PoobooFooter],
  templateUrl: './hair-clips.html',
  styleUrl: './hair-clips.scss'
})
export class HairClips implements OnInit, OnDestroy {

  products: PoobooAccessory[] = [];
  isLoading = false;
  hasError = false;

  // 🔍 Search & Sort
  searchTerm = '';
  sortBy     = '';   // '' | 'price_asc' | 'price_desc' | 'newest'
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // ✅ Wishlist — this category's route segment, used for both the item
  // payload's `category` field and rebuilding the view link on the wishlist page
  private readonly categorySlug = 'hair-clips';
  justToggledId: number | null = null;
  private wishlistSub?: Subscription;
  private popTimeout: any;

  constructor(
    private accessoryService: PoobooAccessoryService,
    private wishlistService: WishlistService,
    private auth: AuthService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();

    if (this.auth.isLoggedIn()) {
      this.wishlistService.ensureLoaded();
    }
    this.wishlistSub = this.wishlistService.items$.subscribe(() => {
      this.ngZone.run(() => this.cdr.detectChanges());
    });

    // 🔍 Debounce search input (~300ms) before re-querying the backend
    this.searchSub = this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
      this.loadProducts();
    });
  }

  ngOnDestroy(): void {
    this.wishlistSub?.unsubscribe();
    this.searchSub?.unsubscribe();
    if (this.popTimeout) clearTimeout(this.popTimeout);
  }

  // 🔍 Called on (input) — pushes into the debounced subject
  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onSortChange(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.hasError = false;

    const filters: { type?: string; search?: string; sort?: string } = { type: this.categorySlug };
    if (this.searchTerm.trim()) filters.search = this.searchTerm.trim();
    if (this.sortBy)            filters.sort = this.sortBy;

    this.accessoryService.getAll(filters).subscribe({
      next: (data: PoobooAccessory[]) => {
        this.ngZone.run(() => {
          this.products = data;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.hasError = true;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  isOutOfStock(product: PoobooAccessory): boolean {
    return product.stock === 0;
  }

  getImageUrl(path: string | null): string {
    if (!path) return 'assets/images/placeholder.jpg';
    if (path.startsWith('http')) return path;
    return `/uploads/${path}`;
  }

  // ── Wishlist ─────────────────────────────────────

  isWishlisted(id: number): boolean {
    return this.wishlistService.isWishlisted('pooboo_accessory', id);
  }

  toggleWishlist(event: Event, product: any): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
      return;
    }

    this.justToggledId = product.id;
    if (this.popTimeout) clearTimeout(this.popTimeout);
    this.popTimeout = setTimeout(() => { this.justToggledId = null; }, 550);

    this.wishlistService.toggle({
      item_type: 'pooboo_accessory',
      item_id: product.id,
      brand: 'pooboo',
      category: this.categorySlug,
      product_name: product.name,
      product_code: product.product_code || '',
      image_url: product.image_url,
      price: product.price
    });
  }
}