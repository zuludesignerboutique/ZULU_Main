import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Review } from '../core/models/review.model';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = '/api/zulu/reviews';

  constructor(private http: HttpClient) {}

  // Public — all visible ZULU reviews
  getAllReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(this.apiUrl);
  }

  // Public — reviews for a specific product
  getProductReviews(productId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/product/${productId}`);
  }

  // Authenticated — submit a new review
  submitReview(data: {
    rating: number;
    title: string;
    body: string;
    productId?: number | null;
    photo?: File;
  }): Observable<Review> {
    const formData = new FormData();
    formData.append('rating', data.rating.toString());
    formData.append('title', data.title);
    formData.append('body', data.body);
    if (data.productId) formData.append('productId', data.productId.toString());
    if (data.photo) formData.append('photo', data.photo);

    return this.http.post<Review>(this.apiUrl, formData);
  }
}