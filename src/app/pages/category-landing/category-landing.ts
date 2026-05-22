import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-category-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-landing.html',
  styleUrl: './category-landing.scss'
})
export class CategoryLandingComponent {

  constructor(private router: Router) {}

  navigateTo(site: string): void {
    const normalized = site.toLowerCase();

    if (normalized === 'pooboo') {
      this.router.navigate(['/pooboo']);
      return;
    }

    if (normalized === 'aurum') {
      // Aurum is not yet launched — no-op or show a toast instead of alert
      // alert('Aurum is coming soon!');
      return;
    }

    // Default → Zulu / home
    this.router.navigate(['/home']);
  }
}