import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoobooEditFabric } from './pooboo-edit-fabric';

import { RouterTestingModule } from '@angular/router/testing';

describe('PoobooEditFabric', () => {
  let component: PoobooEditFabric;
  let fixture: ComponentFixture<PoobooEditFabric>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoobooEditFabric, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PoobooEditFabric);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
