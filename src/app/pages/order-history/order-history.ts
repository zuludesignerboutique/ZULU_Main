import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
  isLoading = true;  // TRUE from start — shows spinner immediately, no flicker
  errorMsg = '';
  imageBase = 'http://localhost:4000/uploads/';

  // ✅ id of the order currently being cancelled (disables its button / shows spinner text)
  cancellingId: number | null = null;

  statusSteps = [
    { key: 'pending',   label: 'Placed'    },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'shipped',   label: 'Shipped'   },
    { key: 'delivered', label: 'Delivered' },
  ];

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // SSR guard — localhost:4000 is unreachable server-side
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      return;
    }

    const email = this.auth.getUserEmail();
    console.log('[OrderHistory] email:', email);

    if (!email || email === 'guest') {
      this.errorMsg = 'Please log in to view your orders.';
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.http.get<any[]>(
      `http://localhost:4000/api/orders/user/${encodeURIComponent(email)}`
    ).subscribe({
      next: (data) => {
        console.log('[OrderHistory] data:', data);
        this.orders = Array.isArray(data) ? data : [];
        this.isLoading = false;
        this.cdr.detectChanges(); // force Angular to re-render after HTTP response
      },
      error: (err) => {
        console.error('[OrderHistory] error:', err.status, err.error);
        this.errorMsg = 'Could not load orders. Please try again.';
        this.isLoading = false;
        this.cdr.detectChanges();
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
    return order.indexOf(stepKey) <= order.indexOf(currentStatus);
  }

  // ✅ Cancel only allowed up through "confirmed" — once shipped/delivered/cancelled, no button shows
  isCancellable(status: string): boolean {
    return status === 'pending' || status === 'confirmed';
  }

  // ✅ No penalty while still "pending"; 25% penalty once the order has moved to "confirmed"
  getCancelPenaltyPercent(status: string): number {
    return status === 'confirmed' ? 25 : 0;
  }

  cancelOrder(order: any) {
    const penaltyPercent = this.getCancelPenaltyPercent(order.status);
    const refundPercent = 100 - penaltyPercent;
    const refundAmount = Math.round(order.total_amount * refundPercent / 100);
    const penaltyAmount = order.total_amount - refundAmount;

    const message = penaltyPercent === 0
      ? `Cancel Order #${order.id}?\n\nYou'll receive a full refund of ₹${refundAmount}.`
      : `Cancel Order #${order.id}?\n\nThis order has already been confirmed, so a 25% cancellation fee (₹${penaltyAmount}) applies. You'll be refunded ₹${refundAmount} of ₹${order.total_amount}.`;

    // ✅ Popup confirmation before cancelling
    const confirmed = window.confirm(message);
    if (!confirmed) return;

    this.cancellingId = order.id;

    // ✅ Dedicated customer-facing cancel route — server re-checks eligibility and
    // computes the authoritative refund/penalty split (server owns the money math).
    this.http.patch<any>(`http://localhost:4000/api/orders/${order.id}/cancel`, {}).subscribe({
      next: (res) => {
        order.status = 'cancelled';
        order.refund_amount = res.refundAmount;
        order.penalty_amount = res.penaltyAmount;
        this.cancellingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[OrderHistory] cancel error:', err.status, err.error);
        alert('Could not cancel the order. Please try again.');
        this.cancellingId = null;
        this.cdr.detectChanges();
      }
    });
  }
}