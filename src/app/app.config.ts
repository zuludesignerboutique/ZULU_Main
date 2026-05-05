import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { APP_INITIALIZER } from '@angular/core';
import { Router, NavigationEnd, Scroll } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { filter } from 'rxjs/operators';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),  // no withScrollPositionRestoration
    provideHttpClient(withFetch()),
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        includePostRequests: false
      })
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: (router: Router, scroller: ViewportScroller) => () => {
        router.events.pipe(
          filter(e => e instanceof NavigationEnd)
        ).subscribe(() => scroller.scrollToPosition([0, 0]));
      },
      deps: [Router, ViewportScroller],
      multi: true
    }
  ]
};