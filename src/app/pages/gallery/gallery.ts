import { Component, OnInit, OnDestroy, HostListener, NgZone, ChangeDetectorRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  /** Re-triggers the slide/fade transition each time the user navigates. */
  transitioning = false;

  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  readonly skeletons = Array(8);

  private destroy$ = new Subject<void>();

  // ══════════════════════════════════════════════
  // CONSTRUCTOR
  // ══════════════════════════════════════════════

  constructor(
    private galleryService: GalleryService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ══════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════

  ngOnInit(): void {
    // Skip the API call during prerendering (SSG/SSR): the relative /api URL
    // doesn't exist server-side, and a failed fetch would leave the static HTML
    // with a misleading "No images yet" empty state. Keeping isLoading=true here
    // means the prerendered HTML ships the loading skeleton instead; the browser
    // fetch below populates it after hydration. Same pattern as the Products page.
    if (!isPlatformBrowser(this.platformId)) return;

    this.galleryService.getGalleryImages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.images = data;
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        },
        error: (err) => {
          console.error('Gallery load failed:', err);
          this.ngZone.run(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearTransition();
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
    this.retriggerTransition();
  }

  closeLightbox(): void {
    this.lightboxIndex = null;
    document.body.style.overflow = '';
    this.clearTransition();
  }

  lightboxStep(dir: 1 | -1): void {
    if (this.lightboxIndex === null) return;
    this.lightboxIndex =
      (this.lightboxIndex + dir + this.images.length) % this.images.length;
    this.retriggerTransition();
  }

  /** The image currently shown in the presentation. */
  get currentImage(): GalleryImage | null {
    if (this.lightboxIndex === null || !this.images.length) return null;
    return this.images[this.lightboxIndex];
  }

  /** Zero-padded position label, e.g. "01". */
  get currentNumber(): string {
    const n = (this.lightboxIndex ?? 0) + 1;
    return String(n).padStart(2, '0');
  }

  get totalCount(): number {
    return this.images.length;
  }

  // ── Transition helper ─────────────────────────
  // Toggles a class on/off on the next tick so the CSS animation replays
  // cleanly on every navigation, instead of only on the first open.
  private retriggerTransition(): void {
    this.clearTransition();
    this.transitioning = false;
    this.transitionTimer = setTimeout(() => {
      this.transitioning = true;
    }, 10);
  }

  private clearTransition(): void {
    if (this.transitionTimer !== null) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
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