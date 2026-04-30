import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  loggedInSignal = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('loggedIn');
      this.loggedInSignal.set(stored === 'true');
    } else {
      this.loggedInSignal.set(false);
    }
  }

  // ── Login ────────────────────────────────────────
  login(email?: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('loggedIn', 'true');
      // ✅ Store the email so cart/wishlist can be namespaced per user
      if (email) {
        localStorage.setItem('userEmail', email);
      }
    }
    this.loggedInSignal.set(true);
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('userEmail');
    }
    this.loggedInSignal.set(false);
  }

  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return localStorage.getItem('loggedIn') === 'true';
  }

  // ✅ Returns current user's email — used as namespace key
  getUserEmail(): string {
    if (!isPlatformBrowser(this.platformId)) return 'guest';
    return localStorage.getItem('userEmail') || 'guest';
  }
}