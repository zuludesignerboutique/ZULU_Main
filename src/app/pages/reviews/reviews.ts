import {
  Component, OnInit, OnDestroy, Inject, PLATFORM_ID,
  ChangeDetectorRef, inject, signal, computed
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../core/models/review.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
})
export class Reviews implements OnInit, OnDestroy {
  private reviewService = inject(ReviewService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  constructor(
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  reviews: Review[] = [];
  currentIndex = 0;
  private slideInterval: ReturnType<typeof setInterval> | null = null;

  isLoggedIn = computed(() => this.authService.customerLoggedInSignal());

  showLoginModal = signal(false);
  showReviewForm = signal(false);
  submitSuccess = signal(false);
  submitError = signal('');
  isSubmitting = signal(false);
  selectedPhoto = signal<File | null>(null);
  selectedPhotoPreview = signal<string | null>(null);
  hoverRating = signal(0);

  // Set when arriving via "Write a Review" deep-link from a product page
  // e.g. /reviews?brand=pooboo&productId=12&productName=Frock&write=1
  linkedProductId: number | null = null;
  linkedProductName: string | null = null;

  // Store the review is being submitted for. Derived from ?brand= (the store the
  // user clicked "Write a Review" from), whitelisted, defaulting to 'zulu'.
  private allowedBrands = ['zulu', 'pooboo', 'aurum'];
  currentBrand = 'zulu';

  reviewForm: FormGroup = this.fb.group({
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    title: ['', [Validators.required, Validators.maxLength(100)]],
    body: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const pid = params.get('productId');
    this.linkedProductId = pid ? Number(pid) : null;
    this.linkedProductName = params.get('productName');
    const brand = params.get('brand');
    if (brand && this.allowedBrands.includes(brand)) {
      this.currentBrand = brand;
    }

    if (!isPlatformBrowser(this.platformId)) return;

    this.loadReviews();

    // Auto-open the write-review form if the link asked for it
    if (params.get('write') === '1') {
      this.onWriteReviewClick();
    }
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  loadReviews(): void {
    this.reviewService.getAllReviews().subscribe({
      next: (data) => {
        this.reviews = data;
        this.currentIndex = 0;
        this.startAutoSlide();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load reviews:', err);
        this.cdr.detectChanges();
      }
    });
  }

  get averageRatingValue(): number {
    if (!this.reviews.length) return 0;
    return this.reviews.reduce((s, r) => s + r.rating, 0) / this.reviews.length;
  }

  get satisfactionPercent(): number {
    if (!this.reviews.length) return 0;
    const satisfied = this.reviews.filter(r => r.rating >= 4).length;
    return Math.round((satisfied / this.reviews.length) * 100);
  }

  startAutoSlide(): void {
    this.stopAutoSlide();
    this.slideInterval = setInterval(() => {
      this.nextSlide();
      this.cdr.detectChanges();
    }, 4000);
  }

  stopAutoSlide(): void {
    if (this.slideInterval !== null) {
      clearInterval(this.slideInterval);
      this.slideInterval = null;
    }
  }

  nextSlide(): void {
    if (this.reviews.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.reviews.length;
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
    this.startAutoSlide();
    this.cdr.detectChanges();
  }

  onWriteReviewClick(): void {
    if (this.isLoggedIn()) {
      this.showReviewForm.set(true);
    } else {
      this.showLoginModal.set(true);
    }
  }

  closeLoginModal(): void {
    this.showLoginModal.set(false);
  }

  goToLogin(): void {
    const params = this.route.snapshot.queryParamMap;
    const parts: string[] = [];
    params.keys.forEach(k => {
      const v = params.get(k);
      if (v) parts.push(`${k}=${encodeURIComponent(v)}`);
    });
    const returnUrl = '/reviews' + (parts.length ? '?' + parts.join('&') : '');
    window.location.href = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  }

  setRating(value: number): void {
    this.reviewForm.patchValue({ rating: value });
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedPhoto.set(file);
      const reader = new FileReader();
      reader.onload = (e) => this.selectedPhotoPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedPhoto.set(null);
    this.selectedPhotoPreview.set(null);
  }

  submitReview(): void {
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.submitError.set('');
    const { rating, title, body } = this.reviewForm.value;

    this.reviewService.submitReview({
      rating,
      title,
      body,
      productId: this.linkedProductId,
      brand: this.currentBrand,
      photo: this.selectedPhoto() ?? undefined
    }).subscribe({
      next: (newReview) => {
        this.reviews = [newReview, ...this.reviews];
        this.submitSuccess.set(true);
        this.showReviewForm.set(false);
        this.reviewForm.reset({ rating: 0, title: '', body: '' });
        this.selectedPhoto.set(null);
        this.selectedPhotoPreview.set(null);
        this.isSubmitting.set(false);
        this.cdr.detectChanges();
        setTimeout(() => {
          this.submitSuccess.set(false);
          this.cdr.detectChanges();
        }, 4000);
      },
      error: (err) => {
        console.error('Failed to submit review:', err);
        this.submitError.set('Something went wrong. Please try again.');
        this.isSubmitting.set(false);
      }
    });
  }

  cancelForm(): void {
    this.showReviewForm.set(false);
    this.reviewForm.reset({ rating: 0, title: '', body: '' });
    this.selectedPhoto.set(null);
    this.selectedPhotoPreview.set(null);
  }

  getStarArray(rating: number): number[] {
    return [1, 2, 3, 4, 5];
  }

  brandLabel(brand?: string): string {
    return (brand || 'zulu').toUpperCase();
  }
}