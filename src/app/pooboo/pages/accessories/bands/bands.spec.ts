import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bands } from './bands';

import { RouterTestingModule } from '@angular/router/testing';

describe('Bands', () => {
  let component: Bands;
  let fixture: ComponentFixture<Bands>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bands, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Bands);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
