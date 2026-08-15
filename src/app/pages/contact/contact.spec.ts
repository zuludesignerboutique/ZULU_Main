import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { Contact } from './contact';

describe('Contact', () => {
  let component: Contact;
  let fixture: ComponentFixture<Contact>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contact, RouterTestingModule],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(Contact);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit when form fields are empty', () => {
    component.form = { name: '', email: '', message: '' };
    component.submitForm();
    expect(component.isSending).toBeFalsy();
  });

  it('should set isSending to true while submitting', () => {
    component.form = { name: 'Alice', email: 'alice@test.com', message: 'Hello' };
    component.submitForm();
    expect(component.isSending).toBeTruthy();
  });

  it('should show success and reset form after submit', () => {
    component.form = { name: 'Alice', email: 'alice@test.com', message: 'Hello' };
    component.submitForm();

    httpTesting.expectOne('/api/contact').flush({ message: 'OK' });

    expect(component.submitted).toBeTruthy();
    expect(component.isSending).toBeFalsy();
    expect(component.form.name).toBe('');
  });
});
