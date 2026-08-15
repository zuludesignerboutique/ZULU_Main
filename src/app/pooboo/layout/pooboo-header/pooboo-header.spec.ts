import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooHeader } from './pooboo-header';

import { RouterTestingModule } from '@angular/router/testing';

describe('PoobooHeader', () => {
  let component: PoobooHeader;
  let fixture: ComponentFixture<PoobooHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooHeader, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoobooHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
