import { FormsModule } from '@angular/forms';
import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';

@Component({
  selector: 'app-pooboo-products',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PoobooHeader, PoobooFooter],
  templateUrl: './pooboo-products.html',
  styleUrl: './pooboo-products.scss'
})
export class PoobooProducts implements OnInit {

  private api = 'http://localhost:4000';

  products    : any[] = [];
  filtered    : any[] = [];
  loading     = true;
  error       = '';

  selectedCategory = '';
  selectedAgeGroup = '';
  selectedGender   = '';

  categories = ['Clothing', 'Footwear', 'Innerwear', 'Nightwear'];
  ageGroups  = ['0-6 months', '6-12 months', '1-2 years', '2-3 years',
                '3-5 years', '5-7 years', '7-10 years', '10-12 years'];
  genders    = ['unisex', 'boy', 'girl'];

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,  // 👈 add this
    private ngZone: NgZone           // 👈 add this
  ) {}

  ngOnInit() {
    this.http.get<any[]>(`${this.api}/api/pooboo/products`).subscribe({
      next: (data) => {
        this.ngZone.run(() => {         // 👈 wrap in ngZone.run()
          // Only show apparel categories on the Products page
          // (fabrics & accessories have their own dedicated pages)
          const apparel = data.filter(p => this.categories.includes(p.category));
          this.products = apparel;
          this.filtered = [...apparel];   // 👈 spread to create new reference
          this.loading  = false;
          this.cdr.detectChanges();    // 👈 force CD
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.error   = 'Failed to load products.';
          this.loading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  applyFilters() {
    this.filtered = this.products.filter(p => {
      const matchCat    = !this.selectedCategory || p.category  === this.selectedCategory;
      const matchAge    = !this.selectedAgeGroup || p.age_group === this.selectedAgeGroup;
      const matchGender = !this.selectedGender   || p.gender    === this.selectedGender;
      return matchCat && matchAge && matchGender;
    });
  }

  clearFilters() {
    this.selectedCategory = '';
    this.selectedAgeGroup = '';
    this.selectedGender   = '';
    this.filtered = [...this.products];  // 👈 spread here too
  }

  getImageUrl(img: string | null): string {
    if (!img) return 'assets/images/placeholder.png';
    return img.startsWith('http') ? img : `${this.api}/uploads/${img}`;
  }

  goToProduct(id: number) {
    this.router.navigate(['/pooboo/products', id]);
  }
}