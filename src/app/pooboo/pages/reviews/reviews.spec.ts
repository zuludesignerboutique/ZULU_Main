import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reviews } from './reviews';
import { PoobooReviewService } from '../../services/pooboo-review.service';
import { AuthService } from '../../../services/auth.service';
import { of } from 'rxjs';
import { PoobooReview } from '../../core/models/pooboo-review.model';

const mockReviews: PoobooReview[] = [
  {
    id: 1, customerId: 1, customerName: 'Nisha K', customerEmail: 'nisha@example.com',
    rating: 4, title: 'Very happy!', body: 'My baby loves wearing this.',
    brand: 'pooboo', createdAt: '2025-05-05T08:00:00Z', isVisible: true
  }
];

describe('Reviews (POOBOO)', () => {
  let component: Reviews;
  let fixture: ComponentFixture<Reviews>;

  const reviewServiceMock = {
    getAllReviews: vi.fn().mockReturnValue(of(mockReviews)),
    submitReview: vi.fn()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reviews, HttpClientTestingModule],
      providers: [
        { provide: PoobooReviewService, useValue: reviewServiceMock },
        AuthService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Reviews);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should load reviews on init', () => {
    expect(component.reviews().length).toBe(1);
  });

  it('should show login modal when visitor clicks Write a Review', () => {
    // loggedInSignal defaults to false in test env (no localStorage)
    component.onWriteReviewClick();
    expect(component.showLoginModal()).toBe(true);
  });

  it('should filter reviews by rating', () => {
    component.setFilterRating(4);
    expect(component.filteredReviews().length).toBe(1);
    component.setFilterRating(5);
    expect(component.filteredReviews().length).toBe(0);
  });

  it('should toggle filter off when clicking same rating twice', () => {
    component.setFilterRating(4);
    component.setFilterRating(4);
    expect(component.filterRating()).toBe(0);
  });

  it('should compute average rating', () => {
    expect(component.averageRating()).toBe(4);
  });

  it('should close login modal', () => {
    component.showLoginModal.set(true);
    component.closeLoginModal();
    expect(component.showLoginModal()).toBe(false);
  });
});