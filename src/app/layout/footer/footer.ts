import { Component, ChangeDetectorRef } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, RouterModule, CommonModule, FormsModule],
  standalone: true,
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {

  // ══════════════════════════════════════════════
  // NEWSLETTER STATE
  // ══════════════════════════════════════════════

  newsletterEmail = '';
  isSubscribing   = false;
  subscribed      = false;
  subscribeError  = '';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  // ══════════════════════════════════════════════
  // SUBSCRIBE
  // ══════════════════════════════════════════════

  subscribe(): void {
    const email = this.newsletterEmail.trim();
    if (!email || !email.includes('@')) return;

    this.isSubscribing  = true;
    this.subscribed     = false;
    this.subscribeError = '';

    this.http.post<{ message: string }>('/api/newsletter/subscribe', { email }).subscribe({
      next: () => {
        this.isSubscribing  = false;
        this.subscribed     = true;
        this.newsletterEmail = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.isSubscribing  = false;
        this.subscribeError = 'Something went wrong. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }
}