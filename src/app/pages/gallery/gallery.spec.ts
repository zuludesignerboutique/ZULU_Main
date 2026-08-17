import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { Gallery } from './gallery';

describe('Gallery', () => {
  let component: Gallery;
  let fixture: ComponentFixture<Gallery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gallery, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(Gallery);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    component.ngOnDestroy();
    document.body.style.overflow = '';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in loading state with lightbox closed', () => {
    const f = TestBed.createComponent(Gallery);
    expect(f.componentInstance.isLoading).toBeTruthy();
    expect(f.componentInstance.lightboxIndex).toBeNull();
  });

  it('should open lightbox at the correct index', () => {
    component.images = [
      { id: 1, imageUrl: 'a.jpg', title: 'A' },
      { id: 2, imageUrl: 'b.jpg', title: 'B' },
    ];

    component.openLightbox(1);
    expect(component.lightboxIndex).toBe(1);
  });

  it('should close lightbox and restore scroll', () => {
    component.openLightbox(0);
    component.closeLightbox();

    expect(component.lightboxIndex).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('should wrap around when stepping past last image', () => {
    component.images = [
      { id: 1, imageUrl: 'a.jpg', title: 'A' },
      { id: 2, imageUrl: 'b.jpg', title: 'B' },
    ];

    component.lightboxIndex = 1;
    component.lightboxStep(1);
    expect(component.lightboxIndex).toBe(0);
  });

  it('should report zero-padded counter and total', () => {
    component.images = [
      { id: 1, imageUrl: 'a.jpg', title: 'A' },
      { id: 2, imageUrl: 'b.jpg', title: 'B' },
      { id: 3, imageUrl: 'c.jpg', title: 'C' },
    ];

    component.lightboxIndex = 2;
    expect(component.currentNumber).toBe('03');
    expect(component.totalCount).toBe(3);
    expect(component.currentImage?.title).toBe('C');
  });

  it('should return null image when lightbox is closed', () => {
    component.images = [{ id: 1, imageUrl: 'a.jpg', title: 'A' }];
    component.lightboxIndex = null;
    expect(component.currentImage).toBeNull();
  });
});