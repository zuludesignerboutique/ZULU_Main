import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HairClips } from './hair-clips';

import { RouterTestingModule } from '@angular/router/testing';

describe('HairClips', () => {
  let component: HairClips;
  let fixture: ComponentFixture<HairClips>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HairClips, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HairClips);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
