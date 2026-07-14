import {
  Component, OnInit,
  Inject, PLATFORM_ID, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
import { PoobooFabricService } from '../../services/pooboo-fabric.service';
import { PoobooFabric } from '../../core/models/pooboo-fabric.model';

@Component({
  selector: 'app-fabrics',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './fabrics.html',
  styleUrl: './fabrics.scss'
})
export class Fabrics implements OnInit {

  products: PoobooFabric[] = [];
  isLoading = false;
  selectedType = 'all';

  fabricTypes = [
    { label: 'Cotton',     value: 'cotton',     emoji: '🌿' },
    { label: 'Silk',       value: 'silk',        emoji: '✨' },
    { label: 'Linen',      value: 'linen',       emoji: '🍃' },
    { label: 'Georgette',  value: 'georgette',   emoji: '🌸' },
    { label: 'Net',        value: 'net',         emoji: '🕸️' },
    { label: 'Velvet',     value: 'velvet',      emoji: '💜' },
    {label: 'satin',      value: 'satin',       emoji: '💫' },
  ];

  constructor(
    private fabricService: PoobooFabricService,
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

    const filters = this.selectedType !== 'all'
      ? { type: this.selectedType }
      : undefined;

    this.fabricService.getAll(filters).subscribe({
      next: (data: PoobooFabric[]) => {
        this.products = data;
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

  getTypeLabelFor(value: string): string {
    return this.fabricTypes.find(t => t.value === value)?.label ?? '';
  }

  getImageUrl(path: string | null): string {
    if (!path) return 'assets/images/placeholder.jpg';
    if (path.startsWith('http')) return path;
    return `http://localhost:4000/uploads/${path}`;
  }
}