import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
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
  selectedSubcategory = '';   // which subcategory tab is active
  subcategories: { name: string; key: string }[] = [];

  allProducts: Product[] = [];     // all products from DB for this category
  filteredProducts: Product[] = []; // products for selected subcategory
  isLoading = true;

  // Map your route type → DB category name & subcategory list
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
        { name: 'All',              key: '' },
        { name: 'Designer Shirt',   key: 'Designer Shirt' },
        { name: 'Traditional Dhoti',key: 'Traditional Dhoti' },
      ]
    },
    party: {
      label: 'Party Collection',
      subs: [
        { name: 'All',           key: '' },
        { name: 'Party Gown',    key: 'Party Gown' },
        { name: 'Designer Kurti',key: 'Designer Kurti' },
        { name: 'Western Dress', key: 'Western Dress' },
      ]
    },
    casual: {
      label: 'Casual Collection',
      subs: [
        { name: 'All',          key: '' },
        { name: 'T-Shirts',     key: 'T-Shirts' },
        { name: 'Casual Shirts',key: 'Casual Shirts' },
        { name: 'Everyday Wear',key: 'Everyday Wear' },
      ]
    }
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.categoryType = this.route.snapshot.params['type'];
    const config = this.categoryMap[this.categoryType];
    if (config) {
      this.subcategories = config.subs;
      this.selectedSubcategory = ''; // "All" by default
    }

    // ✅ Fetch all products from DB, filter by category
    this.http.get<Product[]>('http://localhost:4000/api/products').subscribe({
      next: (data) => {
        // Match products where category matches the route type (case-insensitive)
        this.allProducts = data.filter(p =>
          p.category?.toLowerCase() === this.categoryType.toLowerCase() ||
          p.subcategory?.toLowerCase().includes(this.categoryType.toLowerCase())
        );
        this.filterProducts();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  get categoryLabel(): string {
    return this.categoryMap[this.categoryType]?.label || this.categoryType + ' Collection';
  }

  selectSubcategory(key: string) {
    this.selectedSubcategory = key;
    this.filterProducts();
  }

  filterProducts() {
    if (!this.selectedSubcategory) {
      this.filteredProducts = this.allProducts;
    } else {
      this.filteredProducts = this.allProducts.filter(p =>
        p.subcategory?.toLowerCase() === this.selectedSubcategory.toLowerCase()
      );
    }
  }
}