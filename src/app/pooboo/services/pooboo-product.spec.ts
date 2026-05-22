import { TestBed } from '@angular/core/testing';

import { PoobooProduct } from './pooboo-product';

describe('PoobooProduct', () => {
  let service: PoobooProduct;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PoobooProduct);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
