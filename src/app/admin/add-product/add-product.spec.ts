import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddProduct } from './add-product';

import { RouterTestingModule } from '@angular/router/testing';

describe('AddProduct', () => {
  let component: AddProduct;
  let fixture: ComponentFixture<AddProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddProduct, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddProduct);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
