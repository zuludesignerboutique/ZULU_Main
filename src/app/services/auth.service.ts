import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type AuthScope = 'admin' | 'customer';

// Any route under this prefix is treated as the admin panel.
// Everything else (Zulu storefront, Pooboo storefront, etc.) is 'customer'.
// Update this if your admin routes don't all live under /admin.
const ADMIN_PATH_PREFIX = '/admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);

  // Separate signals so admin and customer login state never overwrite each other.
  adminLoggedInSignal = signal<boolean>(false);
  customerLoggedInSignal = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.adminLoggedInSignal.set(localStorage.getItem(this.key('admin', 'loggedIn')) === 'true');
      this.customerLoggedInSignal.set(localStorage.getItem(this.key('customer', 'loggedIn')) === 'true');
    }
  }

  /**
   * Which session applies to whatever page is currently loaded.
   * Used as the default so existing call sites (login(), logout(), isLoggedIn(), getToken())
   * don't need to change — they'll just naturally operate on the right session
   * because they're called from within an admin page or a customer page.
   */
  private currentScope(): AuthScope {
    if (!isPlatformBrowser(this.platformId)) return 'customer';
    return window.location.pathname.startsWith(ADMIN_PATH_PREFIX) ? 'admin' : 'customer';
  }

  private key(scope: AuthScope, name: string): string {
    return `${scope}_${name}`;
  }

  private signalFor(scope: AuthScope) {
    return scope === 'admin' ? this.adminLoggedInSignal : this.customerLoggedInSignal;
  }

  login(email?: string, token?: string, scope: AuthScope = this.currentScope()) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.key(scope, 'loggedIn'), 'true');
      if (email) localStorage.setItem(this.key(scope, 'userEmail'), email);
      if (token) localStorage.setItem(this.key(scope, 'authToken'), token);
    }
    this.signalFor(scope).set(true);
  }

  logout(scope: AuthScope = this.currentScope()) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.key(scope, 'loggedIn'));
      localStorage.removeItem(this.key(scope, 'userEmail'));
      localStorage.removeItem(this.key(scope, 'authToken'));
      if (scope === 'admin') {
        localStorage.removeItem('admin'); // legacy key cleanup, in case anything still sets it directly
      }
    }
    this.signalFor(scope).set(false);
  }

  isLoggedIn(scope: AuthScope = this.currentScope()): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return localStorage.getItem(this.key(scope, 'loggedIn')) === 'true';
  }

  getUserEmail(scope: AuthScope = this.currentScope()): string {
    if (!isPlatformBrowser(this.platformId)) return 'guest';
    return localStorage.getItem(this.key(scope, 'userEmail')) || 'guest';
  }

  getToken(scope: AuthScope = this.currentScope()): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(this.key(scope, 'authToken'));
  }
}