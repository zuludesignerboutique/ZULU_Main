import { Component, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {

  menuOpen = false;
  mobileNavOpen = false;

  constructor(public auth: AuthService, private router: Router) {}

  isLoggedIn() {
    return this.auth.isLoggedIn();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  toggleMobileNav() {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  // Close dropdown / mobile nav when clicking anywhere outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-wrap')) {
      this.menuOpen = false;
    }
    if (!target.closest('.mobile-nav-wrap') && !target.closest('.hamburger-btn')) {
      this.mobileNavOpen = false;
    }
  }

  logout() {
    this.menuOpen = false;
    this.mobileNavOpen = false;
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}