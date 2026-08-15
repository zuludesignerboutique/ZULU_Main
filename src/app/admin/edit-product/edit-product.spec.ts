import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { EditProduct } from './edit-product';

import { RouterTestingModule } from '@angular/router/testing';

describe('EditProduct', () => {
  let component: EditProduct;
  let fixture: ComponentFixture<EditProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditProduct, RouterTestingModule],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditProduct);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
