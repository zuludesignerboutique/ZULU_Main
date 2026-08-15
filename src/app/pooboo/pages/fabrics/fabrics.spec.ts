import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fabrics } from './fabrics';

import { RouterTestingModule } from '@angular/router/testing';

describe('Fabrics', () => {
  let component: Fabrics;
  let fixture: ComponentFixture<Fabrics>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fabrics, RouterTestingModule]
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
