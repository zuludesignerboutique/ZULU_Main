import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-carousel.html',
  styleUrl: './image-carousel.scss'
})
export class ImageCarousel implements OnInit, OnDestroy {
  @Input() images: string[] = [];
  @Input() altText = 'Carousel image';

  currentIndex = 0;
  private intervalId: any;

  ngOnInit() {
    if (this.images.length > 1) {
      this.startAutoSlide();
    }
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  startAutoSlide() {
    this.stopAutoSlide();
    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.images.length;
    }, 1500);
  }

  stopAutoSlide() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onMouseEnter() {
    this.stopAutoSlide();
  }

  onMouseLeave() {
    if (this.images.length > 1) {
      this.startAutoSlide();
    }
  }

  goTo(index: number) {
    this.currentIndex = index;
    if (this.images.length > 1) {
      this.startAutoSlide();
    }
  }
}
