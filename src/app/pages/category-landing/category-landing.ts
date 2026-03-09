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

  navigateTo(site: string) {

  if (site === 'pooboo') {
    window.location.href = 'http://localhost:4300'; // Pooboo project
    return;
  }

  if (site === 'aurum') {
    alert('Aurum is coming soon!');
    return;
  }

  // Zulu
  this.router.navigate(['/home']);
}
}