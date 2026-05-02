import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  isLoading = true;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // ✅ Fetch from DB — show only first 4 as featured on home page
    this.http.get<Product[]>('http://localhost:4000/api/products').subscribe({
      next: (data) => {
        this.products = data.slice(0, 4); // show 4 featured products
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}