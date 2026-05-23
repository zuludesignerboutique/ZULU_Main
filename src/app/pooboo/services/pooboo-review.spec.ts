import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PoobooReviewService } from './pooboo-review.service';
import { PoobooReview } from '../core/models/pooboo-review.model';

const mockReview: PoobooReview = {
  id: 1,
  productId: 10,
  productName: 'Floral Frock',
  customerId: 5,
  customerName: 'Priya S',
  customerEmail: 'priya@example.com',
  rating: 5,
  title: 'Absolutely adorable!',
  body: 'My daughter loves this dress. Great quality.',
  brand: 'pooboo',
  createdAt: '2025-05-01T10:00:00Z',
  isVisible: true
};

describe('PoobooReviewService', () => {
  let service: PoobooReviewService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PoobooReviewService]
    });
    service = TestBed.inject(PoobooReviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all visible reviews', () => {
    service.getAllReviews().subscribe(reviews => {
      expect(reviews.length).toBe(1);
      expect(reviews[0].rating).toBe(5);
    });
    const req = httpMock.expectOne('/api/pooboo/reviews');
    expect(req.request.method).toBe('GET');
    req.flush([mockReview]);
  });

  it('should fetch reviews by product id', () => {
    service.getReviewsByProduct(10).subscribe(reviews => {
      expect(reviews[0].productId).toBe(10);
    });
    const req = httpMock.expectOne('/api/pooboo/reviews/product/10');
    expect(req.request.method).toBe('GET');
    req.flush([mockReview]);
  });

  it('should delete a review', () => {
    service.deleteReview(1).subscribe(res => {
      expect(res.success).toBe(true);
    });
    const req = httpMock.expectOne('/api/pooboo/reviews/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
  });
});