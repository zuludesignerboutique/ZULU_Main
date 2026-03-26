import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../core/models/review.model';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
})
export class Reviews implements OnInit, OnDestroy {

  // ══════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════

  reviews: Review[] = [];

  newReview: Review = {
    id: 0,
    name: '',
    rating: 5,
    comment: ''
  };

  selectedFile: File | null = null;

  /** Active slide index */
  currentIndex = 0;

  private slideInterval: ReturnType<typeof setInterval> | null = null;

  // ══════════════════════════════════════════════
  // CONSTRUCTOR
  // ══════════════════════════════════════════════

  constructor(
    private reviewService: ReviewService,
    private http: HttpClient
  ) {}

  // ══════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════

  ngOnInit(): void {
    this.loadReviews();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  // ══════════════════════════════════════════════
  // DATA
  // ══════════════════════════════════════════════

  loadReviews(): void {
    this.reviewService.getReviews().subscribe({
      next: (data) => {
        this.reviews = data;
        // Start slider only once reviews are loaded
        this.startAutoSlide();
      },
      error: (err) => console.error('Failed to load reviews:', err)
    });
  }

  // ══════════════════════════════════════════════
  // SLIDER
  // ══════════════════════════════════════════════

  startAutoSlide(): void {
    this.stopAutoSlide(); // prevent duplicate intervals

    this.slideInterval = setInterval(() => {
      this.nextSlide();
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

  prevSlide(): void {
    if (this.reviews.length === 0) return;
    this.currentIndex =
      (this.currentIndex - 1 + this.reviews.length) % this.reviews.length;
  }

  /** Jump directly to a slide (used by dot indicators) */
  goToSlide(index: number): void {
    this.currentIndex = index;
    // Reset timer so dot-click doesn't immediately advance
    this.startAutoSlide();
  }

  // ══════════════════════════════════════════════
  // FORM
  // ══════════════════════════════════════════════

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  submitReview(): void {
    if (!this.newReview.name.trim() || !this.newReview.comment.trim()) return;

    const formData = new FormData();
    formData.append('name',    this.newReview.name);
    formData.append('rating',  this.newReview.rating.toString());
    formData.append('comment', this.newReview.comment);

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.reviewService.addReview(formData).subscribe({
      next: () => {
        this.loadReviews();
        this.resetForm();
      },
      error: (err) => console.error('Failed to submit review:', err)
    });
  }

  private resetForm(): void {
    this.newReview  = { id: 0, name: '', rating: 5, comment: '' };
    this.selectedFile = null;
  }
}