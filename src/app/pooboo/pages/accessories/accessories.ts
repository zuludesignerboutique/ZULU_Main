import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoobooProductService } from '../../services/pooboo-product.service';
import { PoobooProduct } from '../../core/models/pooboo-product.model';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';    
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
type AccessoryTab = 'baby-ornaments' | 'bands' | 'hair-clips';

@Component({
  selector: 'app-accessories',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './accessories.html',
  styleUrl: './accessories.scss'
})
export class Accessories implements OnInit {

  activeTab: AccessoryTab = 'baby-ornaments';
  loading = false;
  error = false;

  tabs: { key: AccessoryTab; label: string; icon: string }[] = [
    { key: 'baby-ornaments', label: 'Baby Ornaments', icon: '👶' },
    { key: 'bands',          label: 'Bands',          icon: '💛' },
    { key: 'hair-clips',     label: 'Hair Clips',     icon: '🎀' },
  ];

  private allProducts: PoobooProduct[] = [];

  constructor(private productService: PoobooProductService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.error = false;

    this.productService.getAll().subscribe({
      next: (products: PoobooProduct[]) => {
        this.allProducts = products.filter((p: PoobooProduct) =>
          p.is_active &&
          (['baby-ornaments', 'bands', 'hair-clips'] as string[]).includes(p.category)
        );
        this.loading = false;
      },
      error: () => {
        this.error = true;
        this.loading = false;
      }
    });
  }

  setTab(tab: AccessoryTab): void {
    this.activeTab = tab;
  }

  getProducts(tab: AccessoryTab): PoobooProduct[] {
    return this.allProducts.filter((p: PoobooProduct) => p.category === tab);
  }

  getTabCount(tab: AccessoryTab): number {
    return this.allProducts.filter((p: PoobooProduct) => p.category === tab).length;
  }

  isOutOfStock(product: PoobooProduct): boolean {
    return product.stock === 0;
  }
}
