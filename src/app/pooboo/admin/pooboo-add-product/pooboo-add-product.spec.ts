import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooAddProduct } from './pooboo-add-product';

import { RouterTestingModule } from '@angular/router/testing';

describe('PoobooAddProduct', () => {
  let component: PoobooAddProduct;
  let fixture: ComponentFixture<PoobooAddProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooAddProduct, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoobooAddProduct);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
