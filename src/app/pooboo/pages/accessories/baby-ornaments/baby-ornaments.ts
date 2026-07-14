import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoobooHeader } from '../../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../../layout/pooboo-footer/pooboo-footer';
import { PoobooAccessoryService } from '../../../services/pooboo-accessory.service';
import { PoobooAccessory } from '../../../core/models/pooboo-accessory.model';

@Component({
  selector: 'app-baby-ornaments',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './baby-ornaments.html',
  styleUrl: './baby-ornaments.scss'
})
export class BabyOrnaments implements OnInit {

  products: PoobooAccessory[] = [];
  isLoading = false;
  hasError = false;

  constructor(private accessoryService: PoobooAccessoryService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.hasError = false;

    this.accessoryService.getAll({ type: 'baby-ornaments' }).subscribe({
      next: (data: PoobooAccessory[]) => {
        this.products = data;
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  isOutOfStock(product: PoobooAccessory): boolean {
    return product.stock === 0;
  }

  getImageUrl(path: string | null): string {
    if (!path) return 'assets/images/placeholder.jpg';
    if (path.startsWith('http')) return path;
    return `http://localhost:4000/uploads/${path}`;
  }
}