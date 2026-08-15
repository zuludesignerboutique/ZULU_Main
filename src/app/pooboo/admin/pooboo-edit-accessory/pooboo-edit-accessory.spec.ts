import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooEditAccessory } from './pooboo-edit-accessory';

import { RouterTestingModule } from '@angular/router/testing';

describe('PoobooEditAccessory', () => {
  let component: PoobooEditAccessory;
  let fixture: ComponentFixture<PoobooEditAccessory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooEditAccessory, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoobooEditAccessory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
