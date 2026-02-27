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
      this.loggedInSignal.set(false); // 🔒 force false on server
    }
  }

  login() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('loggedIn', 'true');
    }
    this.loggedInSignal.set(true);
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('loggedIn');
    }
    this.loggedInSignal.set(false);
  }

  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return localStorage.getItem('loggedIn') === 'true';
  }
}