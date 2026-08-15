import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooFooter } from './pooboo-footer';

import { RouterTestingModule } from '@angular/router/testing';

describe('PoobooFooter', () => {
  let component: PoobooFooter;
  let fixture: ComponentFixture<PoobooFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooFooter, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoobooFooter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
