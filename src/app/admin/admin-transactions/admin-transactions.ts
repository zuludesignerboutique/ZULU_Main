import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
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
export class AdminTransactions implements OnInit {
  orders: any[] = [];
  filteredOrders: any[] = [];
  isLoading = true;

  brandFilter = 'all';
  startDate = '';
  endDate = '';

  brands = ['all', 'zulu', 'pooboo'];

  currentPage = 1;
  pageSize = 30;
  totalPages = 1;

  private api = '';

  constructor(private http: HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    const params: any = {};
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;

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

  clearFilters() {
    this.brandFilter = 'all';
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