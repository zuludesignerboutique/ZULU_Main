import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { Review } from '../core/models/review.model';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(private http: HttpClient) {}

apiUrl = 'http://localhost:4000/api/reviews';

getReviews(): Observable<Review[]> {
  return this.http.get<any[]>(this.apiUrl).pipe(
    map((data) =>
      data.map((item) => ({
        ...item,
        createdAt: item.created_at // 🔥 FIX HERE
      }))
    )
  );
}

addReview(review: Review | FormData) {
  return this.http.post(this.apiUrl, review);
}
}

