// import { bootstrapApplication } from '@angular/platform-browser';
// import { appConfig } from './app/app.config';
// import { App } from './app/app';

// bootstrapApplication(App, appConfig)
//   .catch((err) => console.error(err));
// provideRouter(routes, withRouterConfig({
//   onSameUrlNavigation: 'reload'
// }))
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { provideRouter, withRouterConfig } from '@angular/router'; // ✅ ADD THIS
import { routes } from './app/app.routes'; // ✅ ADD THIS
import { appConfig } from './app/app.config';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(),

    // ✅ ROUTER CONFIG FIX
    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload'
      })
    )
  ]
});