import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { OrderSuccessComponent } from './order-success';

describe('OrderSuccessComponent', () => {
  let component: OrderSuccessComponent;
  let fixture: ComponentFixture<OrderSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OrderSuccessComponent,
        RouterTestingModule.withRoutes([
          { path: 'home', component: OrderSuccessComponent }
        ])
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderSuccessComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
