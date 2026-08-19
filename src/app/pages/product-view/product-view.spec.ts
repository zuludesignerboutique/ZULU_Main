import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
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
    vi.restoreAllMocks();
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

  it('should build customization WhatsApp link with number, name, code, and URL', () => {
    component.product = { id: 42, name: 'Lehenga', product_code: 'ZL-001' };
    component.customerName = 'Zara';

    const link = component.getCustomizationWhatsappLink();
    const msg = decodeURIComponent(link.split('?text=')[1]);

    expect(link).toContain('wa.me/919384268548');
    expect(msg).toContain('Hello ZULU');
    expect(msg).toContain('*Customer Name:* Zara');
    expect(msg).toContain('*Product Name:* Lehenga');
    expect(msg).toContain('*Product Code:* ZL-001');
    expect(msg).toContain(`*Product Link:* ${component.getProductUrl()}`);
  });

  it('should omit Product Code line when product has no code', () => {
    component.product = { id: 42, name: 'Lehenga' };
    component.customerName = 'Zara';

    const link = component.getCustomizationWhatsappLink();
    const msg = decodeURIComponent(link.split('?text=')[1]);

    expect(msg).not.toContain('Product Code');
    expect(msg).not.toContain('undefined');
  });

  it('should redirect to login when not logged in', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    localStorage.removeItem('customer_loggedIn');

    component.onCustomizeClick();

    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: router.url }
    });
  });

  it('should open WhatsApp for logged-in users on hover devices', () => {
    localStorage.setItem('customer_loggedIn', 'true');
    component.isHoverDevice = true;
    component.product = { id: 42, name: 'Lehenga', product_code: 'ZL-001' };
    component.customerName = 'Zara';

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    component.onCustomizeClick();

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/919384268548'),
      '_blank'
    );
  });

  it('should toggle tooltip on touch devices instead of opening WhatsApp', () => {
    localStorage.setItem('customer_loggedIn', 'true');
    component.isHoverDevice = false;
    component.customizeTooltipOpen = false;

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    component.onCustomizeClick();
    expect(component.customizeTooltipOpen).toBeTruthy();
    expect(openSpy).not.toHaveBeenCalled();

    component.onCustomizeClick();
    expect(component.customizeTooltipOpen).toBeFalsy();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('should open WhatsApp from the tooltip CTA', () => {
    localStorage.setItem('customer_loggedIn', 'true');
    component.product = { id: 42, name: 'Lehenga', product_code: 'ZL-001' };

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    component.openCustomization();

    expect(component.customizeTooltipOpen).toBeFalsy();
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('wa.me/919384268548'),
      '_blank'
    );
  });
});
