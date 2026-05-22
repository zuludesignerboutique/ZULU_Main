import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooEditProduct } from './pooboo-edit-product';

describe('PoobooEditProduct', () => {
  let component: PoobooEditProduct;
  let fixture: ComponentFixture<PoobooEditProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooEditProduct]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoobooEditProduct);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
