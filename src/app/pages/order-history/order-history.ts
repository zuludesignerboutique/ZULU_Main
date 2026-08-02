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
  imageBase = '/uploads/';

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
      `/api/orders/user/${encodeURIComponent(email)}`
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

  // ✅ Card heading — product name(s) instead of "Order #4".
  // Single item: just the product name. Multiple items: first product name + "+N more".
  getOrderTitle(order: any): string {
    const items = this.parseItems(order.items);
    if (!items.length) return `Order #${order.id}`;

    const label = (item: any) => item.product_name || item.product_code || 'Product';
    const first = label(items[0]);

    return items.length > 1 ? `${first} +${items.length - 1} more` : first;
  }

  isStepDone(currentStatus: string, stepKey: string): boolean {
    const order = ['pending', 'confirmed', 'shipped', 'delivered'];
    return order.indexOf(stepKey) <= order.indexOf(currentStatus);
  }

  // ✅ Cancel only allowed up through "confirmed" — once shipped/delivered/cancelled/
  // cancellation_requested, no button shows
  isCancellable(status: string): boolean {
    return status === 'pending' || status === 'confirmed';
  }

  // ✅ Friendly label for the status badge / banners — everything else falls back
  // to the titlecase pipe in the template
  getStatusLabel(status: string): string {
    if (status === 'cancellation_requested') return 'Cancellation Requested';
    return status.charAt(0).toUpperCase() + status.slice(1);
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

    // ✅ This now sends a cancellation REQUEST — it goes to the admin for approval,
    // it doesn't cancel the order outright.
    const message = penaltyPercent === 0
      ? `Request cancellation for Order #${order.id}?\n\nOnce approved by our team, you'll receive a full refund of ₹${refundAmount}.`
      : `Request cancellation for Order #${order.id}?\n\nThis order has already been confirmed, so a 25% cancellation fee (₹${penaltyAmount}) will apply once approved. You'd be refunded ₹${refundAmount} of ₹${order.total_amount}.`;

    // ✅ Popup confirmation before requesting
    const confirmed = window.confirm(message);
    if (!confirmed) return;

    this.cancellingId = order.id;

    // ✅ Dedicated customer-facing cancel-request route — server re-checks eligibility
    // and computes the authoritative refund/penalty split (server owns the money math).
    // The order moves to 'cancellation_requested' and waits for admin approval.
    this.http.patch<any>(`/api/orders/${order.id}/cancel`, {}).subscribe({
      next: (res) => {
        order.status = 'cancellation_requested';
        order.refund_amount = res.refundAmount;
        order.penalty_amount = res.penaltyAmount;
        this.cancellingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[OrderHistory] cancel error:', err.status, err.error);
        alert('Could not request cancellation. Please try again.');
        this.cancellingId = null;
        this.cdr.detectChanges();
      }
    });
  }
}