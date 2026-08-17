import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FabricDetail } from './fabric-detail';

import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

describe('FabricDetail', () => {
  let component: FabricDetail;
  let fixture: ComponentFixture<FabricDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FabricDetail, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FabricDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to reviews with fabric context on write review', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.product = {
      id: 9,
      name: 'Silk Satin',
      product_code: 'PB-FAB-09',
      fabric_type: 'silk',
      price_per_meter: 850,
      colour: 'ivory',
      total_meters: 50,
      balance_stock: 50,
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
        productId: 9,
        productName: 'Silk Satin',
        write: 1
      }
    });
  });
});
