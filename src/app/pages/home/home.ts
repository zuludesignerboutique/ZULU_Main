import {  Component,  OnInit,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  OnDestroy
} from '@angular/core';

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
export class HomeComponent implements OnInit, OnDestroy {

  products: Product[] = [];
  isLoading = false;

  currentSlide = 0;
  slideInterval: any;

  slides = [
    {
      image: 'assets/images/newslide1.jpg',
      subtitle: 'NEW COLLECTION 2026',
      title: 'Luxury Fashion Redefined',
      description: 'Elegant styles crafted for modern women.'
    },
    {
      image: 'assets/images/newslide5.jpg',
      subtitle: 'TRENDING NOW',
      title: 'Style That Speaks',
      description: 'Discover timeless beauty and designer collections.'
    },
    {
      image: 'assets/images/newslide2.jpg',
      subtitle: 'PREMIUM COLLECTION',
      title: 'Made For Every Occasion',
      description: 'Fashion that blends elegance and confidence.'
    },
    {
      image: 'assets/images/newslide6.jpg',
      subtitle: 'NEW COLLECTION 2026',
      title: 'Luxury Fashion Redefined',
      description: 'Elegant styles crafted for modern women.'
    },
    {
      image: 'assets/images/newslide8.jpg',
      subtitle: 'TRENDING NOW',
      title: 'Style That Speaks',
      description: 'Discover timeless beauty and designer collections.'
    },
    {
      image: 'assets/images/newslide9.jpg',
      subtitle: 'PREMIUM COLLECTION',
      title: 'Made For Every Occasion',
      description: 'Fashion that blends elegance and confidence.'
    },
    {
      image: 'assets/images/newslide10.jpg',
      subtitle: 'NEW COLLECTION 2026',
      title: 'Luxury Fashion Redefined',
      description: 'Elegant styles crafted for modern women.'
    },
    {
      image: 'assets/images/newslide11.jpg',
      subtitle: 'TRENDING NOW',
      title: 'Style That Speaks',
      description: 'Discover timeless beauty and designer collections.'
    },
    {
      image: 'assets/images/newslide9.jpg',
      subtitle: 'PREMIUM COLLECTION',
      title: 'Made For Every Occasion',
      description: 'Fashion that blends elegance and confidence.'
    }
  ];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {

    if (!isPlatformBrowser(this.platformId)) return;

    this.loadProducts();

    this.startSlider();
  }

  ngOnDestroy(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  startSlider() {

  this.slideInterval = setInterval(() => {

    this.currentSlide =
      (this.currentSlide + 1) % this.slides.length;

    this.cdr.detectChanges();

  }, 3000);

}
  goToSlide(index: number) {
    this.currentSlide = index;
  }

  private loadProducts() {

    this.isLoading = true;

    this.http
      .get<Product[]>('http://localhost:4000/api/products')
      .subscribe({

        next: (data) => {

          this.products = data.slice(0, 4);

          this.isLoading = false;

          this.cdr.detectChanges();
        },

        error: () => {

          this.isLoading = false;

          this.cdr.detectChanges();
        }
      });
  }
}