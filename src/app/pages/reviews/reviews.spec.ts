import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { Reviews } from './reviews';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../core/models/review.model';

describe('Reviews', () => {
  let component: Reviews;
  let fixture: ComponentFixture<Reviews>;

  const mockReviews: Review[] = [
    { id: 1, customerId: 1, customerName: 'Alice', customerEmail: 'alice@test.com', rating: 5, title: 'Great!', body: 'Loved the quality.', brand: 'zulu', isVisible: true, createdAt: new Date() },
    { id: 2, customerId: 2, customerName: 'Bob', customerEmail: 'bob@test.com', rating: 4, title: 'Good', body: 'Nice fit and finish.', brand: 'zulu', isVisible: true, createdAt: new Date() },
    { id: 3, customerId: 3, customerName: 'Carol', customerEmail: 'carol@test.com', rating: 5, title: 'Loved it', body: 'Will buy again.', brand: 'zulu', isVisible: true, createdAt: new Date() },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reviews, RouterTestingModule],
      providers: [
        {
          provide: ReviewService,
          useValue: {
            getAllReviews: () => of(mockReviews),
            submitReview: () => of(mockReviews[0])
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Reviews);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    component.ngOnDestroy(); // clean up interval
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to the correct slide via goToSlide()', () => {
    component.reviews = [
      { id: 1, customerId: 1, customerName: 'Alice', customerEmail: 'a@t.com', rating: 5, title: 'Great!', body: 'Great!', brand: 'zulu', createdAt: new Date() },
      { id: 2, customerId: 2, customerName: 'Bob', customerEmail: 'b@t.com', rating: 4, title: 'Good.', body: 'Good.', brand: 'zulu', createdAt: new Date() },
      { id: 3, customerId: 3, customerName: 'Carol', customerEmail: 'c@t.com', rating: 5, title: 'Loved it.', body: 'Loved it.', brand: 'zulu', createdAt: new Date() },
    ];

    component.goToSlide(2);
    expect(component.currentIndex).toBe(2);
  });

  it('should loop back to 0 after the last slide', () => {
    component.reviews = [
      { id: 1, customerId: 1, customerName: 'Alice', customerEmail: 'a@t.com', rating: 5, title: 'Awesome!', body: 'Awesome!', brand: 'zulu', createdAt: new Date() },
      { id: 2, customerId: 2, customerName: 'Bob', customerEmail: 'b@t.com', rating: 4, title: 'Nice.', body: 'Nice.', brand: 'zulu', createdAt: new Date() },
    ];

    component.currentIndex = 1;
    component.nextSlide();
    expect(component.currentIndex).toBe(0);
  });
});
