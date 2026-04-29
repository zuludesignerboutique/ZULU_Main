import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GalleryService } from '../../services/gallery.service';
import { GalleryImage } from '../../core/models/gallery.model';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class Gallery implements OnInit, OnDestroy {

  // ══════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════

  images:    GalleryImage[] = [];
  isLoading  = true;

  /** Lightbox — null means closed */
  lightboxIndex: number | null = null;

  readonly skeletons = Array(8);

  private destroy$ = new Subject<void>();

  // ══════════════════════════════════════════════
  // CONSTRUCTOR
  // ══════════════════════════════════════════════

  constructor(private galleryService: GalleryService) {}

  // ══════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════

  ngOnInit(): void {
    this.galleryService.getGalleryImages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (data) => { this.images = data;  this.isLoading = false; },
        error: (err)  => { console.error('Gallery load failed:', err); this.isLoading = false; }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ══════════════════════════════════════════════
  // TRACK
  // ══════════════════════════════════════════════

  trackById(_index: number, item: GalleryImage): string | number {
    return item.id ?? item.imageUrl;
  }

  // ══════════════════════════════════════════════
  // LIGHTBOX
  // ══════════════════════════════════════════════

  openLightbox(index: number): void {
    this.lightboxIndex = index;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxIndex = null;
    document.body.style.overflow = '';
  }

  lightboxStep(dir: 1 | -1): void {
    if (this.lightboxIndex === null) return;
    this.lightboxIndex =
      (this.lightboxIndex + dir + this.images.length) % this.images.length;
  }

  // Keyboard navigation
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (this.lightboxIndex === null) return;

    if (e.key === 'Escape')     this.closeLightbox();
    if (e.key === 'ArrowRight') this.lightboxStep(1);
    if (e.key === 'ArrowLeft')  this.lightboxStep(-1);
  }
}