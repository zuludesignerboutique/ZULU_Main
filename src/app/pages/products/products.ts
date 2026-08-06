import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ProductService } from '../../services/product.service';
import { Product } from '../../core/models/product.model';
import { Router } from '@angular/router';
import { ProductToolbar } from '../../components/product-toolbar/product-toolbar';

interface ProductQuery {
  search: string;
  sort: string;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, ProductToolbar],
  templateUrl: './products.html',
  styleUrl: './products.scss'
})
export class Products implements OnInit, OnDestroy {
  products: Product[] = [];
  isLoading = true;
  error: string | null = null;
  hasActiveSearch = false;

  // Single source of truth for the current search/sort — switchMap below
  // automatically cancels a stale in-flight request if the user types again
  // or changes the sort before the previous response arrives.
  private query$ = new BehaviorSubject<ProductQuery>({ search: '', sort: 'newest' });
  private sub?: Subscription;

  constructor(
    private productService: ProductService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  goToProduct(product: any) {
    this.router.navigate(['/product', product.id], {
      state: { product }  // ✅ passes full product data to product-view
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      return;
    }

    this.sub = this.query$
      .pipe(
        switchMap(({ search, sort }) => {
          this.isLoading = true;
          this.error = null;
          this.cdr.detectChanges();
          return this.productService.getProducts({ search, sort });
        })
      )
      .subscribe({
        next: (data) => {
          this.products = data;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ API Error:', err);
          this.error = 'Could not load products.';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  onSearchChange(term: string): void {
    this.hasActiveSearch = !!term;
    this.query$.next({ ...this.query$.value, search: term });
  }

  onSortChange(sort: string): void {
    this.query$.next({ ...this.query$.value, sort });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}