import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CategoryService, Category } from '../../services/category.service';

interface DisplayCategory extends Category {
  image: string;
  route: string;
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories implements OnInit {

  categories: DisplayCategory[] = [];
  isLoading = true;
  errorMsg = '';

  constructor(
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data.map(cat => ({
          ...cat,
          // No image column on categories yet — placeholder keeps the grid working
          // until you add a proper image field/upload for categories in the admin.
          image: `https://placehold.co/600x800/1a1a1a/d4af37?text=${encodeURIComponent(cat.name)}`,
          route: `/categories/${this.slugify(cat.name)}`
        }));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMsg = 'Could not load categories right now.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Turns "Casual Wear" into "casual-wear" — used to build/match storefront URLs
  // without needing a dedicated slug column in the categories table.
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}