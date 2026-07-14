import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pooboo-admin-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pooboo-admin-products.html',
  styleUrl: './pooboo-admin-products.scss'
})
export class PoobooAdminProducts implements OnInit {

  products: any[] = [];
  loading = true;
  error = '';
  private api = 'http://localhost:4000';

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.http.get<any[]>(`${this.api}/api/pooboo/products/all`).subscribe({
      next: (data) => { this.products = data; this.loading = false; },
      error: () => { this.error = 'Failed to load products'; this.loading = false; }
    });
  }

  editProduct(id: number) {
    this.router.navigate(['/admin/pooboo/edit-product', id]);
  }

  deleteProduct(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    this.http.delete(`${this.api}/api/pooboo/products/${id}`).subscribe({
      next: () => this.loadProducts(),
      error: () => alert('Failed to delete product')
    });
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }
}