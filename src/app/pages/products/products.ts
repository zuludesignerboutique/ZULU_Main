import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../services/product.service';
import { Product } from '../../core/models/product.model';
import { Observable } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule,RouterLink],
  templateUrl: './products.html',
  styleUrl: './products.scss'
})
export class Products {

  products$!: Observable<Product[]>;

  constructor(private productService: ProductService) {
    this.products$ = this.productService.getProducts();
  }

}