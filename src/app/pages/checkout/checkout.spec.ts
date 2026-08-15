import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Checkout } from './checkout';

import { RouterTestingModule } from '@angular/router/testing';

describe('Checkout', () => {
  let component: Checkout;
  let fixture: ComponentFixture<Checkout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Checkout,
        RouterTestingModule.withRoutes([
          { path: 'cart', component: Checkout }
        ])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Checkout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
