import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service'; // adjust path if auth.service.ts lives elsewhere

export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  const auth = inject(AuthService);

  // On the server, localStorage doesn't exist. Let SSR render the route
  // shell as-is — the real auth check happens below once we're in the
  // browser, which is when it matters anyway (SSR HTML alone can't leak
  // admin data since the actual API calls only happen client-side).
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Check the admin session specifically — not the raw legacy 'admin' key,
  // and not the default (URL-based) scope, since a guard runs on navigation
  // to /admin and we want it to always mean the admin session, unambiguously.
  if (auth.isLoggedIn('admin')) {
    return true;
  }

  router.navigate(['/login'], {
    queryParams: { redirect: state.url }
  });

  return false;
};