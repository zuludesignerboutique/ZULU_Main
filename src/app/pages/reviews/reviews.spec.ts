import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reviews } from './reviews';

describe('Reviews', () => {
  let component: Reviews;
  let fixture: ComponentFixture<Reviews>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reviews]
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
      { id: 1, name: 'Alice', rating: 5, comment: 'Great!' },
      { id: 2, name: 'Bob',   rating: 4, comment: 'Good.'  },
      { id: 3, name: 'Carol', rating: 5, comment: 'Loved it.' },
    ];

    component.goToSlide(2);
    expect(component.currentIndex).toBe(2);
  });

  it('should loop back to 0 after the last slide', () => {
    component.reviews = [
      { id: 1, name: 'Alice', rating: 5, comment: 'Awesome!' },
      { id: 2, name: 'Bob',   rating: 4, comment: 'Nice.' },
    ];

    component.currentIndex = 1;
    component['nextSlide']();
    expect(component.currentIndex).toBe(0);
  });
});