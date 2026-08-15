import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessoryDetail } from './accessory-detail';

import { RouterTestingModule } from '@angular/router/testing';

describe('AccessoryDetail', () => {
  let component: AccessoryDetail;
  let fixture: ComponentFixture<AccessoryDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccessoryDetail, RouterTestingModule]
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
