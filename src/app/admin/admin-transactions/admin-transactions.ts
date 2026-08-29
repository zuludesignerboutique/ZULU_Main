import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-transactions.html',
  styleUrls: ['./admin-transactions.scss']
})
export class AdminTransactions implements OnInit, OnDestroy {
  orders: any[] = [];
  isLoading = true;
  errorMessage = '';

  brandFilter = 'all';
  startDate = '';
  endDate = '';
  searchQuery = '';

  brands = ['all', 'zulu', 'pooboo'];

  currentPage = 1;
  pageSize = 30;
  totalPages = 1;

  private api = '';
  private searchDebounce: any = null;

  constructor(private http: HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    this.errorMessage = '';
    const params: any = {
      page: this.currentPage,
      limit: this.pageSize
    };
    // Only send `brand` when actually filtering by a specific brand — omitting
    // the key entirely for 'all' (rather than setting it to `undefined`) avoids
    // Angular serializing it as the literal string "brand=undefined", which the
    // backend was treating as a real brand filter and matching zero orders.
    if (this.brandFilter !== 'all') params.brand = this.brandFilter;
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;
    if (this.searchQuery) params.search = this.searchQuery;

    this.http.get<any>(`${this.api}/api/orders`, { params }).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.orders = res.orders || [];
          this.totalPages = res.totalPages || 1;
          this.currentPage = res.page || 1;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.errorMessage = err?.error?.error || err?.message || 'Failed to load transactions';
          this.cdr.detectChanges();
        });
      }
    });
  }

  onDateChange() {
    this.currentPage = 1;
    this.loadOrders();
  }

  onSearch() {
    this.currentPage = 1;
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
    this.startDate = '';
    this.endDate = '';
    this.searchQuery = '';
    this.currentPage = 1;
    this.loadOrders();
  }

  setBrandFilter(b: string) {
    this.brandFilter = b;
    this.currentPage = 1;
    this.loadOrders();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadOrders();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadOrders();
    }
  }

  toNum(v: any): number {
    return Number(v ?? 0);
  }

  calcNet(o: any): number {
    return this.toNum(o.total_amount) - this.toNum(o.refund_amount) + this.toNum(o.penalty_amount);
  }

  get summary() {
    const confirmed = this.orders.filter(o => o.status !== 'cancelled');
    const totalRevenue = confirmed.reduce((s, o) => s + this.toNum(o.total_amount), 0);
    const totalRefunds = this.orders.reduce((s, o) => s + this.toNum(o.refund_amount), 0);
    const totalPenalties = this.orders.reduce((s, o) => s + this.toNum(o.penalty_amount), 0);
    const netIncome = totalRevenue - totalRefunds + totalPenalties;
    const orderCount = this.orders.length;
    const cancelledCount = this.orders.filter(o => o.status === 'cancelled').length;
    return { totalRevenue, totalRefunds, totalPenalties, netIncome, orderCount, cancelledCount };
  }
}