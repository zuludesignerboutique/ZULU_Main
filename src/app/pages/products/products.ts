import { Component, OnInit, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.scss'
})
export class Products implements OnInit {
  products: Product[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(
    private productService: ProductService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef  // 👈 ADD THIS
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.isLoading = false;
      return;
    }

    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.isLoading = false;
        this.cdr.detectChanges(); // 👈 ADD THIS
      },
      error: (err) => {
        console.error('❌ API Error:', err);
        this.error = 'Could not load products.';
        this.isLoading = false;
        this.cdr.detectChanges(); // 👈 ADD THIS
      }
    });
  }
}