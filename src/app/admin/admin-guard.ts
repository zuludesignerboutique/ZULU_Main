import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  // On the server, localStorage doesn't exist. Let SSR render the route
  // shell as-is — the real auth check happens below once we're in the
  // browser, which is when it matters anyway (SSR HTML alone can't leak
  // admin data since the actual API calls only happen client-side).
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const isAdmin = localStorage.getItem('admin');

  if (isAdmin) {
    return true;
  }

  router.navigate(['/login'], {
    queryParams: { redirect: state.url }
  });

  return false;
};