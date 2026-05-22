import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooAdminEnquiries } from './pooboo-admin-enquiries';

describe('PoobooAdminEnquiries', () => {
  let component: PoobooAdminEnquiries;
  let fixture: ComponentFixture<PoobooAdminEnquiries>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooAdminEnquiries]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoobooAdminEnquiries);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
