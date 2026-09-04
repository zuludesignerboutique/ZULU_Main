import { Component, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ImageCarousel } from '../../components/image-carousel/image-carousel';
import { CategoryLandingService, CategoryLandingCard } from '../../services/category-landing.service';

@Component({
  selector: 'app-category-landing',
  standalone: true,
  imports: [CommonModule, ImageCarousel],
  templateUrl: './category-landing.html',
  styleUrl: './category-landing.scss'
})
export class CategoryLandingComponent implements OnInit {
  cards: CategoryLandingCard[] = [];
  isLoading = true;

  private defaultImages: Record<string, string> = {
    zulu: '/assets/images/zulu-model2.jpg',
    pooboo: '/assets/images/pooboo-model.jpeg',
    aurium: ''
  };

  private defaultTitles: Record<string, string> = {
    zulu: 'Zulu',
    pooboo: 'Pooboo',
    aurium: 'Aurium'
  };

  private defaultSubtitles: Record<string, string> = {
    zulu: 'Elegant. Modern. Timeless.',
    pooboo: 'Cute. Colorful. Playful.',
    aurium: 'Shine with Grace.'
  };

  private defaultButtonText: Record<string, string> = {
    zulu: 'Enter Zulu →',
    pooboo: 'Enter Pooboo →',
    aurium: 'Coming Soon'
  };

  private defaultButtonLink: Record<string, string> = {
    zulu: '/home',
    pooboo: '/pooboo',
    aurium: ''
  };

  private defaultIcons: Record<string, string> = {
    zulu: '✦',
    pooboo: '✿',
    aurium: '◈'
  };

  private defaultTags: Record<string, string> = {
    zulu: '01 · Signature',
    pooboo: '02 · Kids',
    aurium: '03 · Jewelry'
  };

  constructor(
    private router: Router,
    private service: CategoryLandingService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.service.getPublicCards().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.cards = res.cards || [];
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  getCardImages(card: CategoryLandingCard): string[] {
    if (card.images && card.images.length > 0) {
      return card.images.map(img => img.image_url);
    }
    const fallback = this.defaultImages[card.category_slug];
    return fallback ? [fallback] : [];
  }

  hasCarousel(card: CategoryLandingCard): boolean {
    return card.images && card.images.length > 1;
  }

  getIcon(slug: string): string {
    return this.defaultIcons[slug] || '✦';
  }

  getTag(slug: string): string {
    return this.defaultTags[slug] || '';
  }

  getDefaultImage(slug: string): string {
    return this.defaultImages[slug] || '';
  }

  navigateTo(link: string) {
    if (!link) return;
    this.router.navigate([link]);
  }
}
