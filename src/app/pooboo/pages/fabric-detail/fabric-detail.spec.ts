import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FabricDetail } from './fabric-detail';

describe('FabricDetail', () => {
  let component: FabricDetail;
  let fixture: ComponentFixture<FabricDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FabricDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FabricDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
