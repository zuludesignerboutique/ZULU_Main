import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  reviews: Review[] = [];

  newReview: Review = { id: 0, name: '', rating: 5, comment: '' };

  selectedFile: File | null = null;
  currentIndex = 0;
  private slideInterval: ReturnType<typeof setInterval> | null = null;

  // ✅ Reference to the file input so we can clear it after submit
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private reviewService: ReviewService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Only fetch in browser — SSR can't reach localhost:4000
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadReviews();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  loadReviews(): void {
    this.reviewService.getReviews().subscribe({
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

  prevSlide(): void {
    if (this.reviews.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.reviews.length) % this.reviews.length;
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
    this.startAutoSlide();
    this.cdr.detectChanges();
  }

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
    if (this.selectedFile) formData.append('image', this.selectedFile);

    this.reviewService.addReview(formData).subscribe({
      next: () => {
        this.loadReviews();
        this.resetForm();
      },
      error: (err) => console.error('Failed to submit review:', err)
    });
  }

  private resetForm(): void {
    this.newReview    = { id: 0, name: '', rating: 5, comment: '' };
    this.selectedFile = null;
    // ✅ Clear the file input so it doesn't show the old filename
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}