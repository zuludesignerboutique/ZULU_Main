import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [

  // ✅ Home — render on CLIENT side so it can fetch from localhost:4000
  { path: '',          renderMode: RenderMode.Client },
  { path: 'home',      renderMode: RenderMode.Client },

  // Products pages — client side (need live DB data)
  { path: 'products',  renderMode: RenderMode.Client },
  { path: 'product/:id', renderMode: RenderMode.Client },
  { path: 'cart',      renderMode: RenderMode.Client },
  { path: 'wishlist',  renderMode: RenderMode.Client },
  { path: 'checkout',  renderMode: RenderMode.Client },
  { path: 'order-history', renderMode: RenderMode.Client },
  { path: 'order-success', renderMode: RenderMode.Client },
  { path: 'categories',    renderMode: RenderMode.Client },
  { path: 'categories/:type', renderMode: RenderMode.Client },

  // Static pages — can be prerendered
  { path: 'login',     renderMode: RenderMode.Prerender },
  { path: 'signup',    renderMode: RenderMode.Prerender },
  { path: 'gallery',   renderMode: RenderMode.Prerender },
  { path: 'contact',   renderMode: RenderMode.Prerender },
  { path: 'about-zora',renderMode: RenderMode.Prerender },

  // Catch-all — client side
  { path: '**',        renderMode: RenderMode.Client },
];