import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PoobooReview, PoobooReviewPayload } from '../core/models/pooboo-review.model';

@Injectable({
  providedIn: 'root'
})
export class PoobooReviewService {
  private apiUrl = '/api/pooboo/reviews';

  constructor(private http: HttpClient) {}

  /** Get all visible reviews (public) */
  getAllReviews(): Observable<PoobooReview[]> {
    return this.http.get<PoobooReview[]>(this.apiUrl);
  }

  /** Get reviews for a specific product */
  getReviewsByProduct(productId: number): Observable<PoobooReview[]> {
    return this.http.get<PoobooReview[]>(`${this.apiUrl}/product/${productId}`);
  }

  /** Submit a new review (authenticated customer) */
  submitReview(payload: PoobooReviewPayload): Observable<PoobooReview> {
    const formData = new FormData();
    if (payload.productId) formData.append('productId', String(payload.productId));
    formData.append('rating', String(payload.rating));
    formData.append('title', payload.title);
    formData.append('body', payload.body);
    if (payload.photo) formData.append('photo', payload.photo);

    const token = localStorage.getItem('token');
    const headers = new HttpHeaders(
      token ? { Authorization: `Bearer ${token}` } : {}
    );
    return this.http.post<PoobooReview>(this.apiUrl, formData, { headers });
  }

  /** Admin: get ALL reviews including hidden */
  getAllReviewsAdmin(): Observable<PoobooReview[]> {
    return this.http.get<PoobooReview[]>(`${this.apiUrl}/admin/all`);
  }

  /** Admin: delete a review */
  deleteReview(reviewId: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${reviewId}`);
  }
}