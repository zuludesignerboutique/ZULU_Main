import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ProductCardComponent } from '../../components/product-card/product-card';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-subcategories',
  standalone: true,
  imports: [RouterModule, CommonModule, ProductCardComponent],
  templateUrl: './subcategories.html',
  styleUrl: './subcategories.scss'
})
export class SubcategoriesComponent implements OnInit {

  categoryType = '';
  selectedSubcategory = '';
  subcategories: { name: string; key: string }[] = [];

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  isLoading = true;

  private categoryMap: Record<string, { label: string; subs: { name: string; key: string }[] }> = {
    bridal: {
      label: 'Bridal Collection',
      subs: [
        { name: 'All',           key: '' },
        { name: 'Bridal Blouse', key: 'Bridal Blouse' },
        { name: 'Bridal Saree',  key: 'Bridal Saree' },
        { name: 'Lehenga',       key: 'Lehenga' },
        { name: 'Gown',          key: 'Gown' },
        { name: 'Half Saree',    key: 'Half Saree' },
      ]
    },
    groom: {
      label: 'Groom Collection',
      subs: [
        { name: 'All',               key: '' },
        { name: 'Designer Shirt',    key: 'Designer Shirt' },
        { name: 'Traditional Dhoti', key: 'Traditional Dhoti' },
      ]
    },
    party: {
      label: 'Party Collection',
      subs: [
        { name: 'All',            key: '' },
        { name: 'Party Gown',     key: 'Party Gown' },
        { name: 'Designer Kurti', key: 'Designer Kurti' },
        { name: 'Western Dress',  key: 'Western Dress' },
      ]
    },
    casual: {
      label: 'Casual Collection',
      subs: [
        { name: 'All',           key: '' },
        { name: 'T-Shirts',      key: 'T-Shirts' },
        { name: 'Casual Shirts', key: 'Casual Shirts' },
        { name: 'Everyday Wear', key: 'Everyday Wear' },
      ]
    }
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.categoryType = this.route.snapshot.params['type'];
    const config = this.categoryMap[this.categoryType];
    if (config) {
      this.subcategories = config.subs;
      this.selectedSubcategory = '';
    }

    this.http.get<Product[]>('http://localhost:4000/api/products').subscribe({
      next: (data) => {
        // Debug: see exactly what category/subcategory values the DB returns
        console.log('[Subcategories] route type:', this.categoryType);
        console.log('[Subcategories] all products from DB:', data.map(p => ({
          id: p.id, name: p.name, category: p.category, subcategory: p.subcategory
        })));

        const type = this.categoryType.toLowerCase();

        this.allProducts = data.filter(p => {
          const cat = (p.category || '').toLowerCase().trim();
          const sub = (p.subcategory || '').toLowerCase().trim();

          // Match if DB category equals route type
          // OR if DB category/subcategory contains route type anywhere
          return cat === type
            || cat.includes(type)
            || sub.includes(type);
        });

        console.log('[Subcategories] matched products:', this.allProducts);

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

  get categoryLabel(): string {
    return this.categoryMap[this.categoryType]?.label || this.categoryType + ' Collection';
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
    console.log('[Subcategories] filteredProducts:', this.filteredProducts.length, 'for sub:', this.selectedSubcategory || 'ALL');
  }
}