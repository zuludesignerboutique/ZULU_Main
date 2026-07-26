import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoobooHeader } from '../../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../../layout/pooboo-footer/pooboo-footer';
import { PoobooAccessoryService } from '../../../services/pooboo-accessory.service';
import { PoobooAccessory } from '../../../core/models/pooboo-accessory.model';

@Component({
  selector: 'app-hair-clips',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './hair-clips.html',
  styleUrl: './hair-clips.scss'
})
export class HairClips implements OnInit {

  products: PoobooAccessory[] = [];
  isLoading = false;
  hasError = false;

  constructor(
    private accessoryService: PoobooAccessoryService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.hasError = false;

    this.accessoryService.getAll({ type: 'hair-clips' }).subscribe({
      next: (data: PoobooAccessory[]) => {
        this.ngZone.run(() => {
          this.products = data;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.hasError = true;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
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