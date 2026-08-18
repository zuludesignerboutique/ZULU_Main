import { Component, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { AuthService } from './services/auth.service';
import { inject } from '@vercel/analytics';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnDestroy {

  showLayout = true;
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private auth: AuthService,
    private router: Router
  ) {

    if (isPlatformBrowser(this.platformId)) {
      inject();
    }

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {

        const url = event.urlAfterRedirects;

        if (isPlatformBrowser(this.platformId)) {
          window.gtag('config', 'G-69PXLMZ9XL', { page_path: url });
        }

        if (url.startsWith('/admin') || url === '/' || url.startsWith('/pooboo')) {
          this.showLayout = false;
        } else {
          this.showLayout = true;
        }

      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}