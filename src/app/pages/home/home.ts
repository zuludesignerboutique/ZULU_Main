import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ProductCardComponent } from '../../components/product-card/product-card';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ProductCardComponent, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit {

  products: Product[] = [];
  isLoading = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,          // 👈 ADD THIS
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadProducts();
  }

  private loadProducts() {
    this.isLoading = true;
    this.http.get<Product[]>('http://localhost:4000/api/products').subscribe({
      next: (data) => {
        this.products = data.slice(0, 4);
        this.isLoading = false;
        this.cdr.detectChanges();            // 👈 ADD THIS
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();            // 👈 ADD THIS
      }
    });
  }
}