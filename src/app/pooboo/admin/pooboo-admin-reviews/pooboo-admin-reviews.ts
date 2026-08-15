import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReviewService } from '../../../services/review.service';
import { Review } from '../../../core/models/review.model';

@Component({
  selector: 'app-pooboo-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pooboo-admin-reviews.html',
  styleUrl: './pooboo-admin-reviews.scss'
})
export class PoobooAdminReviews implements OnInit {
  private reviewService = inject(ReviewService);

  reviews = signal<Review[]>([]);
  isLoading = signal(true);
  searchQuery = signal('');
  filterRating = signal<number>(0);
  filterBrand = signal<string>('all');
  deleteConfirmId = signal<number | null>(null);
  deleteInProgress = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  filteredReviews = computed(() => {
    let list = this.reviews();
    const q = this.searchQuery().toLowerCase();
    const r = this.filterRating();
    const b = this.filterBrand();
    if (q) {
      list = list.filter(rev =>
        rev.customerName.toLowerCase().includes(q) ||
        rev.title.toLowerCase().includes(q) ||
        rev.body.toLowerCase().includes(q) ||
        (rev.productName?.toLowerCase().includes(q) ?? false)
      );
    }
    if (r > 0) list = list.filter(rev => rev.rating === r);
    if (b !== 'all') list = list.filter(rev => rev.brand === b);
    return list;
  });

  totalCount    = computed(() => this.reviews().length);
  averageRating = computed(() => {
    const all = this.reviews();
    if (!all.length) return 0;
    return all.reduce((s, r) => s + r.rating, 0) / all.length;
  });

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading.set(true);
    this.reviewService.getAllReviewsAdmin().subscribe({
      next: (data) => {
        this.reviews.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load reviews.');
        this.isLoading.set(false);
      }
    });
  }

  confirmDelete(id: number): void {
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  executeDelete(): void {
    const id = this.deleteConfirmId();
    if (id === null) return;
    this.deleteInProgress.set(true);
    this.reviewService.deleteReview(id).subscribe({
      next: () => {
        this.reviews.update(list => list.filter(r => r.id !== id));
        this.deleteConfirmId.set(null);
        this.deleteInProgress.set(false);
        this.successMessage.set('Review deleted successfully.');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.errorMessage.set('Failed to delete review. Try again.');
        this.deleteInProgress.set(false);
      }
    });
  }

  setFilterRating(star: number): void {
    this.filterRating.set(this.filterRating() === star ? 0 : star);
  }

  setFilterBrand(brand: string): void {
    this.filterBrand.set(this.filterBrand() === brand ? 'all' : brand);
  }

  getStarArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  brandLabel(brand?: string): string {
    return (brand || 'zulu').toUpperCase();
  }

  trackById(_: number, item: Review): number {
    return item.id;
  }
}