import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.html',
  styleUrls: ['./admin-orders.scss']
})
export class AdminOrders implements OnInit {

  orders: any[] = [];
  filteredOrders: any[] = [];
  isLoading = true;

  brandFilter = 'all';
  statusFilter = 'all';
  searchQuery = '';
  startDate = '';
  endDate = '';

  brands = ['all', 'zulu', 'pooboo'];
  statuses = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  private api = '';

  constructor(private http: HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    const params: any = {};
    if (this.brandFilter !== 'all') params.brand = this.brandFilter;
    if (this.statusFilter !== 'all') params.status = this.statusFilter;
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;

    this.http.get<any[]>(`${this.api}/api/orders`, { params }).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.orders = data;
          this.currentPage = 1;
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
    let result = [...this.orders];

    if (this.statusFilter !== 'all') {
      result = result.filter(o => o.status === this.statusFilter);
    }

    this.filteredOrders = result;
    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  get pagedOrders(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  setBrandFilter(b: string) {
    this.brandFilter = b;
    this.loadOrders();
  }

  setStatusFilter(s: string) {
    this.statusFilter = s;
    this.applyFilters();
  }

  onSearch() {
    this.loadOrders();
  }

  clearFilters() {
    this.brandFilter = 'all';
    this.statusFilter = 'all';
    this.searchQuery = '';
    this.startDate = '';
    this.endDate = '';
    this.loadOrders();
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  parseItems(items: any): any[] {
    if (!items) return [];
    if (typeof items === 'string') {
      try { return JSON.parse(items); } catch { return []; }
    }
    return Array.isArray(items) ? items : [];
  }

  updateStatus(order: any, event: Event) {
    const status = (event.target as HTMLSelectElement).value;
    this.http.patch(`${this.api}/api/orders/${order.id}/status`, { status }).subscribe({
      next: () => {
        order.status = status;
      },
      error: () => {
        alert('Failed to update order status');
        (event.target as HTMLSelectElement).value = order.status;
      }
    });
  }

  get summary() {
    const total = this.filteredOrders.length;
    const totalRevenue = this.filteredOrders.reduce((s, o) => s + Number(o.total_amount), 0);
    const cancelled = this.filteredOrders.filter(o => o.status === 'cancelled').length;
    const pending = this.filteredOrders.filter(o => o.status === 'pending').length;
    const shipped = this.filteredOrders.filter(o => o.status === 'shipped' || o.status === 'delivered').length;
    return { total, totalRevenue, cancelled, pending, shipped };
  }

  getStatusClass(status: string): string {
    const map: any = {
      pending: 'status-pending',
      confirmed: 'status-confirmed',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return map[status] || '';
  }
}