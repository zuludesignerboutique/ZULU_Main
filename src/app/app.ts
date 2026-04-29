import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {

  showLayout = true;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {

    // this.auth.logout(); // keep your existing logic

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {

        const url = event.urlAfterRedirects;

        // ❌ hide header/footer for admin routes
        if (url.startsWith('/admin')) {
          this.showLayout = false;
        } 
        // ❌ also hide for landing page if needed
        else if (url === '/') {
          this.showLayout = false;
        } 
        else {
          this.showLayout = true;
        }

      });
  }
}