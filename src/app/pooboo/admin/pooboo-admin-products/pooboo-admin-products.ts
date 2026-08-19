import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-pooboo-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pooboo-admin-products.html',
  styleUrl: './pooboo-admin-products.scss'
})
export class PoobooAdminProducts implements OnInit {

  products: any[] = [];
  loading = true;
  error = '';

  // ── Search ────────────────────────────────────────────
  searchQuery = '';

  get filteredProducts(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.products;
    return this.products.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.product_code || '').toLowerCase().includes(q)
    );
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private cd: ChangeDetectorRef,
    private ngZone: NgZone,
    private toast: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.http.get<any[]>('/api/pooboo/products/all').subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.products = data;
          this.loading = false;
          this.cd.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.error = 'Failed to load products';
          this.loading = false;
          this.cd.detectChanges();
        });
      }
    });
  }

  editProduct(id: number) {
    this.router.navigate(['/admin/pooboo/edit-product', id]);
  }

  async deleteProduct(id: number, name: string) {
    const confirmed = await this.toast.confirm({
      title: 'Delete product?',
      message: `Delete "${name}"? This cannot be undone.`,
      confirmLabel: 'Delete'
    });
    if (!confirmed) return;
    this.http.delete(`/api/pooboo/products/${id}`).subscribe({
      next: () => this.loadProducts(),
      error: () => this.toast.error('Failed to delete product')
    });
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `/uploads/${img}`;
  }
}