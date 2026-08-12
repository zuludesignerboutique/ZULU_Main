import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-orders.html',
  styleUrls: ['./admin-orders.scss']
})
export class AdminOrders implements OnInit, OnDestroy {

  orders: any[] = [];
  filteredOrders: any[] = [];
  isLoading = true;

  brandFilter = 'all';
  statusFilter = 'all';
  searchQuery = '';
  startDate = '';
  endDate = '';

  brands = ['all', 'zulu', 'pooboo'];
  statuses = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'cancellation_requested'];

  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  private highlightId: string | null = null;
  highlightedOrderId: number | null = null;

  // id currently being approved/rejected (disables its inline buttons)
  actingId: number | null = null;

  private api = '';
  private searchDebounce: any = null;

  constructor(
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private elRef: ElementRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['highlight']) {
        this.highlightId = params['highlight'];
      }
    });
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

          if (this.highlightId) {
            this.jumpToHighlighted();
          }
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

  private jumpToHighlighted() {
    const targetId = this.highlightId;
    if (!targetId) return;

    const index = this.filteredOrders.findIndex(o => String(o.id) === String(targetId));
    if (index === -1) {
      if (this.statusFilter !== 'all') {
        this.statusFilter = 'all';
        this.applyFilters();
      }
      const retryIndex = this.filteredOrders.findIndex(o => String(o.id) === String(targetId));
      if (retryIndex === -1) return;
      this.currentPage = Math.floor(retryIndex / this.pageSize) + 1;
    } else {
      this.currentPage = Math.floor(index / this.pageSize) + 1;
    }

    this.highlightedOrderId = Number(targetId);
    this.cdr.detectChanges();

    setTimeout(() => {
      const row = this.elRef.nativeElement.querySelector(`#order-row-${targetId}`);
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);

    // Keep the visual pulse only briefly — the Approve/Reject panel itself
    // stays as long as the order is still in cancellation_requested status
    setTimeout(() => {
      this.ngZone.run(() => {
        this.highlightedOrderId = null;
        this.cdr.detectChanges();
      });
    }, 4000);

    this.highlightId = null;
    this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
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

  // Debounced live search — fires ~400ms after the user stops typing,
  // instead of waiting for Enter
  onSearchInput() {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.currentPage = 1;   // a new search always restarts from the first page
      this.loadOrders();
    }, 400);
  }

  ngOnDestroy() {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
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

  // ── Cancellation approve/reject — now inline in the order row ──────────

  approveCancel(order: any) {
    const confirmed = window.confirm(
      `Approve cancellation for Order #${order.id}?\n\nThis will cancel the order. Refund of ₹${order.refund_amount} will need to be processed manually.`
    );
    if (!confirmed) return;

    this.actingId = order.id;
    this.http.patch<any>(`/api/admin/orders/${order.id}/approve-cancel`, {}).subscribe({
      next: () => {
        this.ngZone.run(() => {
          order.status = 'cancelled';
          this.actingId = null;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('AdminOrders: approve-cancel error', err);
        alert('Could not approve the cancellation. Please try again.');
        this.actingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  rejectCancel(order: any) {
    const confirmed = window.confirm(
      `Reject cancellation for Order #${order.id}?\n\nThe order will continue as normal — no refund will be issued.`
    );
    if (!confirmed) return;

    this.actingId = order.id;
    this.http.patch<any>(`/api/admin/orders/${order.id}/reject-cancel`, {}).subscribe({
      next: () => {
        this.ngZone.run(() => {
          // Adjust to whatever status your backend reverts to (e.g. previous status)
          order.status = order.previous_status || 'confirmed';
          this.actingId = null;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('AdminOrders: reject-cancel error', err);
        alert('Could not reject the cancellation. Please try again.');
        this.actingId = null;
        this.cdr.detectChanges();
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
      cancelled: 'status-cancelled',
      cancellation_requested: 'status-cancellation-requested'
    };
    return map[status] || '';
  }

  getStatusLabel(status: string): string {
    if (status === 'cancellation_requested') return 'Cancellation Requested';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
}