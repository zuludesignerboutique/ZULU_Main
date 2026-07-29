import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ProductCardComponent } from '../../components/product-card/product-card';
import { Product } from '../../core/models/product.model';
import { CategoryService, Category } from '../../services/category.service';

@Component({
  selector: 'app-subcategories',
  standalone: true,
  imports: [RouterModule, CommonModule, ProductCardComponent],
  templateUrl: './subcategories.html',
  styleUrl: './subcategories.scss'
})
export class SubcategoriesComponent implements OnInit {

  categoryType = '';       // the :type slug from the URL, e.g. "casual-wear"
  categoryLabel = '';      // resolved display name, e.g. "Casual Wear"
  selectedSubcategory = '';
  subcategories: { name: string; key: string }[] = [];

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  isLoading = true;
  notFound = false;

  private matchedCategory: Category | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private categoryService: CategoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.categoryType = this.route.snapshot.params['type'];

    // Resolve the slug in the URL against real categories from the DB —
    // replaces the old hardcoded `categoryMap` lookup.
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.matchedCategory = categories.find(
          c => this.slugify(c.name) === this.categoryType
        ) || null;

        if (!this.matchedCategory) {
          this.notFound = true;
          this.isLoading = false;
          this.cdr.detectChanges();
          return;
        }

        this.categoryLabel = this.matchedCategory.name;
        this.loadSubcategories(this.matchedCategory.id);
        this.loadProducts(this.matchedCategory.name);
      },
      error: () => {
        this.notFound = true;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private loadSubcategories(categoryId: number) {
    this.categoryService.getSubcategories(categoryId).subscribe({
      next: (subs) => {
        this.subcategories = [
          { name: 'All', key: '' },
          ...subs.map(s => ({ name: s.name, key: s.name }))
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        // Tabs are non-critical — fall back to just "All" rather than blocking the page
        this.subcategories = [{ name: 'All', key: '' }];
        this.cdr.detectChanges();
      }
    });
  }

  private loadProducts(categoryName: string) {
    this.http.get<Product[]>('/api/products').subscribe({
      next: (data) => {
        const label = categoryName.toLowerCase().trim();
        this.allProducts = data.filter(
          p => (p.category || '').toLowerCase().trim() === label
        );
        this.filterProducts();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[Subcategories] API error:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectSubcategory(key: string) {
    this.selectedSubcategory = key;
    this.filterProducts();
    this.cdr.detectChanges();
  }

  filterProducts() {
    if (!this.selectedSubcategory) {
      this.filteredProducts = this.allProducts;
    } else {
      const sel = this.selectedSubcategory.toLowerCase();
      this.filteredProducts = this.allProducts.filter(p =>
        (p.subcategory || '').toLowerCase().trim() === sel
      );
    }
  }

  // Must match the slugify logic in categories.ts so routes resolve consistently.
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}