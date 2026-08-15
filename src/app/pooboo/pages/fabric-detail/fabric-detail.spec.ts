import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FabricDetail } from './fabric-detail';

import { RouterTestingModule } from '@angular/router/testing';

describe('FabricDetail', () => {
  let component: FabricDetail;
  let fixture: ComponentFixture<FabricDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FabricDetail, RouterTestingModule]
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
