import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutZora } from './about-zora';

describe('AboutZora', () => {
  let component: AboutZora;
  let fixture: ComponentFixture<AboutZora>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutZora]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutZora);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
