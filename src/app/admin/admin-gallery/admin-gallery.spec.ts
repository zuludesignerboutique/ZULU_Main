import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { AdminGallery } from './admin-gallery';

describe('AdminGallery', () => {
  let component: AdminGallery;
  let fixture: ComponentFixture<AdminGallery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGallery],
      providers: [provideHttpClient()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminGallery);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
