import {
  Component, OnInit,
  Inject, PLATFORM_ID, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
import { PoobooProductService } from '../../services/pooboo-product.service';
import { PoobooProduct } from '../../core/models/pooboo-product.model';

@Component({
  selector: 'app-fabrics',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './fabrics.html',
  styleUrl: './fabrics.scss'
})
export class Fabrics implements OnInit {

  products: PoobooProduct[] = [];
  isLoading = false;
  selectedType = 'all';

  fabricTypes = [
    { label: 'Cotton',     value: 'cotton',     emoji: '🌿' },
    { label: 'Silk',       value: 'silk',        emoji: '✨' },
    { label: 'Linen',      value: 'linen',       emoji: '🍃' },
    { label: 'Georgette',  value: 'georgette',   emoji: '🌸' },
    { label: 'Net',        value: 'net',         emoji: '🕸️' },
    { label: 'Velvet',     value: 'velvet',      emoji: '💜' },
  ];

  constructor(
    private productService: PoobooProductService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadProducts();
  }

  selectType(value: string) {
    this.selectedType = value;
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading = true;

    const filters: { category?: string } = { category: 'fabric' };

    // If a specific fabric type is selected, pass it as a sub-category filter
    // Adjust the filter key below if your backend uses a different param (e.g. sub_category / type)
    if (this.selectedType !== 'all') {
      (filters as any)['sub_category'] = this.selectedType;
    }

    this.productService.getAll(filters).subscribe({
      next: (data: PoobooProduct[]) => {
        // Client-side filter by fabric type if backend doesn't support sub_category
        this.products = this.selectedType === 'all'
          ? data
          : data.filter(p =>
              p.name?.toLowerCase().includes(this.selectedType) ||
              (p as any).fabric_type?.toLowerCase() === this.selectedType
            );
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getTypeLabel(): string {
    return this.fabricTypes.find(t => t.value === this.selectedType)?.label ?? '';
  }

  getImageUrl(path: string): string {
    if (!path) return 'assets/images/placeholder.jpg';
    if (path.startsWith('http')) return path;
    return `http://localhost:4000/uploads/${path}`;
  }
}