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

  // Public — all visible reviews (ALL brands unless ?brand= given)
  getAllReviews(brand?: string): Observable<Review[]> {
    const params = brand ? { brand } : undefined;
    return this.http.get<Review[]>(this.apiUrl, { params });
  }

  // Public — reviews for a specific product (brand + product_id identity)
  getProductReviews(productId: number, brand = 'zulu'): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/product/${productId}`, { params: { brand } });
  }

  // Authenticated — submit a new review (brand is derived from the store the
  // user came from and whitelisted server-side)
  submitReview(data: {
    rating: number;
    title: string;
    body: string;
    productId?: number | null;
    brand?: string;
    photo?: File;
  }): Observable<Review> {
    const formData = new FormData();
    formData.append('rating', data.rating.toString());
    formData.append('title', data.title);
    formData.append('body', data.body);
    if (data.productId) formData.append('productId', data.productId.toString());
    if (data.brand) formData.append('brand', data.brand);
    if (data.photo) formData.append('photo', data.photo);

    return this.http.post<Review>(this.apiUrl, formData);
  }

  // Admin — ALL reviews including hidden (optional ?brand= filter)
  getAllReviewsAdmin(brand?: string): Observable<Review[]> {
    const params = brand ? { brand } : undefined;
    return this.http.get<Review[]>(`${this.apiUrl}/admin/all`, { params });
  }

  // Admin — delete a review
  deleteReview(reviewId: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${reviewId}`);
  }
}