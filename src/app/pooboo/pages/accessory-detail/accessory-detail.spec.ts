import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessoryDetail } from './accessory-detail';

describe('AccessoryDetail', () => {
  let component: AccessoryDetail;
  let fixture: ComponentFixture<AccessoryDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessoryDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessoryDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
