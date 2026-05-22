import { TestBed } from '@angular/core/testing';

import { PoobooCart } from './pooboo-cart';

describe('PoobooCart', () => {
  let service: PoobooCart;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PoobooCart);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
