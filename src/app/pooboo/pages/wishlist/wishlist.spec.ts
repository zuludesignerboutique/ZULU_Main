import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Wishlist } from './wishlist';

import { RouterTestingModule } from '@angular/router/testing';

describe('Wishlist', () => {
  let component: Wishlist;
  let fixture: ComponentFixture<Wishlist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Wishlist, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Wishlist);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
