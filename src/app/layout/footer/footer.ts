import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterModule, CommonModule, FormsModule],
  standalone: true,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  // ═════════════════════════════════════════════
  // NEWSLETTER STATE
  // ═════════════════════════════════════════════

  newsletterEmail = '';
  newsletterName = '';
  isSubscribing   = false;
  subscribed      = false;
  subscribeError  = '';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private auth: AuthService) {}

  // ═════════════════════════════════════════════
  // SUBSCRIBE
  // ═════════════════════════════════════════════

  subscribe(): void {
    const email = this.newsletterEmail.trim();
    const name = this.newsletterName.trim();
    if (!email || !email.includes('@')) return;

    this.isSubscribing  = true;
    this.subscribed     = false;
    this.subscribeError = '';

    // If user logged in, pass token for association
    const token = this.auth.getToken('customer');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    this.http.post<{ message: string }>('/api/newsletter/subscribe', { email, name }, { headers }).subscribe({
      next: () => {
        this.isSubscribing  = false;
        this.subscribed     = true;
        this.newsletterEmail = '';
        this.newsletterName = '';
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSubscribing  = false;
        if (err.error?.error?.includes('already')) {
          this.subscribeError = 'You\'re already subscribed!';
        } else {
          this.subscribeError = 'Something went wrong. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}