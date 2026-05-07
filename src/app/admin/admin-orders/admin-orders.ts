import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-orders.html',
  styleUrls: ['./admin-orders.scss']
})
export class AdminOrders implements OnInit {

  orders: any[] = [];
  isLoading = true;
  activeFilter = 'all';
  filters = ['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

  private api = 'http://localhost:4000';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    this.isLoading = true;
    this.http.get<any[]>(`${this.api}/api/orders`).subscribe({
      next: (data) => {
        this.orders = data;
        this.isLoading = false;
        this.cdr.detectChanges(); // force render immediately on data arrival
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get filteredOrders(): any[] {
    if (this.activeFilter === 'all') return this.orders;
    return this.orders.filter(o => o.status === this.activeFilter);
  }

  setFilter(f: string) {
    this.activeFilter = f;
    this.cdr.detectChanges();
  }

  getCount(filter: string): number {
    if (filter === 'all') return this.orders.length;
    return this.orders.filter(o => o.status === filter).length;
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
        this.cdr.detectChanges();
      },
      error: () => {
        alert('Failed to update order status');
        (event.target as HTMLSelectElement).value = order.status;
      }
    });
  }
}