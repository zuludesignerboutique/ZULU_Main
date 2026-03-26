import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { ProductView } from './product-view';

describe('ProductView', () => {
  let component: ProductView;
  let fixture: ComponentFixture<ProductView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProductView,
        RouterTestingModule,
        HttpClientTestingModule
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: '42' } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    component.ngOnDestroy();
    localStorage.removeItem('wishlist');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle wishlist state on and off', () => {
    component.product = { id: 42, name: 'Lehenga', stock: 3 };

    expect(component.isWishlisted).toBeFalsy();

    component.toggleWishlist();
    expect(component.isWishlisted).toBeTruthy();

    component.toggleWishlist();
    expect(component.isWishlisted).toBeFalsy();
  });

  it('should not call addToCart when stock is 0', () => {
    component.product = { id: 42, name: 'Lehenga', stock: 0 };
    const consoleSpy = vi.spyOn(console, 'log');

    component.addToCart();

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should show the correct stock badge class based on stock level', () => {
    component.product = { id: 42, name: 'Lehenga', stock: 10, image_url: null };
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.stock-badge');
    expect(badge?.classList).toContain('in-stock');
  });
});