import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Subcategories } from './subcategories';

describe('Subcategories', () => {
  let component: Subcategories;
  let fixture: ComponentFixture<Subcategories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Subcategories]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Subcategories);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
