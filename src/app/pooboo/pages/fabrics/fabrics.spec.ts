import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fabrics } from './fabrics';

describe('Fabrics', () => {
  let component: Fabrics;
  let fixture: ComponentFixture<Fabrics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fabrics]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fabrics);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
