import { Component, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-pooboo-header',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './pooboo-header.html',
  styleUrl: './pooboo-header.scss'
})
export class PoobooHeader {

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
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}