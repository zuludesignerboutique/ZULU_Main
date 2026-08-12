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
  filteredOrders: any[] = [];
  isLoading = true;

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
    const params: any = {};
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;
    if (this.searchQuery) params.search = this.searchQuery;

    this.http.get<any[]>(`${this.api}/api/orders`, { params }).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.orders = data;
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

    if (this.brandFilter !== 'all') {
      result = result.filter(o => o.items?.[0]?.brand === this.brandFilter);
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
    this.applyFilters();
  }

  onDateChange() {
    this.loadOrders();
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
    this.startDate = '';
    this.endDate = '';
    this.searchQuery = '';
    this.loadOrders();
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  get summary() {
    const confirmed = this.filteredOrders.filter(o => o.status !== 'cancelled');
    const totalRevenue = confirmed.reduce((s, o) => s + Number(o.total_amount), 0);
    const totalRefunds = this.filteredOrders.reduce((s, o) => s + Number(o.refund_amount || 0), 0);
    const totalPenalties = this.filteredOrders.reduce((s, o) => s + Number(o.penalty_amount || 0), 0);
    const netIncome = totalRevenue - totalRefunds + totalPenalties;
    const orderCount = this.filteredOrders.length;
    const cancelledCount = this.filteredOrders.filter(o => o.status === 'cancelled').length;
    return { totalRevenue, totalRefunds, totalPenalties, netIncome, orderCount, cancelledCount };
  }
}