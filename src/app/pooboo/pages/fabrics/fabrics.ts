import {
  Component, OnInit, OnDestroy,
  Inject, PLATFORM_ID, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
import { PoobooFabricService } from '../../services/pooboo-fabric.service';
import { PoobooFabric } from '../../core/models/pooboo-fabric.model';
import { WishlistService } from '../../../services/wishlist.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-fabrics',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './fabrics.html',
  styleUrl: './fabrics.scss'
})
export class Fabrics implements OnInit, OnDestroy {

  products: PoobooFabric[] = [];
  isLoading = false;
  selectedType = 'all';

  fabricTypes = [
    { label: 'Cotton',     value: 'cotton',     emoji: '🌿' },
    { label: 'Silk',       value: 'silk',        emoji: '✨' },
    { label: 'Linen',      value: 'linen',       emoji: '🍃' },
    { label: 'Georgette',  value: 'georgette',   emoji: '🌸' },
    { label: 'Net',        value: 'net',         emoji: '🕸️' },
    { label: 'Velvet',     value: 'velvet',      emoji: '💜' },
    { label: 'Satin',     value: 'satin',       emoji: '💫' },
  ];

  // ✅ Wishlist
  justToggledId: number | null = null;
  private wishlistSub?: Subscription;
  private popTimeout: any;

  constructor(
    private fabricService: PoobooFabricService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private wishlistService: WishlistService,
    private auth: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadProducts();

    if (this.auth.isLoggedIn()) {
      this.wishlistService.ensureLoaded();
    }
    this.wishlistSub = this.wishlistService.items$.subscribe(() => this.cdr.detectChanges());
  }

  ngOnDestroy() {
    this.wishlistSub?.unsubscribe();
    if (this.popTimeout) clearTimeout(this.popTimeout);
  }

  selectType(value: string) {
    this.selectedType = value;
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading = true;

    const filters = this.selectedType !== 'all'
      ? { type: this.selectedType }
      : undefined;

    this.fabricService.getAll(filters).subscribe({
      next: (data: PoobooFabric[]) => {
        this.products = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getTypeLabel(): string {
    return this.fabricTypes.find(t => t.value === this.selectedType)?.label ?? '';
  }

  getTypeLabelFor(value: string): string {
    return this.fabricTypes.find(t => t.value === value)?.label ?? '';
  }

  getImageUrl(path: string | null): string {
    if (!path) return 'assets/images/placeholder.jpg';
    if (path.startsWith('http')) return path;
    return `/uploads/${path}`;
  }

  // ── Wishlist ─────────────────────────────────────

  isWishlisted(id: number): boolean {
    return this.wishlistService.isWishlisted('pooboo_fabric', id);
  }

  toggleWishlist(event: Event, product: any) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { redirect: this.router.url } });
      return;
    }

    this.justToggledId = product.id;
    if (this.popTimeout) clearTimeout(this.popTimeout);
    this.popTimeout = setTimeout(() => { this.justToggledId = null; }, 550);

    // Fabrics are priced per meter — that's the figure worth snapshotting
    this.wishlistService.toggle({
      item_type: 'pooboo_fabric',
      item_id: product.id,
      brand: 'pooboo',
      product_name: product.name,
      product_code: product.product_code || '',
      image_url: product.image_url,
      price: product.price_per_meter
    });
  }
}