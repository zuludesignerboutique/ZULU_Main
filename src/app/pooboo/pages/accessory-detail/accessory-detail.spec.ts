import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessoryDetail } from './accessory-detail';

import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

describe('AccessoryDetail', () => {
  let component: AccessoryDetail;
  let fixture: ComponentFixture<AccessoryDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessoryDetail, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessoryDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to reviews with accessory context on write review', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.product = {
      id: 5,
      accessory_type: 'hair-clips',
      name: 'Gold Hair Clips',
      product_code: 'PB-ACC-05',
      price: 499,
      colour: 'gold',
      stock: 10,
      balance_stock: 10,
      description: '',
      tags: [],
      image_url: null,
      is_active: 1,
      created_at: '2024-01-01 00:00:00'
    };

    component.goToWriteReview();

    expect(navigateSpy).toHaveBeenCalledWith(['/reviews'], {
      queryParams: {
        brand: 'pooboo',
        productId: 5,
        productName: 'Gold Hair Clips',
        write: 1
      }
    });
  });
});
