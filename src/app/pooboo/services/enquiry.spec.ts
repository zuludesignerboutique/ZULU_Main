import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { EnquiryService } from './enquiry.service';

describe('EnquiryService', () => {
  let service: EnquiryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(EnquiryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
