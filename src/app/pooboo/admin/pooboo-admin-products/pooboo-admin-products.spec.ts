import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooAdminProducts } from './pooboo-admin-products';

import { RouterTestingModule } from '@angular/router/testing';

describe('PoobooAdminProducts', () => {
  let component: PoobooAdminProducts;
  let fixture: ComponentFixture<PoobooAdminProducts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooAdminProducts, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoobooAdminProducts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
