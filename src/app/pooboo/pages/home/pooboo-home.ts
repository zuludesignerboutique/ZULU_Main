import {
  Component, OnInit, OnDestroy,
  Inject, PLATFORM_ID, ChangeDetectorRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
import { PoobooProductService } from '../../services/pooboo-product.service';
import { PoobooProduct } from '../../core/models/pooboo-product.model';

@Component({
  selector: 'app-pooboo-home',
  standalone: true,
  imports: [CommonModule, RouterModule, PoobooHeader, PoobooFooter],
  templateUrl: './pooboo-home.html',
  styleUrl: './pooboo-home.scss'
})
export class PoobooHome implements OnInit, OnDestroy {

  featuredProducts: PoobooProduct[] = [];
  isLoading = false;

  selectedAgeGroup = 'all';
  currentBanner = 0;
  bannerInterval: any;

  ageGroups = [
    { label: '0–1 yr',   value: '0-1',   emoji: '👶', color: '#FFE5D9' },
    { label: '1–3 yrs',  value: '1-3',   emoji: '🐣', color: '#FFF3CD' },
    { label: '3–6 yrs',  value: '3-6',   emoji: '🌈', color: '#D4EDDA' },
    { label: '6–10 yrs', value: '6-10',  emoji: '⚡', color: '#D1ECF1' },
    { label: '10–14 yrs',value: '10-14', emoji: '🌟', color: '#F8D7DA' }
  ];

  banners = [
    {
      headline: 'Little Fashionistas,\nBig Statements',
      sub: 'New season arrivals for every tiny trendsetter',
      tag: 'New Arrivals 2026',
      cta: 'Shop Now',
      link: '/pooboo/products',
      bg: 'linear-gradient(135deg, #FF6B35 0%, #ff8c42 50%, #FFD600 100%)'
    },
    {
      headline: 'Custom Stitched\nJust for Them',
      sub: 'Measurements, style, occasion — we handle everything',
      tag: 'Custom Dress Service',
      cta: 'Book Now',
      link: '/pooboo/enquiry',
      bg: 'linear-gradient(135deg, #00B4D8 0%, #0096c7 50%, #48cae4 100%)'
    },
    {
      headline: 'Celebration Ready\nOutfits',
      sub: 'Ethnic, western and everything in between',
      tag: 'Party & Ethnic Wear',
      cta: 'Explore',
      link: '/pooboo/products',
      bg: 'linear-gradient(135deg, #7B2D8B 0%, #a855f7 50%, #FF6B35 100%)'
    }
  ];

  categories = [
    { label: 'Frocks & Dresses', icon: '👗', query: 'frocks' },
    { label: 'Ethnic Wear',      icon: '🎎', query: 'ethnic' },
    { label: 'Party Wear',       icon: '🎉', query: 'party' },
    { label: 'Casual Wear',      icon: '👕', query: 'casual' },
    { label: 'Nightwear',        icon: '🌙', query: 'nightwear' },
    { label: 'Newborn Sets',     icon: '🍼', query: 'newborn' }
  ];

  constructor(
    private poobooProductService: PoobooProductService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadFeatured();
    this.startBannerRotation();
  }

  ngOnDestroy() {
    if (this.bannerInterval) clearInterval(this.bannerInterval);
  }

  startBannerRotation() {
    this.bannerInterval = setInterval(() => {
      this.currentBanner = (this.currentBanner + 1) % this.banners.length;
      this.cdr.detectChanges();
    }, 4000);
  }

  goToBanner(i: number) {
    this.currentBanner = i;
  }

  loadFeatured() {
    this.isLoading = true;
    const filters = this.selectedAgeGroup !== 'all'
      ? { age_group: this.selectedAgeGroup }
      : undefined;

    this.poobooProductService.getAll(filters).subscribe({
      next: (data: PoobooProduct[]) => {
        this.featuredProducts = data.slice(0, 8);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectAge(value: string) {
    this.selectedAgeGroup = value;
    this.loadFeatured();
  }

  getImageUrl(path: string): string {
    if (!path) return 'assets/images/placeholder.jpg';
    if (path.startsWith('http')) return path;
    return `http://localhost:4000/uploads/${path}`;
  }
}