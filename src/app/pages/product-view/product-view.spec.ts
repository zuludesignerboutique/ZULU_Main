import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';

import { ProductView } from './product-view';

describe('ProductView', () => {
  let component: ProductView;
  let fixture: ComponentFixture<ProductView>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProductView,
        RouterTestingModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: '42' } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductView);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    component.ngOnDestroy();
    localStorage.removeItem('customer_loggedIn');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle wishlist state on and off', () => {
    localStorage.setItem('customer_loggedIn', 'true');
    component.product = { id: 42, name: 'Lehenga', stock: 3 };

    expect(component.isWishlisted).toBeFalsy();

    component.toggleWishlist();
    httpTesting.expectOne(req => req.method === 'POST' && req.url.endsWith('/api/wishlist')).flush({});
    expect(component.isWishlisted).toBeTruthy();

    component.toggleWishlist();
    httpTesting.expectOne(req => req.method === 'DELETE' && req.url.endsWith('/api/wishlist/zulu_product/42')).flush({});
    expect(component.isWishlisted).toBeFalsy();
  });

  it('should not call addToCart when stock is 0', () => {
    component.product = { id: 42, name: 'Lehenga', stock: 0 };
    const consoleSpy = vi.spyOn(console, 'log');

    component.addToCart();

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});
