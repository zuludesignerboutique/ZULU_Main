import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PoobooAdminReviews } from './pooboo-admin-reviews';
import { PoobooReviewService } from '../../services/pooboo-review.service';
import { of, throwError } from 'rxjs';
import { PoobooReview } from '../../core/models/pooboo-review.model';

const mockReviews: PoobooReview[] = [
  {
    id: 1, customerId: 1, customerName: 'Priya S', customerEmail: 'priya@example.com',
    rating: 5, title: 'Great!', body: 'Loved the product quality.', brand: 'pooboo',
    createdAt: '2025-05-01T10:00:00Z', isVisible: true, productName: 'Floral Frock'
  },
  {
    id: 2, customerId: 2, customerName: 'Arjun M', customerEmail: 'arjun@example.com',
    rating: 3, title: 'Okay', body: 'Decent but could be better.', brand: 'pooboo',
    createdAt: '2025-05-10T12:00:00Z', isVisible: true
  }
];

describe('PoobooAdminReviews', () => {
  let component: PoobooAdminReviews;
  let fixture: ComponentFixture<PoobooAdminReviews>;

  const reviewServiceMock = {
    getAllReviewsAdmin: vi.fn().mockReturnValue(of(mockReviews)),
    deleteReview: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooAdminReviews, HttpClientTestingModule],
      providers: [{ provide: PoobooReviewService, useValue: reviewServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(PoobooAdminReviews);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should load all reviews on init', () => {
    expect(component.reviews().length).toBe(2);
    expect(component.totalCount()).toBe(2);
  });

  it('should filter reviews by rating', () => {
    component.setFilterRating(5);
    expect(component.filteredReviews().length).toBe(1);
    expect(component.filteredReviews()[0].rating).toBe(5);
  });

  it('should filter reviews by search query', () => {
    component.searchQuery.set('arjun');
    expect(component.filteredReviews().length).toBe(1);
    expect(component.filteredReviews()[0].customerName).toBe('Arjun M');
  });

  it('should set deleteConfirmId on confirmDelete', () => {
    component.confirmDelete(1);
    expect(component.deleteConfirmId()).toBe(1);
  });

  it('should remove review from list on successful delete', () => {
    reviewServiceMock.deleteReview.mockReturnValue(of({ success: true }));
    component.confirmDelete(1);
    component.executeDelete();
    expect(component.reviews().length).toBe(1);
    expect(component.reviews()[0].id).toBe(2);
  });

  it('should show error on delete failure', () => {
    reviewServiceMock.deleteReview.mockReturnValue(throwError(() => new Error('fail')));
    component.confirmDelete(1);
    component.executeDelete();
    expect(component.errorMessage()).toBeTruthy();
  });

  it('should calculate average rating correctly', () => {
    // (5 + 3) / 2 = 4
    expect(component.averageRating()).toBe(4);
  });
});