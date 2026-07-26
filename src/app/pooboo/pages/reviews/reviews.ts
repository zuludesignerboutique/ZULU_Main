import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PoobooReviewService } from '../../services/pooboo-review.service';
import { PoobooReview } from '../../core/models/pooboo-review.model';
import { AuthService } from '../../../services/auth.service';
import { PoobooHeader } from '../../layout/pooboo-header/pooboo-header';    
import { PoobooFooter } from '../../layout/pooboo-footer/pooboo-footer';
@Component({
  selector: 'app-pooboo-reviews',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PoobooHeader, PoobooFooter],
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss'
})
export class Reviews implements OnInit {
  private reviewService = inject(PoobooReviewService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  reviews = signal<PoobooReview[]>([]);
  isLoading = signal(true);
  showLoginModal = signal(false);
  showReviewForm = signal(false);
  submitSuccess = signal(false);
  submitError = signal('');
  isSubmitting = signal(false);
  selectedPhoto = signal<File | null>(null);
  selectedPhotoPreview = signal<string | null>(null);

  // Use the signal directly for reactivity, fall back to method for SSR safety
isLoggedIn = computed(() => this.authService.customerLoggedInSignal());
  filterRating = signal<number>(0);
  filteredReviews = computed(() => {
    const all = this.reviews();
    const filter = this.filterRating();
    return filter === 0 ? all : all.filter(r => r.rating === filter);
  });

  averageRating = computed(() => {
    const all = this.reviews();
    if (!all.length) return 0;
    return all.reduce((sum, r) => sum + r.rating, 0) / all.length;
  });

  reviewForm: FormGroup = this.fb.group({
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    title: ['', [Validators.required, Validators.maxLength(100)]],
    body: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
  });

  hoverRating = signal(0);

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading.set(true);
    this.reviewService.getAllReviews().subscribe({
      next: (data) => {
        this.reviews.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
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
    window.location.href = '/login?returnUrl=/pooboo/reviews';
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
      photo: this.selectedPhoto() ?? undefined
    }).subscribe({
      next: (newReview) => {
        this.reviews.update(r => [newReview, ...r]);
        this.submitSuccess.set(true);
        this.showReviewForm.set(false);
        this.reviewForm.reset();
        this.selectedPhoto.set(null);
        this.selectedPhotoPreview.set(null);
        this.isSubmitting.set(false);
        setTimeout(() => this.submitSuccess.set(false), 4000);
      },
      error: () => {
        this.submitError.set('Something went wrong. Please try again.');
        this.isSubmitting.set(false);
      }
    });
  }

  cancelForm(): void {
    this.showReviewForm.set(false);
    this.reviewForm.reset();
    this.selectedPhoto.set(null);
    this.selectedPhotoPreview.set(null);
  }

  setFilterRating(star: number): void {
    this.filterRating.set(this.filterRating() === star ? 0 : star);
  }

  getStarArray(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  getRatingCount(star: number): number {
    return this.reviews().filter(r => r.rating === star).length;
  }

  getRatingPercent(star: number): number {
    const total = this.reviews().length;
    if (!total) return 0;
    return (this.getRatingCount(star) / total) * 100;
  }

  trackById(_: number, item: PoobooReview): number {
    return item.id;
  }
}