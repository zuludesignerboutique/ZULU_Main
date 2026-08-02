import { Component, OnInit, NgZone, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {

  brandFilter = 'all';
  brands = ['all', 'zulu', 'pooboo'];

  totalProducts = 0;
  totalUsers = 0;
  totalOrders = 0;
  totalRevenue = 0;
  recentOrders: any[] = [];
  lowStockCount = 0;

  private api = '';

  constructor(private http: HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // Build query params for brand filter
    const params: any = {};

    this.http.get<any[]>(`${this.api}/api/orders`, { params }).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          let orders = data;
          if (this.brandFilter !== 'all') {
            orders = orders.filter((o: any) => o.items?.[0]?.brand === this.brandFilter);
          }
          this.totalOrders = orders.length;
          this.totalRevenue = orders
            .filter((o: any) => o.status !== 'cancelled')
            .reduce((s: number, o: any) => s + Number(o.total_amount), 0);
          this.recentOrders = orders.slice(0, 10);
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('Dashboard: Failed to load orders', err)
    });

    this.http.get<any[]>(`${this.api}/api/users`).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.totalUsers = data.length;
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('Dashboard: Failed to load users', err)
    });

    this.http.get<any[]>(`${this.api}/api/products/all`).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          let products = data;
          if (this.brandFilter !== 'all') {
            products = products.filter((p: any) => p.brand === this.brandFilter);
          }
          this.totalProducts = products.length;
          this.lowStockCount = products.filter((p: any) => {
            const stock = p.product_type === 'fabric' ? (p.balance_stock ?? 0) : (p.stock ?? 0);
            return stock <= 5;
          }).length;
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('Dashboard: Failed to load products', err)
    });
  }

  // ✅ Users Wishlist — lazy: only fetched when the quick action is clicked,
  // not on every dashboard load / brand switch
  showWishlistPanel = false;
  wishlistItems: any[] = [];
  isLoadingWishlist = false;

  @ViewChild('wishlistPanel') wishlistPanelRef?: ElementRef<HTMLElement>;

  toggleWishlistPanel() {
    this.showWishlistPanel = !this.showWishlistPanel;
    if (this.showWishlistPanel) {
      this.loadWishlist();
      // Wait a tick for *ngIf to render the panel, then scroll it into view
      setTimeout(() => {
        this.wishlistPanelRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }

  loadWishlist() {
    this.isLoadingWishlist = true;
    this.http.get<any[]>(`${this.api}/api/admin/wishlist`).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          let items = data;
          if (this.brandFilter !== 'all') {
            items = items.filter((w: any) => w.brand === this.brandFilter);
          }
          this.wishlistItems = items;
          this.isLoadingWishlist = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Dashboard: Failed to load wishlist data', err);
        this.ngZone.run(() => {
          this.isLoadingWishlist = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  setBrandFilter(b: string) {
    this.brandFilter = b;
    this.loadData();
    if (this.showWishlistPanel) this.loadWishlist();
  }

  getStatusClass(status: string): string {
    const map: any = {
      pending: 'status-pending', confirmed: 'status-confirmed',
      shipped: 'status-shipped', delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return map[status] || '';
  }

  parseItems(items: any): any[] {
    if (!items) return [];
    if (typeof items === 'string') { try { return JSON.parse(items); } catch { return []; } }
    return Array.isArray(items) ? items : [];
  }
}