import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooAdminFabrics } from './pooboo-admin-fabrics';

describe('PoobooAdminFabrics', () => {
  let component: PoobooAdminFabrics;
  let fixture: ComponentFixture<PoobooAdminFabrics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooAdminFabrics]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoobooAdminFabrics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
