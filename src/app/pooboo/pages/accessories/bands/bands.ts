import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PoobooHeader } from '../../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../../layout/pooboo-footer/pooboo-footer';
import { PoobooAccessoryService } from '../../../services/pooboo-accessory.service';
import { PoobooAccessory } from '../../../core/models/pooboo-accessory.model';
import { WishlistService } from '../../../../services/wishlist.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-bands',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './bands.html',
  styleUrl: './bands.scss'
})
export class Bands implements OnInit, OnDestroy {

  products: PoobooAccessory[] = [];
  isLoading = false;
  hasError = false;

  // ✅ Wishlist — this category's route segment, used for both the item
  // payload's `category` field and rebuilding the view link on the wishlist page
  private readonly categorySlug = 'bands';
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
  }

  ngOnDestroy(): void {
    this.wishlistSub?.unsubscribe();
    if (this.popTimeout) clearTimeout(this.popTimeout);
  }

  loadProducts(): void {
    this.isLoading = true;
    this.hasError = false;

    this.accessoryService.getAll({ type: this.categorySlug }).subscribe({
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