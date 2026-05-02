import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-history.html',
  styleUrls: ['./order-history.scss']
})
export class OrderHistoryComponent implements OnInit {

  orders: any[] = [];
  isLoading = true;
  errorMsg = '';
  imageBase = 'http://localhost:4000/uploads/';

  statusSteps = [
    { key: 'pending',   label: 'Placed'    },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'shipped',   label: 'Shipped'   },
    { key: 'delivered', label: 'Delivered' },
  ];

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  ngOnInit() {
    // auth.service.ts stores email under 'userEmail' key via getUserEmail()
    const email = this.auth.getUserEmail();

    if (!email || email === 'guest') {
      this.errorMsg = 'Please log in to view your orders.';
      this.isLoading = false;
      return;
    }

    this.http.get<any[]>(`http://localhost:4000/api/orders/user/${encodeURIComponent(email)}`)
      .subscribe({
        next: (data) => {
          this.orders = data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('[OrderHistory] API error:', err);
          this.errorMsg = 'Could not load orders. Please try again later.';
          this.isLoading = false;
        }
      });
  }

  parseItems(items: any): any[] {
    if (!items) return [];
    if (typeof items === 'string') {
      try { return JSON.parse(items); } catch { return []; }
    }
    return Array.isArray(items) ? items : [];
  }

  isStepDone(currentStatus: string, stepKey: string): boolean {
    const order = ['pending', 'confirmed', 'shipped', 'delivered'];
    const currentIdx = order.indexOf(currentStatus);
    const stepIdx    = order.indexOf(stepKey);
    return stepIdx <= currentIdx;
  }
}