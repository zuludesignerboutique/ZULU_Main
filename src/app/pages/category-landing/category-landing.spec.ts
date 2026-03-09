import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryLanding } from './category-landing';

describe('CategoryLanding', () => {
  let component: CategoryLanding;
  let fixture: ComponentFixture<CategoryLanding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryLanding]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryLanding);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
