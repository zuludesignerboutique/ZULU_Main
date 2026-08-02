import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.html',
  styleUrls: ['./admin-layout.scss']
})
export class AdminLayoutComponent implements OnInit, OnDestroy {

  // ── Cancellation notification bell ─────────────────────
  cancellationRequests: any[] = [];
  notifOpen = false;
  actingId: number | null = null; // id currently being approved/rejected (disables its buttons)
  private pollHandle: any = null;

  constructor(
    private router: Router,
    private auth: AuthService,
    private http: HttpClient,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadCancellationRequests();
    // Poll every 30s so the badge stays current even if the admin never opens the panel
    this.pollHandle = setInterval(() => this.loadCancellationRequests(), 30000);
  }

  ngOnDestroy() {
    if (this.pollHandle) clearInterval(this.pollHandle);
  }

  loadCancellationRequests() {
    this.http.get<any[]>('/api/admin/cancellation-requests').subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.cancellationRequests = Array.isArray(data) ? data : [];
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('AdminLayout: Failed to load cancellation requests', err)
    });
  }

  toggleNotif() {
    this.notifOpen = !this.notifOpen;
    if (this.notifOpen) this.loadCancellationRequests();
  }

  closeNotif() {
    this.notifOpen = false;
  }

  // ✅ Clicking a notification's info area (not its Approve/Reject buttons) jumps
  // to the admin orders page and highlights that exact row
  goToOrder(order: any) {
    this.closeNotif();
    this.router.navigate(['/admin/orders'], { queryParams: { highlight: order.id } });
  }

  approveCancel(order: any) {
    const confirmed = window.confirm(
      `Approve cancellation for Order #${order.id}?\n\nThis will cancel the order. Refund of ₹${order.refund_amount} will need to be processed manually.`
    );
    if (!confirmed) return;

    this.actingId = order.id;
    this.http.patch<any>(`/api/admin/orders/${order.id}/approve-cancel`, {}).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.cancellationRequests = this.cancellationRequests.filter(o => o.id !== order.id);
          this.actingId = null;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('AdminLayout: approve-cancel error', err);
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
          this.cancellationRequests = this.cancellationRequests.filter(o => o.id !== order.id);
          this.actingId = null;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('AdminLayout: reject-cancel error', err);
        alert('Could not reject the cancellation. Please try again.');
        this.actingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  logout() {
    this.auth.logout('admin');
    this.router.navigate(['/login']);
  }
}