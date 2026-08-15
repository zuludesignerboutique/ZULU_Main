import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { HomeComponent } from './home';
import { Product } from '../../core/models/product.model';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let httpTesting: HttpTestingController;

  const mockProducts: Product[] = [
    { id: 1, name: 'Silk Saree', description: 'Banarasi silk', price: 2499, image_url: 'silk.jpg', category: 'Sarees', images: [] },
    { id: 2, name: 'Cotton Kurti', description: 'Breathable cotton', price: 999, image_url: 'kurti.jpg', category: 'Kurtis', images: [] },
    { id: 3, name: 'Georgette Saree', description: 'Elegant drape', price: 1999, image_url: 'geo.jpg', category: 'Sarees', images: [] },
    { id: 4, name: 'Jeggings', description: 'Stretch fit', price: 599, image_url: 'jeans.jpg', category: 'Bottom Wear', images: [] },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();

    httpTesting.expectOne(req => req.url === '/api/products').flush(mockProducts);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have 4 products by default', () => {
    expect(component.products.length).toBe(4);
  });

  it('should have products with required fields', () => {
    component.products.forEach(p => {
      expect(p.id).toBeDefined();
      expect(p.name).toBeTruthy();
      expect(p.price).toBeGreaterThan(0);
      expect(Array.isArray(p.images)).toBe(true);
      expect(p.category).toBeTruthy();
    });
  });
});
