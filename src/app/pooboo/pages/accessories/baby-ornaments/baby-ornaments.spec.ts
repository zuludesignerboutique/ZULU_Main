import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BabyOrnaments } from './baby-ornaments';

describe('BabyOrnaments', () => {
  let component: BabyOrnaments;
  let fixture: ComponentFixture<BabyOrnaments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BabyOrnaments]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BabyOrnaments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
