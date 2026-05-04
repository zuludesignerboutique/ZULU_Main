import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
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
export class HomeComponent implements AfterViewInit {

  products: Product[] = [];
  isLoading = false;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ✅ AfterViewInit guarantees we are 100% in the browser
  // ngOnInit can still fire during SSR hydration
  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadProducts();
  }

  private loadProducts() {
    this.isLoading = true;
    this.http.get<Product[]>('http://localhost:4000/api/products').subscribe({
      next: (data) => {
        this.products = data.slice(0, 4);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}