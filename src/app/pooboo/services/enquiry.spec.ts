import { TestBed } from '@angular/core/testing';

import { Enquiry } from './enquiry';

describe('Enquiry', () => {
  let service: Enquiry;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Enquiry);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
