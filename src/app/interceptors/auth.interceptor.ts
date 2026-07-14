import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Endpoints that are public (no auth needed) — don't attach a token to these.
// Keeps SSR/hydration transfer-cache behavior consistent between server and client requests.
const PUBLIC_ENDPOINTS = [
  '/api/categories',
  '/api/subcategories'
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // Skip attaching auth ONLY for GET requests to public endpoints (reading the list).
  // POST/PUT/DELETE to these same URLs (adding/editing categories, subcategories) still need the token.
  const isPublicGet = req.method === 'GET' && PUBLIC_ENDPOINTS.some(path => req.url.includes(path));
  if (isPublicGet) {
    return next(req);
  }

  // Skip token access entirely on the server (SSR has no localStorage)
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const token = localStorage.getItem('authToken');

  // No token stored (not logged in) — send request as-is
  if (!token) {
    return next(req);
  }

  // Attach Authorization header to every other outgoing request
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq);
};