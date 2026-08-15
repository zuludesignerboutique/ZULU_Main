import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { CategoryLandingComponent } from './category-landing';

describe('CategoryLandingComponent', () => {
  let component: CategoryLandingComponent;
  let fixture: ComponentFixture<CategoryLandingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryLandingComponent, RouterTestingModule],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryLandingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
