import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooAdminAccessories } from './pooboo-admin-accessories';

describe('PoobooAdminAccessories', () => {
  let component: PoobooAdminAccessories;
  let fixture: ComponentFixture<PoobooAdminAccessories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooAdminAccessories]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoobooAdminAccessories);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
