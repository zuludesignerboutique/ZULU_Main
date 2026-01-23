import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReturnsExchange } from './returns-exchange';

describe('ReturnsExchange', () => {
  let component: ReturnsExchange;
  let fixture: ComponentFixture<ReturnsExchange>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReturnsExchange]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReturnsExchange);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
