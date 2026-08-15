import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PoobooProductService } from './pooboo-product.service';

describe('PoobooProductService', () => {
  let service: PoobooProductService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PoobooProductService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
