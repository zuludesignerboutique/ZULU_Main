import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductCardComponent } from './product-card';

import { RouterTestingModule } from '@angular/router/testing';

describe('ProductCard', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    component.product = {
      id: 1,
      name: 'Silk Saree',
      description: 'Banarasi silk',
      price: 2499,
      image_url: 'silk.jpg',
      category: 'Sarees',
      images: [{ id: 1, image_url: 'silk.jpg', display_order: 1 }]
    };
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
