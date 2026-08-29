import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterModule } from '@angular/router';

@Component({
  selector: 'app-unsubscribe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './unsubscribe.html',
  styleUrl: './unsubscribe.scss'
})
export class Unsubscribe implements OnInit {
  token: string | null = null;
  email: string | null = null;
  loading = false;
  submitted = false;
  success = false;
  error = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.error = 'No unsubscribe token provided';
      return;
    }
    this.verifyToken();
  }

  verifyToken() {
    this.loading = true;
    this.http.get<{ email: string }>(`/api/newsletter/verify-token?token=${this.token}`).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.email = res.email;
          this.loading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          if (err.status === 404) {
            this.error = 'This unsubscribe link is invalid or has already been used.';
          } else {
            this.error = 'Unable to verify unsubscribe link. Please try again.';
          }
          this.cdr.detectChanges();
        });
      }
    });
  }

  confirmUnsubscribe() {
    if (!this.token) return;

    this.loading = true;
    this.http.post('/api/newsletter/unsubscribe', { token: this.token }).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.loading = false;
          this.submitted = true;
          this.success = true;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.loading = false;
          if (err.status === 404) {
            this.error = 'This unsubscribe link is invalid or has already been used.';
          } else {
            this.error = 'Failed to unsubscribe. Please try again.';
          }
          this.cdr.detectChanges();
        });
      }
    });
  }
}