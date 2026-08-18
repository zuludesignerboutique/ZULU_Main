import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutZulu } from './about-zulu';

describe('AboutZulu', () => {
  let component: AboutZulu;
  let fixture: ComponentFixture<AboutZulu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutZulu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AboutZulu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
