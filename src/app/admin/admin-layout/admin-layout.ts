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

  cancellationRequests: any[] = [];
  notifOpen = false;
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

  // Clicking a notification jumps to admin orders and highlights that row,
  // where Approve/Reject now live inline.
  goToOrder(order: any) {
    this.closeNotif();
    this.router.navigate(['/admin/orders'], { queryParams: { highlight: order.id } });
  }

  logout() {
    this.auth.logout('admin');
    this.router.navigate(['/login']);
  }
}