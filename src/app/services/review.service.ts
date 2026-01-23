import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Review } from '../core/models/review.model';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {

  private reviews: Review[] = [
    {
      id: 1,
      name: 'Aishwarya',
      rating: 5,
      comment: 'Absolutely loved the bridal collection!',
      createdAt: new Date()
    },
    {
      id: 2,
      name: 'Sneha',
      rating: 4,
      comment: 'Elegant designs and good quality.',
      createdAt: new Date()
    }
  ];

  private reviewsSubject = new BehaviorSubject<Review[]>(this.reviews);

  getReviews(): Observable<Review[]> {
    return this.reviewsSubject.asObservable();
  }

  addReview(review: Review): void {
    this.reviews.unshift(review);
    this.reviewsSubject.next(this.reviews);
  }
}
