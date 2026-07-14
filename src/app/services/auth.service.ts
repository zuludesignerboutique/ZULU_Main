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

  login(email?: string, token?: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('loggedIn', 'true');
      if (email) {
        localStorage.setItem('userEmail', email);
      }
      if (token) {
        localStorage.setItem('authToken', token);
      }
    }
    this.loggedInSignal.set(true);
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('authToken');
      localStorage.removeItem('admin');
    }
    this.loggedInSignal.set(false);
  }

  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return localStorage.getItem('loggedIn') === 'true';
  }

  getUserEmail(): string {
    if (!isPlatformBrowser(this.platformId)) return 'guest';
    return localStorage.getItem('userEmail') || 'guest';
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('authToken');
  }
}