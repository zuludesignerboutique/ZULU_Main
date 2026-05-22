import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooHeader } from './pooboo-header';

describe('PoobooHeader', () => {
  let component: PoobooHeader;
  let fixture: ComponentFixture<PoobooHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooHeader]
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
