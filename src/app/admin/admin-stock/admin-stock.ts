import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-stock.html',
  styleUrls: ['./admin-stock.scss']
})
export class AdminStock implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];
  isLoading = true;

  brandFilter = 'all';
  typeFilter = 'all';
  lowStockOnly = false;
  searchQuery = '';

  brands = ['all', 'zulu', 'pooboo'];
  types = ['all', 'apparel', 'fabric', 'accessory'];

  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  private api = '';

  constructor(private http: HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading = true;
    this.http.get<any[]>(`${this.api}/api/products/all`).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.products = data;
          this.applyFilters();
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  applyFilters() {
    let result = [...this.products];

    if (this.brandFilter !== 'all') {
      result = result.filter(p => p.brand === this.brandFilter);
    }
    if (this.typeFilter !== 'all') {
      result = result.filter(p => p.product_type === this.typeFilter);
    }
    if (this.lowStockOnly) {
      result = result.filter(p => {
        const balance = this.getBalance(p);
        return balance <= 5;
      });
    }

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.product_code || '').toLowerCase().includes(q)
      );
    }

    this.filteredProducts = result;
    this.totalPages = Math.ceil(this.filteredProducts.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  get pagedProducts(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  setBrandFilter(b: string) {
    this.brandFilter = b;
    this.currentPage = 1;
    this.applyFilters();
  }

  setTypeFilter(t: string) {
    this.typeFilter = t;
    this.currentPage = 1;
    this.applyFilters();
  }

  toggleLowStock() {
    this.lowStockOnly = !this.lowStockOnly;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearSearch() {
    this.searchQuery = '';
    this.onSearchChange();
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  // Balance = remaining sellable stock (decreases on sales). Every product type
  // carries the balance in the balance_stock column of the unified products table.
  getBalance(p: any): number {
    return p.balance_stock ?? 0;
  }

  // Total = quantity entered for the product (never auto-changed by sales).
  // Fabrics track total in total_meters; everything else uses stock.
  getTotal(p: any): number {
    return p.product_type === 'fabric' ? (p.total_meters ?? p.balance_stock ?? 0) : (p.stock ?? 0);
  }

  getStockClass(p: any): string {
    const balance = this.getBalance(p);
    if (balance <= 0) return 'stock-out';
    if (balance <= 5) return 'stock-low';
    if (balance <= 20) return 'stock-medium';
    return 'stock-high';
  }

  get summary() {
    const total = this.filteredProducts.length;
    const inStock = this.filteredProducts.filter(p => this.getBalance(p) > 0).length;
    const lowStock = this.filteredProducts.filter(p => {
      const s = this.getBalance(p);
      return s > 0 && s <= 5;
    }).length;
    const outOfStock = this.filteredProducts.filter(p => this.getBalance(p) <= 0).length;
    return { total, inStock, lowStock, outOfStock };
  }
}