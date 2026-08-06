import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductToolbar } from './product-toolbar';

describe('ProductToolbar', () => {
  let component: ProductToolbar;
  let fixture: ComponentFixture<ProductToolbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductToolbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductToolbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
